var nodes = new vis.DataSet([]);
var edges = new vis.DataSet([]);
var data = {
    nodes: nodes,
    edges: edges
};
var node_count = 0;
var edge_count = 0;
var edge_id = 0;
var componentsShowed = true;

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

function updateGraphInfo() {
    document.getElementById('node-count').textContent = node_count;
    document.getElementById('edge-count').textContent = edge_count;
    var components = getComponents();
    document.getElementById("component-count").textContent = components.length;
    calculateDegrees()
    createAdjacencyMatrix()
}

function addNode() {
    var label = document.getElementById('node-label').value;
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
    updateGraphInfo();
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
    node_count -= 1;
    document.getElementById('node-label').value = '';

    // Check if node being deleted has an edge attatched to it.
    for (const edge of edges.get()) {
        if (edge.from === existingNode.id || edge.to === existingNode.id) {
            edges.remove(edge.id)
            edge_count -= 1;
        }
    }
    updateGraphInfo();
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
    updateGraphInfo();
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
    updateGraphInfo();
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
    document.getElementById('node-degree-title').textContent = "Node Degrees"
    document.getElementById('adj-matrix-title').textContent = "Adjacency Matrix"
    document.getElementById('node-degrees').innerHTML = html;
}

function createAdjacencyMatrix(){
    // Create a dictionary of what nodes are connected
    // {
    //  1 -> 2,3,4
    //  2 -> 4
    // }

    const length = nodes.get().length;

    const node_ID_to_index = {};
    const index_to_node_ID= {};
    nodes.get().forEach((node,index) => {
        node_ID_to_index[node.id] = index;
        index_to_node_ID[index] = node.id;
    });

    // Then create an adjacency matrix using this information.

    var adj_obj = {}
    for (const node of nodes.get()) {
        adj_obj[node.id] = new Set();
    }
    for (const edge of edges.get()) {
        adj_obj[edge.to].add(edge.from);
        adj_obj[edge.from].add(edge.to);
    }

    // construct the adj matrix
    var adj_matrix = Array.from({ length: length }, () => Array(length).fill(0));
    for (const node of nodes.get()) {
        const fromIndex = node_ID_to_index[node.id]
        for (const connection of adj_obj[node.id]){
            const toIndex = node_ID_to_index[connection]
            adj_matrix[fromIndex][toIndex] = 1;
        }
    }

    let html = `
      <table style="border-collapse: collapse; width: 100%; margin-top: 20px;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="border: 1px solid #ccc; padding: 8px;"></th>`
    
    adj_matrix.forEach((arr, index) => { // add all the top headers
        html += `<th style="border: 1px solid #ccc; padding: 8px;">${index_to_node_ID[index]}</th>`
    })
    html += `  </tr>
             </thead>
             <tbody>`
    adj_matrix.forEach((arr, index) => {
        html += `</tr>
                    <th style="border: 1px solid #ccc; padding: 8px; background: #f5f5f5;">${index_to_node_ID[index]}</th>`
        arr.forEach( num => {
            html += `<td style="border: 1px solid #ccc; padding: 8px;">${num}</td>`

        })
        html += `</tr>`
    })

    html += `</tbody></table>`;
    document.getElementById('adj-matrix').innerHTML = html;



        //   loop through through and add each index

    //         <th style="border: 1px solid #ccc; padding: 8px;">Node ID</th>
    //         <th style="border: 1px solid #ccc; padding: 8px;">Degree</th>
    //       </tr>
    //     </thead>
    //     <tbody>
    // `;

    console.log(adj_obj);
    console.log(adj_matrix);
    adj_matrix.forEach((arr, index) => {
        console.log(index_to_node_ID[index], arr)
        // arr.forEach(num => {
        //     console.log(num);
        // })
    })
}

// returns an array of components (1 component = array of connected node IDs)
function getComponents() { 
    var allNodes = nodes.get().map(n => n.id)
    var components = [];
    while(allNodes.length > 0) {
        var curComponent = [];
        var toVisit = [allNodes.pop()];
        while (toVisit.length > 0) {
            var curNode = toVisit.pop();
            if (curComponent.includes(curNode)) continue;
            toVisit = toVisit.concat(network.getConnectedNodes(curNode));
            curComponent.push(curNode);
        }
        allNodes = allNodes.filter(n => !curComponent.includes(n));
        components.push(curComponent);
    }
    return components;
}

function getSeededColor(seed, opacity=1) {
    function seededRandom() {
        const m = 0x80000000;  // 2^31
        const a = 1664525;
        const c = 1013904223;

        seed = (a * seed + c) % m;
        return seed / m;
    }

    const r = Math.floor(seededRandom() * 256);
    const g = Math.floor(seededRandom() * 256);
    const b = Math.floor(seededRandom() * 256);

    return `rgb(${r}, ${g}, ${b}, ${opacity})`;
}

function generateCircle(center, radius, numPoints) {
    const points = [];
    const angleStep = (2 * Math.PI) / numPoints;

    for (let i = 0; i < numPoints; i++) {
        const angle = i * angleStep;
        const x = center.x + radius * Math.cos(angle);
        const y = center.y + radius * Math.sin(angle);
        points.push({ x, y });
    }

    return points;
}

function drawComponents(ctx) {
    const concavity = 1000;
    const radius = 30;
    const numPoints = 100;
    var components = getComponents();
    for (var nodeIDs of components) {
        var positions = network.getPositions(nodeIDs);
        var points = Object.values(positions)
        var circlePoints = [];
        for (var p of points) {
            circlePoints = circlePoints.concat(generateCircle(p, radius, numPoints)); 
        }
        const hullPoints = hull(circlePoints.map(p => [p.x,p.y]), concavity);

        ctx.beginPath();
        ctx.moveTo(hullPoints[0][0], hullPoints[0][1]);
        for (let i = 1; i < hullPoints.length; i++) {
            ctx.lineTo(hullPoints[i][0], hullPoints[i][1]);
        }
        ctx.closePath();
        ctx.fillStyle = getSeededColor(nodeIDs[0], 0.3);
        ctx.fill();
    }
}

function showComponents() {
    if (componentsShowed) {
        network.on("beforeDrawing", drawComponents);
        componentsShowed = false;
    }
    else {
        network.off("beforeDrawing", drawComponents);
        componentsShowed = true;
    }
    network.redraw();
}

function dijkstra() {
}