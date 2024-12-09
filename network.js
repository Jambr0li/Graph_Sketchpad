export { NetworkState, initNetwork, togglePhysics, toggleDirection, clearGraph, makeCycleGraph, 
    makeCompleteGraph, makeCubeGraph, makeHyperCube, makeCartesianProduct }
import { updateGraphInfo, getComponents } from "./analyze.js"
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
        setNodeSizeLarge(n);
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
            addEdge(EditMode.prevSelectedNodeId, nodeId);
            EditMode.prevSelectedNodeId = nodeId;
        }
    }
    else {
        var x = event.pointer.canvas.x;
        var y = event.pointer.canvas.y;
        addNode(x,y);
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

function addNode(x, y) {
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

function addEdge(fromId, toId) {
    if (!NetworkState.nodes.get(fromId) || !NetworkState.nodes.get(toId)) {
        alert('One or both node IDs do not exist.');
        return;
    }
    NetworkState.edges.add({id: NetworkState.edge_id, from: fromId, to: toId, label: String(NetworkState.edge_id)});
    NetworkState.edge_id += 1;
    NetworkState.edge_count += 1;
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
    // Add n nodes
    for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n;
        const x = centerX + radius * Math.cos(angle) + userPos.x;
        const y = centerY + radius * Math.sin(angle) + userPos.y;
        addNode(x,y);
    }

    // Add edges to form a cycle: 1->2, 2->3, ..., (n-1)->n, n->1
    for (let i = 1; i <= n; i++) {
        const fromId = i;
        const toId = (i < n) ? i + 1 : 1; // if at the last node, connect back to 1
        addEdge(String(fromId+nodeStart), String(toId+nodeStart));
    }

    updateGraphInfo()
}

function makeCompleteGraph(n) {
    // Position nodes in a circle for a nice layout
    const radius = 200;
    const centerX = 0;
    const centerY = 0;
    const userPos = NetworkState.network.getViewPosition();

    // Add nodes
    var nodeStart = NetworkState.node_id;
    if (NetworkState.node_id == 0) nodeStart -= 1;
    for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n;
        const x = centerX + radius * Math.cos(angle) + userPos.x;
        const y = centerY + radius * Math.sin(angle) + userPos.y;
        addNode(x,y);
    }

    // Add edges: For a complete graph, connect every pair of nodes
    for (let i = 1; i <= n; i++) {
        for (let j = i + 1; j <= n; j++) {
            var fromId = String(i+nodeStart);
            var toId = String(j+nodeStart);
            addEdge(fromId, toId);
        }
    }

    updateGraphInfo()
}

function makeCubeGraph() {
    // Define node positions to look like a cube in 2D:
    // We'll have a "front" square and a "back" square offset to give a sense of depth.
    // Front square (4 vertices):
    const frontSquare = [
        { id: 1,  x: -100, y: -100 },
        { id: 2,  x: 100,  y: -100 },
        { id: 3,  x: 100,  y: 100 },
        { id: 4,  x: -100, y: 100 }
    ];

    // Back square (4 vertices) slightly shifted:
    const backSquare = [
        { id: 5,  x: -50,  y: -50 },
        { id: 6,  x: 150,  y: -50 },
        { id: 7,  x: 150,  y: 150 },
        { id: 8,  x: -50,  y: 150 }
    ];

    // Add all nodes
    var userPos = NetworkState.network.getViewPosition();
    var nodeStart = NetworkState.node_id;
    if (NetworkState.node_id == 0) nodeStart -= 1;

    const allNodes = frontSquare.concat(backSquare);
    for (let node of allNodes) {
        addNode(node.x+userPos.x, node.y+userPos.y);
        NetworkState.node_count += 1;
    }

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

    for (let edge of edges) {
        var fromId = String(edge[0]+nodeStart);
        var toId = String(edge[1]+nodeStart);
        addEdge(fromId, toId);
    }

    // network.fit(); // If using a global network variable to fit the view
    updateGraphInfo()
}

