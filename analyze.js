export { updateGraphInfo, toggleBridges, toggleComponents }
import { NetworkState } from "./network.js"

function updateGraphInfo() {
    document.getElementById('node-count').textContent = NetworkState.node_count;
    document.getElementById('edge-count').textContent = NetworkState.edge_count;
    var components = getComponents();
    document.getElementById("component-count").textContent = components.length;
    calculateDegrees()
    createAdjacencyMatrix()
    var isBipartiteText = document.getElementById("is-bipartite");
    if (isGraphBipartite())
        isBipartiteText.textContent = "Yes";
    else 
        isBipartiteText.textContent = "No";
    NetworkState.edges.update( // reset the edge colors back to normal (to reset dijkstra coloring)
        NetworkState.edges.get().map(edge => {
          return {
            id: edge.id, 
            color: NetworkState.options.edges.color, 
            width: 1 
          };
        })
      );
}

function calculateDegrees() {
    const degreeCount = {}
    for (const node of NetworkState.nodes.get()){ // for each node
        degreeCount[node.id] = 0; // initialize degree count to 0
        for (const edge of NetworkState.edges.get()) {
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
    // Create a dictionary of what NetworkState.nodes are connected
    // {
    //  1 -> 2,3,4
    //  2 -> 4
    // }

    const length = NetworkState.nodes.get().length;

    const node_ID_to_index = {};
    const index_to_node_ID= {};
    NetworkState.nodes.get().forEach((node,index) => {
        node_ID_to_index[node.id] = index;
        index_to_node_ID[index] = node.id;
    });

    // Then create an adjacency matrix using this information.

    var adj_obj = {}
    for (const node of NetworkState.nodes.get()) {
        adj_obj[node.id] = new Set();
    }
    for (const edge of NetworkState.edges.get()) {
        adj_obj[edge.to].add(edge.from);
        adj_obj[edge.from].add(edge.to);
    }

    // construct the adj matrix
    var adj_matrix = Array.from({ length: length }, () => Array(length).fill(0));
    for (const node of NetworkState.nodes.get()) {
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

    // if no NetworkState.nodes, reset table to empty
    if (adj_matrix.length == 0) {
        let eigHtml = `
            <h3>Eigenvalues</h3>
            <p> None </p>
            <h3>EigenVectors</h3>
            <p> None </p>
        `
        document.getElementById('eig-results').innerHTML = eigHtml;
        return;
    }

    const eig = math.eigs(adj_matrix)
    const eigenvectors = transpose(eig.vectors); // Transpose the eigenvectors
    // console.log(adj_matrix)
    // Generate HTML for eigenvalues and eigenvectors

    let eigHtml = `
      <h3>Eigenvalues</h3>
      <ul style="list-style-type: none; padding-left: 0;">`;
    eig.values.forEach((value, index) => {
        eigHtml += `<li style="padding: 5px;">λ<sub>${index + 1}</sub> = ${value.toFixed(3)}</li>`;
    });
    eigHtml += `</ul>`;

    eigHtml += `<h3>Eigenvectors</h3>`;
    eigenvectors.forEach((vector, index) => {
        eigHtml += `<p style="padding: 5px;"><b>v<sub>${index + 1}</sub></b> = [${vector.map(v => v.toFixed(3)).join(', ')}]</p>`;
    });

    // Display the eigenvalues and eigenvectors
    document.getElementById('eig-results').innerHTML = eigHtml;

    // console.log("Eigenvalues:", eig.values);
    // console.log("Eigenvectors:", eigenvectors);
}

function transpose(matrix) {
    return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
}

// returns an array of components (1 component = array of connected node IDs)
function getComponents() { 
    var allNodes = NetworkState.nodes.get().map(n => n.id)
    var components = [];
    while(allNodes.length > 0) {
        var curComponent = [];
        var toVisit = [allNodes.pop()];
        while (toVisit.length > 0) {
            var curNode = toVisit.pop();
            if (curComponent.includes(curNode)) continue;
            toVisit = toVisit.concat(NetworkState.network.getConnectedNodes(curNode));
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
        var positions = NetworkState.network.getPositions(nodeIDs);
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
    if (NetworkState.componentsVisible) {
        NetworkState.network.off("beforeDrawing", drawComponents);
        NetworkState.componentsVisible = false;
    }
    else {
        NetworkState.network.on("beforeDrawing", drawComponents);
        NetworkState.componentsVisible = true;
    }
    NetworkState.network.redraw();
}


function dijkstra() {
    updateGraphInfo()

    // Check if NetworkState.nodes exist and they are in the same component:
    // =============================================================================================

    const fromNode = document.getElementById('node-from-dij').value;
    const toNode = document.getElementById('node-to-dij').value;
    var toNodeExists= NetworkState.nodes.get().find(function(n) {
        return n.label === toNode;
    })
    var fromNodeExists= NetworkState.nodes.get().find(function(n) {
        return n.label === fromNode;
    })
    if (!toNodeExists || !fromNodeExists) {
        alert("One or both of those NetworkState.nodes don't exist!")
    }

    const components = getComponents()
    var possible = false;
    for (const component of components) {
        if (component.includes(Number(fromNode)) && component.includes(Number(toNode))) {
            possible = true; // we found that there exists a component that contains both NetworkState.nodes
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
        NetworkState.options.edges.arrows.to.enabled = true;
        NetworkState.network.setOptions(NetworkState.options)
        directed = true;
    } else {
        NetworkState.options.edges.arrows.to.enabled = false;
        NetworkState.network.setOptions(NetworkState.options)
    }

    const graph = {}; // Create an adjacency list representation of the graph
    NetworkState.edges.get().forEach(edge => {
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
    const queue = Object.keys(graph).map(Number); // All NetworkState.nodes as initial "queue"

    // Initialize distances and previous NetworkState.nodes
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

    // Highlight the shortest path in the NetworkState.network
    NetworkState.edges.update(
        NetworkState.edges.get().map(edge => {
            const isInPath = path.some(p => (p.from == edge.from && p.to == edge.to) || (p.from == edge.to && p.to == edge.from));
            return {
                id: edge.id,
                color: isInPath ? "purple" : "#848484", // Highlight in red if part of the shortest path
                width: isInPath ? 3 : 1 // Make the path NetworkState.edges thicker
            };
        })
    );

    // alert(`Shortest path found! The path is: ${path.map(p => `${p.from} -> ${p.to}`).join(", ")}`);
    // =============================================================================================
}

function getBridges() {
    var bridges = [];
    for (var e of NetworkState.edges.get()) {
        var startNumComponents = getComponents().length; 
        NetworkState.edges.remove(e);
        var endNumComponents = getComponents().length; 
        NetworkState.edges.add(e);
        if (startNumComponents != endNumComponents) 
            bridges.push(e);
    }
    return bridges;
}

function toggleBridges() {
    updateGraphInfo()
    var bridgeColor = "red";
    var nonBridgeColor = NetworkState.options.edges.color;

    var bridges;
    if (NetworkState.bridgesVisible) {
        bridges = [];
        NetworkState.bridgesVisible = false; 
    }
    else {
        var bridges = getBridges();
        NetworkState.bridgesVisible = true;
    }
    var nonBridges = NetworkState.edges.get().filter(e => !bridges.includes(e));

    for (var b of bridges) {
        NetworkState.edges.update({
            id: b.id,
            color: bridgeColor,
            highlight: bridgeColor,
            hover: bridgeColor
        });
    }
    for (var e of nonBridges) {
        NetworkState.edges.update({
            id: e.id,
            color: nonBridgeColor,
            highlight: nonBridgeColor,
            hover: nonBridgeColor
        });
    }
}

function getDirectedNeighbors(nodeId, direction) {
    const connectedEdges = NetworkState.network.getConnectedEdges(nodeId); 
    const neighbors = [];

    connectedEdges.forEach(edgeId => {
        const edge = NetworkState.edges.get(edgeId); 
        if (direction === 'outgoing' && edge.from === nodeId) {
            neighbors.push(edge.to);
        } else if (direction === 'incoming' && edge.to === nodeId) {
            neighbors.push(edge.from);
        }
    });

    return neighbors;
}

function isComponentBipartite(component) {
    var colors = {};
    var toVisit = [component[0]];
    colors[component[0]] = 0;

    var getNeighbors = (NetworkState.options.edges.arrows.to.enabled) 
                    ? (node) => getDirectedNeighbors(node, "outgoing")
                    : (node) => NetworkState.network.getConnectedNodes(node)

    while (toVisit.length > 0) {
        var curNode = toVisit.shift();
        for (var n of getNeighbors(curNode)) {
            if (!(n in colors)) {
                colors[n] = 1 - colors[curNode];
                toVisit.push(n);
            }
            else if (colors[n] == colors[curNode]) {
                return false;
            }
        }
    }

    return true;
}

function isGraphBipartite() {
    return getComponents().every(isComponentBipartite);
}