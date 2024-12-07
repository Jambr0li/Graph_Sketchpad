var nodes = new vis.DataSet([]);
var edges = new vis.DataSet([]);
var data = {
    nodes: nodes,
    edges: edges
};
var node_count = 0;
var edge_count = 0;
var edge_id = 0;

var container = document.getElementById('network');
var options = {
    height: '600px',
    width: '800px',
    interaction: { hover: true },
    edges: {
        arrows: {
            to: {enabled: false}
        }
    },
    physics: { enabled: true } ,
};
var network = new vis.Network(container, data, options);

function addNode() {
    var label = document.getElementById('node-label').value;
    console.log(label);
    if (label.trim() === '') {
        alert('Please enter a label for the node.');
        return;
    }

    var existingNode = nodes.get().find(function(n) {
        return n.label === label;
    })

    if (existingNode) {
        alert("That node already exists!")
        document.getElementById('node-label').value = '';
        return;
    }

    // ensure the new nodes appear in a reasonable place
    var viewPosition = network.getViewPosition();
    var scale = network.getScale();
    var offset = 400 / scale;
    var x = viewPosition.x + Math.random() * offset - offset / 2;
    var y = viewPosition.y + Math.random() * offset - offset / 2;

    nodes.add({ id: Number(label), label: label, x: x, y: y }, ); // set color inside this
    document.getElementById('node-label').value = '';
    node_count += 1;
    document.getElementById('node-count').textContent = node_count;
    // console.log(nodes.get())
    calculateDegrees()
}

function deleteNode() {
    var label = document.getElementById('node-label').value;
    if (label.trim() === '') {
        alert('Please enter a label for the node.');
        return;
    }

    var existingNode = nodes.get().find(function(n) {
        return n.label === label;
    })

    if (!existingNode) {-
        alert("That node doesn't exist!")
        document.getElementById('node-label').value = '';
        return;
    }

    nodes.remove({ id: Number(label), label: label});
    document.getElementById('node-label').value = '';
    node_count -= 1;
    document.getElementById('node-count').textContent = node_count;

    // Check if node being deleted has an edge attatched to it.
    for (const edge of edges.get()) {
        if (edge.from === existingNode.id || edge.to === existingNode.id) {
            edges.remove(edge.id)
            edge_count -= 1;
        }
    }
    document.getElementById('edge-count').textContent = edge_count;
    calculateDegrees()
}

function setNodeColor() {
    var label = document.getElementById('node-color-label').value;
    var color = document.getElementById('node-color-selection').value;
    var existingNode = nodes.get().find(function(n) {
        return n.label === label;
    })

    if (!existingNode) {
        alert("That node doesn't exist!")
        document.getElementById('node-deletion-label').value = '';
        return;
    }

    nodes.update({
        id: Number(label),
        color: {
            background: color,
            border: "grey",
            highlight: {
              background: "#97C2FC",
              border: "#2B7CE9"
            },
            hover: {
              background: color,
              border: "black" 
            }
          }
    })
}

function toggleDirection() {
    var currentState = options.edges.arrows.to.enabled;
    options.edges.arrows.to.enabled = !currentState;
    network.setOptions(options);
}

function togglePhysics() {
    var currentState = options.physics.enabled;
    options.physics.enabled = !currentState;
    network.setOptions(options);
}

function addEdge() {
    var fromId = parseInt(document.getElementById('edge-from').value);
    var toId = parseInt(document.getElementById('edge-to').value);
    if (isNaN(fromId) || isNaN(toId)) {
        alert('Please enter valid node IDs.');
        return;
    }
    if (!nodes.get(fromId) || !nodes.get(toId)) {
        alert('One or both node IDs do not exist.');
        return;
    }
    edges.add({id: edge_id, from: fromId, to: toId, label: String(edge_id)});
    edge_id += 1;
    document.getElementById('edge-from').value = '';
    document.getElementById('edge-to').value = '';
    edge_count += 1;
    document.getElementById('edge-count').textContent = edge_count;
    calculateDegrees()
}

function deleteEdge() {
    var EdgeID = parseInt(document.getElementById('edge-id').value);
    if (isNaN(EdgeID)) {
        alert('Please enter valid node IDs.');
        return;
    }
    if (!edges.get(EdgeID)) {
        alert('Edge ID does not exist!');
        return;
    }
    edges.remove({id: EdgeID});
    edge_count -= 1;
    document.getElementById('edge-count').textContent = edge_count;
    document.getElementById('edge-id').value = ''
    calculateDegrees()
}

function calculateDegrees() {
    const degreeCount = {}
    for (const node of nodes.get()){ // for each node
        degreeCount[node.id] = 0; // initialize degree count to 0
        for (const edge of edges.get()) {
            if (edge.to === node.id || edge.from === node.id){
                degreeCount[node.id] += 1
            }
        }
    }

    let html = `
      <table style="border-collapse: collapse; width: 100%; margin-top: 20px;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="border: 1px solid #ccc; padding: 8px;">Node ID</th>
            <th style="border: 1px solid #ccc; padding: 8px;">Degree</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const nodeId in degreeCount) {
      html += `
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;">${nodeId}</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${degreeCount[nodeId]}</td>
          </tr>
      `;
    }

    html += `</tbody></table>`;

    // Insert the entire table in one go
    document.getElementById('node-degrees').innerHTML = html;
}
