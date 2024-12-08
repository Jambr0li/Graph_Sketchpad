var nodes = new vis.DataSet([]);
var edges = new vis.DataSet([]);
var data = {
    nodes: nodes,
    edges: edges
};
var node_count = 0;
var edge_count = 0;
var edge_id = 0;

var componentsVisible = false;
var bridgesVisible = false;
var physicsOn = true;

var container = document.getElementById('network');
var options = {
    height: '600px',
    width: '800px',
    interaction: { hover: true },
    edges: {
        arrows: {
            to: {enabled: false}
        },
        color: "rgb(122,144,200)"
    },
};
var network = new vis.Network(container, data, options);

function clearGraph() {
    nodes.clear()
    edges.clear()
    node_count = 0;
    edge_count = 0;
    edge_id = 0;
    updateGraphInfo()
}

function updateGraphInfo() {
    document.getElementById('node-count').textContent = node_count;
    document.getElementById('edge-count').textContent = edge_count;
    var components = getComponents();
    document.getElementById("component-count").textContent = components.length;
    calculateDegrees()
    createAdjacencyMatrix()
    edges.update( // reset the edge colors back to normal (to reset dijkstra coloring)
        edges.get().map(edge => {
          return {
            id: edge.id, 
            color: options.edges.color, 
            width: 1 
          };
        })
      );
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
    physicsOn = !physicsOn;
    for (var n of nodes.get()) {
        nodes.update({id: n.id, physics: physicsOn});
    }
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

    // console.log(adj_obj);
    // console.log(adj_matrix);
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
    const concavity = 300;
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

function toggleComponents() {
    if (componentsVisible) {
        network.off("beforeDrawing", drawComponents);
        componentsVisible = false;
    }
    else {
        network.on("beforeDrawing", drawComponents);
        componentsVisible = true;
    }
    network.redraw();
}


function dijkstra() {
    updateGraphInfo()

    // Check if nodes exist and they are in the same component:
    // =============================================================================================

    const fromNode = document.getElementById('node-from-dij').value;
    const toNode = document.getElementById('node-to-dij').value;
    var toNodeExists= nodes.get().find(function(n) {
        return n.label === toNode;
    })
    var fromNodeExists= nodes.get().find(function(n) {
        return n.label === fromNode;
    })
    if (!toNodeExists || !fromNodeExists) {
        alert("One or both of those nodes don't exist!")
    }

    const components = getComponents()
    var possible = false;
    for (const component of components) {
        if (component.includes(Number(fromNode)) && component.includes(Number(toNode))) {
            possible = true; // we found that there exists a component that contains both nodes
        }
    }
    if (!possible) {
        alert(`Node ${fromNode} and node ${toNode} are in 2 different components, so there is no path between them.`)
        return;
    }
    // =============================================================================================

    // Perform Dijkstras
    // =============================================================================================

    var directed = false;
    if (document.getElementById('directed-path').checked) {
        options.edges.arrows.to.enabled = true;
        network.setOptions(options)
        directed = true;
    } else {
        options.edges.arrows.to.enabled = false;
        network.setOptions(options)
    }

    const graph = {}; // Create an adjacency list representation of the graph
    edges.get().forEach(edge => {
        if (!graph[edge.from]) graph[edge.from] = {};
        if (!graph[edge.to]) graph[edge.to] = {};
        graph[edge.from][edge.to] = edge.value || 1; // Assuming edge weight is in the `value` field
        if (!directed) {
            graph[edge.to][edge.from] = edge.value || 1; // Assuming the graph is undirected
        }
    });

    const distances = {}; // Store shortest distances to each node
    const previous = {}; // Track the previous node for the shortest path
    const visited = new Set();
    const queue = Object.keys(graph).map(Number); // All nodes as initial "queue"

    // Initialize distances and previous nodes
    for (const node of queue) {
        distances[node] = Infinity;
        previous[node] = null;
    }
    distances[fromNode] = 0;

    while (queue.length > 0) {
        // Find the node with the smallest distance
        let current = queue.reduce((minNode, node) => {
            return distances[node] < distances[minNode] ? node : minNode;
        });

        // Remove the current node from the queue
        queue.splice(queue.indexOf(current), 1);
        visited.add(current);

        // Stop if we've reached the destination node
        if (current == toNode) break;

        // Update distances for neighbors
        for (const neighbor in graph[current]) {
            if (visited.has(Number(neighbor))) continue;

            const newDist = distances[current] + graph[current][neighbor];
            if (newDist < distances[neighbor]) {
                distances[neighbor] = newDist;
                previous[neighbor] = current;
            }
        }
    }

    // Trace back the shortest path
    let path = [];
    let currentNode = toNode;
    while (currentNode) {
        const prevNode = previous[currentNode];
        if (prevNode !== null) {
            path.push({ from: prevNode, to: currentNode });
        }
        currentNode = prevNode;
    }
    path = path.reverse(); // Reverse the path to start from `fromNode`

    // Highlight the shortest path in the network
    edges.update(
        edges.get().map(edge => {
            const isInPath = path.some(p => (p.from == edge.from && p.to == edge.to) || (p.from == edge.to && p.to == edge.from));
            return {
                id: edge.id,
                color: isInPath ? "purple" : "#848484", // Highlight in red if part of the shortest path
                width: isInPath ? 3 : 1 // Make the path edges thicker
            };
        })
    );

    // alert(`Shortest path found! The path is: ${path.map(p => `${p.from} -> ${p.to}`).join(", ")}`);
    // =============================================================================================
}
function getBridges() {
    var bridges = [];
    for (var e of edges.get()) {
        var startNumComponents = getComponents().length; 
        edges.remove(e);
        var endNumComponents = getComponents().length; 
        edges.add(e);
        if (startNumComponents != endNumComponents) 
            bridges.push(e);
    }
    return bridges;
}

function toggleBridges() {
    updateGraphInfo()
    var bridgeColor = "red";
    var nonBridgeColor = options.edges.color;

    var bridges;
    if (bridgesVisible) {
        bridges = [];
        bridgesVisible = false; 
    }
    else {
        var bridges = getBridges();
        bridgesVisible = true;
    }
    var nonBridges = edges.get().filter(e => !bridges.includes(e));

    for (var b of bridges) {
        edges.update({
            id: b.id,
            color: bridgeColor,
            highlight: bridgeColor,
            hover: bridgeColor
        });
    }
    for (var e of nonBridges) {
        edges.update({
            id: e.id,
            color: nonBridgeColor,
            highlight: nonBridgeColor,
            hover: nonBridgeColor
        });
    }
}

