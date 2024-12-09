export { NetworkState, initNetwork, togglePhysics, toggleDirection, clearGraph }
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

