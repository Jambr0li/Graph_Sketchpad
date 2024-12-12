export { NetworkState, initNetwork, togglePhysics, toggleDirection, clearGraph, makeCycleGraph, 
    makeCompleteGraph, makeCubeGraph, makeHyperCube, makeCartesianProduct }
import { updateGraphInfo } from "./analyze.js"
import { ColorPickerState } from "./colorpicker.js"

const NetworkState = {
    nodes: new vis.DataSet([]), 
    edges: new vis.DataSet([]),
    node_count: 0, 
    edge_count: 0,
    edge_id: 0, 
    node_id: 0,
    componentsVisible: false, 
    bridgesVisible: false, 
    physicsOn: false, 
    options: {
        height: "100%", 
        width: "100%", 
        interaction: { 
            hover: true, 
            dragNodes: true,
            multiselect: true
        }, 
        nodes: {
            shape: 'dot',
            size: 20,
            color: getNodeColor(),
            font: {
                vadjust: -37,
                align: 'center', 
            },
        },
        edges: {
            arrows: {
                to: { enabled: false }, 
            },
            color: "gray"
        },
    },
    network: null, 
    components: [],
    bipartite: false,
};

const EditMode = {
    mode: "a",
    prevSelectedNodeId: null,
    changeSelectedSize: false,
}

function initNetwork() {
    var data = {
        nodes: NetworkState.nodes,
        edges: NetworkState.edges
    };
    var container = document.getElementById('network'); 
    NetworkState.network = new vis.Network(container, data, NetworkState.options);
    updateMode({key: "a"});
    NetworkState.network.on("hoverNode", function (event) {
        setNodeSizeLarge(event.node);
    });
    NetworkState.network.on("blurNode", (event) => {
        if (!NetworkState.nodes.get(event.node)) return;
        const selectedNodes = NetworkState.network.getSelectedNodes();
        if (!selectedNodes.includes(event.node) || !EditMode.changeSelectedSize) {
            setNodeSizeSmall(event.node);
        }
    });
    document.addEventListener('keydown', updateMode);
}

function setNodeSizeSmall(nodeId) {
    if (!NetworkState.nodes.get(nodeId)) return;
    NetworkState.nodes.update({
        id: nodeId,
        size: 20,
        font: { vadjust: -37 }
    });
}

function setNodeSizeLarge(nodeId) {
    if (!NetworkState.nodes.get(nodeId)) return;
    NetworkState.nodes.update({
        id: nodeId,
        size: 25,
        font: { vadjust: -41 }
    });
}

function unselectNodes() {
    NetworkState.network.getSelectedNodes().map(n => {
        setNodeSizeSmall(n);
    });
    NetworkState.network.unselectAll();
}

function showSelectedSize(event) {
    setNodeSizeLarge(event.nodes[0]);
}

function showDeselectedSize(event) {
    const prev = event.previousSelection.nodes[0].id;
    setNodeSizeSmall(prev);
}

function enabledSelectedSize() {
    NetworkState.network.on("selectNode", showSelectedSize);
    NetworkState.network.on("deselectNode", showDeselectedSize);
}

function disableSelectedSize() {
    unselectNodes();
    NetworkState.network.off("selectNode", showSelectedSize);
    NetworkState.network.off("deselectNode", showDeselectedSize);
}

function updateModeText() {
    const aModeText = document.getElementById("a-mode");
    const sModeText = document.getElementById("s-mode");
    const dModeText = document.getElementById("d-mode");
    const cModeText = document.getElementById("c-mode");

    aModeText.style.fontWeight = "normal";
    sModeText.style.fontWeight = "normal";
    dModeText.style.fontWeight = "normal";
    cModeText.style.fontWeight = "normal";

     
    switch (EditMode.mode) {
        case "a":
            aModeText.style.fontWeight = "bold"; break;
        case "s":
            sModeText.style.fontWeight = "bold"; break;
        case "d":
            dModeText.style.fontWeight = "bold"; break;
        case "c":
            cModeText.style.fontWeight = "bold"; break;
    }
}

