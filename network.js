export { NetworkState, initNetwork, togglePhysics, toggleDirection, clearGraph }
import { updateGraphInfo } from "./analyze.js"

const NetworkState = {
    nodes: new vis.DataSet([]), 
    edges: new vis.DataSet([]),
    node_count: 0, 
    edge_count: 0,
    edge_id: 0, 
    node_id: 0,
    componentsVisible: false, 
    bridgesVisible: false, 
    physicsOn: true, 
    options: {
        height: "600px", 
        width: "800px", 
        interaction: { 
            hover: true, 
            dragNodes: true,
        }, 
        nodes: {
            shape: 'dot',
            size: 20
        },
        edges: {
            arrows: {
                to: { enabled: false }, 
            },
            color: "rgb(122,144,200)", 
        },
    },
    network: null, 
};

const EditMode = {
    mode: "a",
    prevSelectedNodeId: null,
    changeSelectedSize: true,
}

function initNetwork() {
    document.addEventListener('keydown', updateMode);

    var data = {
        nodes: NetworkState.nodes,
        edges: NetworkState.edges
    };
    var container = document.getElementById('network'); 
    NetworkState.network = new vis.Network(container, data, NetworkState.options);
    NetworkState.network.on('click', addModeClick);
    NetworkState.options.interaction.dragNodes = false;
    NetworkState.network.setOptions(NetworkState.options);
    NetworkState.network.on("hoverNode", function (params) {
        NetworkState.nodes.update({
            id: params.node,
            size: 25,
        });
    });
    NetworkState.network.on("blurNode", (event) => {
        const selectedNodes = NetworkState.network.getSelectedNodes();
        if (!selectedNodes.includes(event.node) || !EditMode.changeSelectedSize) {
            NetworkState.nodes.update({
                id: event.node,
                size: 20,
            });
        }

    });
}

function showSelectedSize(event) {
    NetworkState.nodes.update({
        id: event.nodes[0],
        size: 25,
    });
}

function showDeselectedSize(event) {
    const prev = event.previousSelection.nodes[0].id;
    NetworkState.nodes.update({
        id: prev,
        size: 20,
    });
}


function enabledSelectedSize() {
    NetworkState.network.on("selectNode", showSelectedSize);
    NetworkState.network.on("deselectNode", showDeselectedSize);
}

function disableSelectedSize() {
    NetworkState.network.getSelectedNodes().map(n => {
        NetworkState.nodes.update({
            id: n,
            size: 20
        })
    });
    NetworkState.network.unselectAll();
    NetworkState.network.off("selectNode", showSelectedSize);
    NetworkState.network.off("deselectNode", showDeselectedSize);
}

function updateMode(event) {
    if (!["a", "s", "d", "c"].includes(event.key)) return;

    var modeDisplay = document.getElementById("mode-display");
    var colorSelection = document.getElementById("node-color-selection");
    var clickAction;
    
    if (EditMode.mode == "a") clickAction = addModeClick;
    else if (EditMode.mode == "s") clickAction = selectModeClick;
    else if (EditMode.mode == "d") clickAction = deleteModeClick;
    else if (EditMode.mode == "c") clickAction = colorModeClick;
    NetworkState.network.off("click", clickAction);

    EditMode.mode = event.key;
    if (EditMode.mode == "a") {
        colorSelection.classList.add("hidden");
        NetworkState.options.interaction.dragNodes = false;
        if (!EditMode.changeSelectedSize) {
            enabledSelectedSize();
            EditMode.changeSelectedSize = true;
        }
        clickAction = addModeClick;
    }
    else if (EditMode.mode == "s") {
        colorSelection.classList.add("hidden");
        NetworkState.options.interaction.dragNodes = true;
        if (EditMode.changeSelectedSize) {
            disableSelectedSize();
            EditMode.changeSelectedSize = false;
        }
        clickAction = selectModeClick;
    }
    else if (EditMode.mode == "d") {
        colorSelection.classList.add("hidden");
        NetworkState.options.interaction.dragNodes = true;
        if (EditMode.changeSelectedSize) {
            disableSelectedSize();
            EditMode.changeSelectedSize = false;
        }
        clickAction = deleteModeClick;
    }
    else if (EditMode.mode == "c") {
        colorSelection.classList.remove("hidden");
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
        const nodeId = Math.max(event.nodes);
        deleteNode(nodeId);
    }
    else if (event.edges.length > 0) {
        const edgeId = Math.max(event.edges);
        deleteEdge(edgeId);
    }
}

function colorModeClick(event) {
    if (event.nodes.length > 0) {
        const nodeId = Math.max(event.nodes);
        setNodeColor(nodeId);
    }
}

function addNode(x, y) {
    var userLabel = document.getElementById('node-label').value;
    var id;
    var label;
    if (userLabel.trim() === '') {
        label = String(NetworkState.node_id);
        id = NetworkState.node_id;
        NetworkState.node_id += 1;
    }
    else {
        label = userLabel;
        id = Number(userLabel);
        if (NetworkState.node_id === label) NetworkState.node_id += 1;
    }

    var existingNode = NetworkState.nodes.get().find(function(n) {
        return n.label === label;
    })

    if (existingNode) {
        alert("That node already exists!")
        document.getElementById('node-label').value = '';
        return;
    }

    NetworkState.nodes.add({ id: id, label: label, x: x, y: y , physics: NetworkState.physicsOn}, ); 
    document.getElementById('node-label').value = '';
    NetworkState.node_count += 1;
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
    if (isNaN(fromId) || isNaN(toId)) {
        alert('Please enter valid node IDs.');
        return;
    }
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

function darkenHexColor(hex, factor = 0.8) {
  // Validate and parse the hex color
  const match = hex.match(/^#([0-9a-fA-F]{6})$/);
  if (!match) {
    throw new Error("Invalid hex color format. Use '#rrggbb'.");
  }

  // Extract RGB components from the hex string
  const r = parseInt(match[1].slice(0, 2), 16);
  const g = parseInt(match[1].slice(2, 4), 16);
  const b = parseInt(match[1].slice(4, 6), 16);

  // Apply the darkening factor
  const darkenedR = Math.max(0, Math.min(255, Math.round(r * factor)));
  const darkenedG = Math.max(0, Math.min(255, Math.round(g * factor)));
  const darkenedB = Math.max(0, Math.min(255, Math.round(b * factor)));

  // Convert back to hex and return the new color
  const darkenedHex =
    "#" +
    darkenedR.toString(16).padStart(2, "0") +
    darkenedG.toString(16).padStart(2, "0") +
    darkenedB.toString(16).padStart(2, "0");

  return darkenedHex;
}


function setNodeColor(nodeId) {
    var color = document.getElementById('node-color-selection').value;
    NetworkState.nodes.update({
        id: nodeId,
        color: {
            background: color,
            border: "grey",
            highlight: {
              background: color,
              border: "black"
            },
            hover: {
              background: color,
              border: "black",
            }
          }
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
    updateGraphInfo();
}

function togglePhysics() {
    NetworkState.physicsOn = !NetworkState.physicsOn;
    for (var n of NetworkState.nodes.get()) {
        NetworkState.nodes.update({id: n.id, physics: NetworkState.physicsOn});
    }
}