function makeHyperCube() {
    // Outer cube vertices (like a cube):
    // Two squares offset, connected to form a cube shape.
    const outerCube = [
        {id: 1, x: -150, y: -150},
        {id: 2, x: 150,  y: -150},
        {id: 3, x: 150,  y: 150},
        {id: 4, x: -150, y: 150},
        {id: 5, x: -100, y: -100},
        {id: 6, x: 200,  y: -100},
        {id: 7, x: 200,  y: 200},
        {id: 8, x: -100, y: 200}
    ];

    // Inner cube vertices (smaller cube inside):
    const innerCube = [
        {id: 9,  x: -50, y: -50},
        {id: 10, x: 50,  y: -50},
        {id: 11, x: 50,  y: 50},
        {id: 12, x: -50, y: 50},
        {id: 13, x: -25, y: -25},
        {id: 14, x: 75,  y: -25},
        {id: 15, x: 75,  y: 75},
        {id: 16, x: -25, y: 75}
    ];

    var userPos = NetworkState.network.getViewPosition();
    var nodeStart = NetworkState.node_id;
    if (NetworkState.node_id == 0) nodeStart -= 1;

    // Add all nodes
    const allNodes = outerCube.concat(innerCube);
    for (let node of allNodes) {
        addNode(node.x+userPos.x, node.y+userPos.y);
    }

    // Edges for the outer cube (like a cube from the previous example)
    const outerEdges = [
        // Front square (1-2-3-4)
        [1,2], [2,3], [3,4], [4,1],
        // Back square (5-6-7-8)
        [5,6], [6,7], [7,8], [8,5],
        // Connections between front and back (1-5, 2-6, 3-7, 4-8)
        [1,5], [2,6], [3,7], [4,8]
    ];

    // Edges for the inner cube (9-16), structured the same way
    const innerEdges = [
        // Front square (9-10-11-12)
        [9,10], [10,11], [11,12], [12,9],
        // Back square (13-14-15-16)
        [13,14], [14,15], [15,16], [16,13],
        // Connections between front and back (9-13, 10-14, 11-15, 12-16)
        [9,13], [10,14], [11,15], [12,16]
    ];

    // Edges connecting outer cube to inner cube
    // Connect corresponding vertices in some pattern to mimic 4D edges
    // Here we connect 1->9, 2->10, 3->11, 4->12, 5->13, 6->14, 7->15, 8->16
    const hyperEdges = [
        [1,9], [2,10], [3,11], [4,12],
        [5,13], [6,14], [7,15], [8,16]
    ];

    const allEdges = outerEdges.concat(innerEdges).concat(hyperEdges);

    // Add all edges
    for (let edge of allEdges) {
        var fromId = String(edge[0]+nodeStart);
        var toId = String(edge[1]+nodeStart);
        addEdge(fromId, toId);
    }

    updateGraphInfo()
}

function cartesianProductGraph(nodeIds1, nodeIds2) {
    const nodes = [];
    const edges = [];

    // Generate nodes for the Cartesian product
    for (const id1 of nodeIds1) {
        for (const id2 of nodeIds2) {
            const newId = `${id1}-${id2}`;
            const newLabel = `(${id1}, ${id2})`;
            nodes.push({ id: newId, label: newLabel });
        }
    }

    // Generate edges between nodes based on Cartesian product properties
    for (const id1 of nodeIds1) {
        for (const id2 of nodeIds2) {
            for (const id2Alt of nodeIds2) {
                if (id2 !== id2Alt) {
                    edges.push({
                        from: `${id1}-${id2}`,
                        to: `${id1}-${id2Alt}`
                    });
                }
            }
            for (const id1Alt of nodeIds1) {
                if (id1 !== id1Alt) {
                    edges.push({
                        from: `${id1}-${id2}`,
                        to: `${id1Alt}-${id2}`
                    });
                }
            }
        }
    }

    return { nodes, edges };
}

function makeCartesianProduct() {
    var nodeId1 = document.getElementById("node1-id").value;
    var nodeId2 = document.getElementById("node2-id").value;
    var components = getComponents();
    
    if (!NetworkState.nodes.get(nodeId1)) {
        alert(`Node ID ${nodeId1} does not exist!`);
        return;
    }
    if (!NetworkState.nodes.get(nodeId2)) {
        alert(`Node ID ${nodeId2} does not exist!`);
        return;
    }

    var comp1 = null;
    var comp2 = null;
    for (var c of components) {
        if (!comp1)
            if (c.includes(nodeId1)) comp1 = c;
        else
            if (c.includes(nodeId2)) comp2 = c;
    }

    if (comp2 == null || comp1 == comp2) {
        alert("Node Id 1 and Node Id 2 are in the same component! Select nodes in different components.");
    }

    var out = cartesianProductGraph(comp1, comp2);
    for (var n of out.nodes) {
        NetworkState.nodes.add({
            
        });
    }
}