function updateMode(event) {
    // don't update mode if in a text box
    if (document.activeElement.tagName === 'INPUT') return;

    if (event.key == "q" || event.key == "Escape") {
        unselectNodes();
        EditMode.prevSelectedNodeId = null;
    }
    if (!["a", "s", "d", "c"].includes(event.key)) return;

    var colorPalette = document.getElementById("color-palette");
    var customLabelInput = document.getElementById("node-label");
    var clickAction;
    
    if (EditMode.mode == "a") clickAction = addModeClick;
    else if (EditMode.mode == "s") clickAction = selectModeClick;
    else if (EditMode.mode == "d") clickAction = deleteModeClick;
    else if (EditMode.mode == "c") clickAction = colorModeClick;
    NetworkState.network.off("click", clickAction);

    EditMode.mode = event.key;
    if (EditMode.mode == "a") {
        colorPalette.classList.add("hidden");
        customLabelInput.classList.remove("hidden");
        NetworkState.options.interaction.dragNodes = false;
        if (!EditMode.changeSelectedSize) {
            enabledSelectedSize();
            EditMode.changeSelectedSize = true;
        }
        clickAction = addModeClick;
    }
    else if (EditMode.mode == "s") {
        colorPalette.classList.add("hidden");
        customLabelInput.classList.add("hidden");
        NetworkState.options.interaction.dragNodes = true;
        if (EditMode.changeSelectedSize) {
            disableSelectedSize();
            EditMode.changeSelectedSize = false;
        }
        clickAction = selectModeClick;
    }
    else if (EditMode.mode == "d") {
        colorPalette.classList.add("hidden");
        customLabelInput.classList.add("hidden");
        NetworkState.options.interaction.dragNodes = false;
        if (EditMode.changeSelectedSize) {
            disableSelectedSize();
            EditMode.changeSelectedSize = false;
        }
        clickAction = deleteModeClick;
    }
    else if (EditMode.mode == "c") {
        colorPalette.classList.remove("hidden");
        customLabelInput.classList.add("hidden");
        NetworkState.options.interaction.dragNodes = false;
        if (EditMode.changeSelectedSize) {
            disableSelectedSize();
            EditMode.changeSelectedSize = false;
        }
        clickAction = colorModeClick;
    }
    EditMode.prevSelectedNodeId = null;
    NetworkState.network.setOptions(NetworkState.options);
    NetworkState.network.on("click", clickAction);
    updateModeText();
}

function addModeClick(event) {
    if (event.nodes.length > 0) {
        var nodeId = event.nodes[0];
        if (EditMode.prevSelectedNodeId === null) {
            EditMode.prevSelectedNodeId = nodeId;
        }
        else {
            addEdges([[EditMode.prevSelectedNodeId, nodeId]]);
            EditMode.prevSelectedNodeId = nodeId;
        }
    }
    else {
        var x = event.pointer.canvas.x;
        var y = event.pointer.canvas.y;
        addNodes([[x,y]]);
        EditMode.prevSelectedNodeId = null;
    }
}

function selectModeClick(event) {
    return;
}

function deleteModeClick(event) {
    if (event.nodes.length > 0) {
        const nodeId = event.nodes[0];
        deleteNode(nodeId);
    }
    else if (event.edges.length > 0) {
        const edgeId = event.edges[0];
        deleteEdge(edgeId);
    }
}

function colorModeClick(event) {
    if (event.nodes.length > 0) {
        const nodeId = event.nodes[0];
        updateNodeColor(nodeId);
    }
}

function addNodes(points) {
    for (var p of points) {
        var x = p[0];
        var y = p[1];

        var userLabel = document.getElementById('node-label').value;
        var id, label;

        if (userLabel.trim() == '') {
            while (NetworkState.nodes.get(String(NetworkState.node_id))) 
                NetworkState.node_id += 1;
            label = String(NetworkState.node_id);
            id = String(NetworkState.node_id);
        }
        else {
            label = userLabel;
            id = userLabel;
        }

        if (NetworkState.nodes.get(id)) {
            alert("That node already exists!")
            document.getElementById('node-label').value = '';
            return;
        }

        NetworkState.nodes.add({ 
            id: id, 
            label: label, 
            x: x, 
            y: y, 
            physics: NetworkState.physicsOn,
            color: getNodeColor(),
        }); 
        NetworkState.node_count += 1; 
    }
    document.getElementById('node-label').value = '';
    updateGraphInfo();
}

function deleteNode(nodeId) {
    NetworkState.nodes.remove({ id: nodeId });
    NetworkState.node_count -= 1;

    // Check if node being deleted has an edge attatched to it.
    for (const edge of NetworkState.edges.get()) {
        if (edge.from === nodeId || edge.to === nodeId) {
            NetworkState.edges.remove(edge.id)
            NetworkState.edge_count -= 1;
        }
    }
    updateGraphInfo();
}

function addEdges(edges) {
    for (var e of edges) {
        var fromId = e[0];
        var toId = e[1];
        if (!NetworkState.nodes.get(fromId)) {
            alert(`Node with id=<${fromId}> does not exist!`);
            return;
        }
        if (!NetworkState.nodes.get(toId)) {
            alert(`Node with id=<${toId}> does not exist!`);
            return;
        }
        NetworkState.edges.add({id: NetworkState.edge_id, from: fromId, to: toId, label: String(NetworkState.edge_id)});
        NetworkState.edge_id += 1;
        NetworkState.edge_count += 1;
    }
    updateGraphInfo();
}

