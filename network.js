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

function updateMode(event) {
    if (event.key == "q" || event.key == "Escape") {
        unselectNodes();
        EditMode.prevSelectedNodeId = null;
    }
    if (!["a", "s", "d", "c"].includes(event.key)) return;

    var modeDisplay = document.getElementById("mode-display");
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
    modeDisplay.textContent = EditMode.mode; 
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

function makeCycleGraph(n){
    const radius = 200;
    const centerX = 0;
    const centerY = 0;
    const userPos = NetworkState.network.getViewPosition();
    var nodeStart = NetworkState.node_id;
    if (NetworkState.node_id == 0) nodeStart -= 1;

    const nodePoints = [];
    for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n;
        const x = centerX + radius * Math.cos(angle) + userPos.x;
        const y = centerY + radius * Math.sin(angle) + userPos.y;
        nodePoints.push([x,y]);
    }
    addNodes(nodePoints);

    // Add edges to form a cycle: 1->2, 2->3, ..., (n-1)->n, n->1
    const edges = [];
    for (let i = 1; i <= n; i++) {
        var fromId = String(i+nodeStart);
        var toId = (i < n) ? i + 1 : 1; // if at the last node, connect back to 1
        toId = String(toId+nodeStart);
        edges.push([fromId,toId]);
    }
    addEdges(edges);
}

function makeCompleteGraph(n) {
    // Position nodes in a circle for a nice layout
    const radius = 200;
    const centerX = 0;
    const centerY = 0;
    const userPos = NetworkState.network.getViewPosition();
    var nodeStart = NetworkState.node_id;
    if (NetworkState.node_id == 0) nodeStart -= 1;

    // Add nodes
    const nodePoints = [];
    for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n;
        const x = centerX + radius * Math.cos(angle) + userPos.x;
        const y = centerY + radius * Math.sin(angle) + userPos.y;
        nodePoints.push([x,y]);
    }
    addNodes(nodePoints);

    // Add edges: For a complete graph, connect every pair of nodes
    const edges = [];
    for (let i = 1; i <= n; i++) {
        for (let j = i + 1; j <= n; j++) {
            var fromId = String(i+nodeStart);
            var toId = String(j+nodeStart);
            edges.push([fromId, toId]);
        }
    }
    addEdges(edges);
}

function makeCubeGraph() {
    // Define node positions to look like a cube in 2D:
    // We'll have a "front" square and a "back" square offset to give a sense of depth.
    // Front square (4 vertices):
    const frontSquare = [
        { id: String(1),  x: -100, y: -100 },
        { id: String(2),  x: 100,  y: -100 },
        { id: String(3),  x: 100,  y: 100 },
        { id: String(4),  x: -100, y: 100 }
    ];

    // Back square (4 vertices) slightly shifted:
    const backSquare = [
        { id: String(5),  x: -50,  y: -50 },
        { id: String(6),  x: 150,  y: -50 },
        { id: String(7),  x: 150,  y: 150 },
        { id: String(8),  x: -50,  y: 150 }
    ];

    // Add all nodes
    var userPos = NetworkState.network.getViewPosition();
    var nodeStart = NetworkState.node_id;
    if (NetworkState.node_id == 0) nodeStart -= 1;
    const allNodes = frontSquare.concat(backSquare);

    const nodePoints = [];
    for (let node of allNodes) {
        nodePoints.push([node.x+userPos.x, node.y+userPos.y]);
        NetworkState.node_count += 1;
    }
    addNodes(nodePoints);

    // Edges of a cube:
    // Front square edges: (1–2, 2–3, 3–4, 4–1)
    // Back square edges:  (5–6, 6–7, 7–8, 8–5)
    // Connect front to back: (1–5, 2–6, 3–7, 4–8)
    const edges = [
        // Front square
        [1,2], [2,3], [3,4], [4,1],
        // Back square
        [5,6], [6,7], [7,8], [8,5],
        // Connections between front and back
        [1,5], [2,6], [3,7], [4,8]
    ];

    const edgePoints = [];
    for (let edge of edges) {
        var fromId = String(edge[0]+nodeStart);
        var toId = String(edge[1]+nodeStart);
        edgePoints.push([fromId,toId]);
    }
    addEdges(edgePoints);
}

function makeHyperCube() {
    // Outer cube vertices (like a cube):
    // Two squares offset, connected to form a cube shape.
    const outerCube = [
        {id: String(1), x: -150, y: -150},
        {id: String(2), x: 150,  y: -150},
        {id: String(3), x: 150,  y: 150},
        {id: String(4), x: -150, y: 150},
        {id: String(5), x: -100, y: -100},
        {id: String(6), x: 200,  y: -100},
        {id: String(7), x: 200,  y: 200},
        {id: String(8), x: -100, y: 200}
    ];

    // Inner cube vertices (smaller cube inside):
    const innerCube = [
        {id: String(9),  x: -50, y: -50},
        {id: String(10), x: 50,  y: -50},
        {id: String(11), x: 50,  y: 50},
        {id: String(12), x: -50, y: 50},
        {id: String(13), x: -25, y: -25},
        {id: String(14), x: 75,  y: -25},
        {id: String(15), x: 75,  y: 75},
        {id: String(16), x: -25, y: 75}
    ];

    const outerEdges = [
        [1,2], [2,3], [3,4], [4,1],
        [5,6], [6,7], [7,8], [8,5],
        [1,5], [2,6], [3,7], [4,8]
    ];

    const innerEdges = [
        [9,10], [10,11], [11,12], [12,9],
        [13,14], [14,15], [15,16], [16,13],
        [9,13], [10,14], [11,15], [12,16]
    ];

    const hyperEdges = [
        [1,9], [2,10], [3,11], [4,12],
        [5,13], [6,14], [7,15], [8,16]
    ];

    var userPos = NetworkState.network.getViewPosition();
    var nodeStart = NetworkState.node_id;
    if (NetworkState.node_id == 0) nodeStart -= 1;

    const allNodes = outerCube.concat(innerCube);
    const nodePoints = allNodes.map(p => [p.x+userPos.x, p.y+userPos.y]);
    addNodes(nodePoints);

    const allEdges = outerEdges.concat(innerEdges).concat(hyperEdges);
    const edgePoints = allEdges.map(edge => [
        String(edge[0]+nodeStart),
        String(edge[1]+nodeStart)
    ]);
    addEdges(edgePoints);
}

function makeCartesianProduct() {
}