function deleteEdge(edgeId) {
    if (isNaN(edgeId)) {
        alert('Please enter valid node IDs.');
        return;
    }
    if (!NetworkState.edges.get(edgeId)) {
        alert('Edge ID does not exist!');
        return;
    }
    NetworkState.edges.remove({id: edgeId});
    NetworkState.edge_count -= 1;
    updateGraphInfo();
}

function getNodeColor() {
    const color = ColorPickerState.color;
    return {
        background: color,
        border: "grey",
        highlight: {
            background: color,
            border: "grey",
        },
        hover: { 
            background: color,
            border: "grey",
        }
    }
}

function updateNodeColor(nodeId) {
    NetworkState.nodes.update({
        id: nodeId,
        color: getNodeColor(),
    })
}

function clearGraph() {
    NetworkState.nodes.clear()
    NetworkState.edges.clear()
    NetworkState.node_count = 0;
    NetworkState.edge_count = 0;
    NetworkState.edge_id = 0;
    NetworkState.node_id = 0;
    updateGraphInfo()
}

function toggleDirection() {
    var currentState = NetworkState.options.edges.arrows.to.enabled;
    NetworkState.options.edges.arrows.to.enabled = !currentState;
    NetworkState.network.setOptions(NetworkState.options);
    !currentState ? document.getElementById('toggle-directions-btn').classList.add('custom-active') : document.getElementById('toggle-directions-btn').classList.remove('custom-active');
    updateGraphInfo();
}

function togglePhysics() {
    NetworkState.physicsOn = !NetworkState.physicsOn;
    NetworkState.physicsOn ? document.getElementById('toggle-physics-btn').classList.add('custom-active') : document.getElementById('toggle-physics-btn').classList.remove('custom-active');
    for (var n of NetworkState.nodes.get()) {
        NetworkState.nodes.update({id: n.id, physics: NetworkState.physicsOn});
    }
}

function makeGraph(points, edges) {
    const userPos = NetworkState.network.getViewPosition();
    var nodeStart = NetworkState.node_id;
    if (NetworkState.node_id == 0) nodeStart -= 1;
    addNodes(points.map(
        p => [p[0]+userPos.x, p[1]+userPos.y]
    ));
    addEdges(edges.map(
        e => [String(e[0]+nodeStart), String(e[1]+nodeStart)]
    ));
}

function makeCycleGraph(n, radius=200){
    const nodePoints = [];
    for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        nodePoints.push([x,y]);
    }
    // Add edges to form a cycle: 1->2, 2->3, ..., (n-1)->n, n->1
    const edges = [];
    for (let i = 1; i <= n; i++) {
        var fromId = i;
        var toId = (i < n) ? i + 1 : 1; // if at the last node, connect back to 1
        edges.push([fromId,toId]);
    }
    makeGraph(nodePoints, edges);
}

function makeCompleteGraph(n, radius=200) {
    const nodePoints = [];
    for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        nodePoints.push([x,y]);
    }
    // Add edges: For a complete graph, connect every pair of nodes
    const edges = [];
    for (let i = 1; i <= n; i++) {
        for (let j = i + 1; j <= n; j++) {
            edges.push([i,j]);
        }
    }

    makeGraph(nodePoints, edges);
}

function makeCube(size=100) {
    const frontSquare = [
        [-size,-size],
        [size,-size],
        [size,size],
        [-size,size]
    ]
    const backSquare = frontSquare.map(pos => [pos[0]-size/2, pos[1]-size/2]);
    const edges = [
        [1,2], [2,3], [3,4], [4,1],
        [5,6], [6,7], [7,8], [8,5],
        [1,5], [2,6], [3,7], [4,8]
    ];
    return {nodes: frontSquare.concat(backSquare), edges: edges};
}

function makeCubeGraph(event) {
    const size = 100;
    const cube = makeCube(size);
    makeGraph(cube.nodes, cube.edges);
}

function makeHyperCube() {
    const size = 100;
    const outerCube = makeCube(size * 1.5);
    const innerCube = makeCube(size * 0.5);
    const extraEdges = [
        [1,9],
        [2,10],
        [3,11],
        [4,12],
        [5,13],
        [6,14],
        [7,15],
        [8,16]
    ];
    const nodes = outerCube.nodes.concat(innerCube.nodes);
    const edges = outerCube.edges.concat(
        innerCube.edges.map(e => [e[0]+8, e[1]+8])
    ).concat(extraEdges);
    makeGraph(nodes, edges);
}

function makeCartesianProduct() {

}
