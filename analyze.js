export { updateGraphInfo, toggleBridges, toggleComponents, djikstra, getComponents }
import { NetworkState } from "./network.js"
import { QuickHull } from "./QuickHull.js"

function getOpenTab() {
    const activeTab = document.querySelector('.nav-link.active');
    if (activeTab) {
        return activeTab.getAttribute('data-bs-target').substring(1); // Remove the '#' prefix
    }
    return null;
}

function updateGraphInfo() {
    NetworkState.components = getComponents();
    NetworkState.bipartite = isGraphBipartite(); // must come after getComponents();
    if (NetworkState.bridgesVisible) {
        NetworkState.bridges = getBridges();
        drawBridges();
    }

    switch (getOpenTab()) {
        case "node-degrees-tab":
            calculateDegrees(); break;
        case "adjacency-matrix-tab":
            createAdjacencyMatrix(); break;
    }

    document.getElementById('node-count').textContent = NetworkState.node_count;
    document.getElementById('edge-count').textContent = NetworkState.edge_count;
    document.getElementById("component-count").textContent = NetworkState.components.length;
    document.getElementById("is-bipartite").textContent = (NetworkState.bipartite) ? "Yes" : "No";
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
    const radius = 30;
    const numPoints = 16;
    var components = NetworkState.components;
    for (var nodeIDs of components) {
        var positions = NetworkState.network.getPositions(nodeIDs);
        var points = Object.values(positions)
        var circlePoints = [];
        for (var p of points) {
            circlePoints = circlePoints.concat(generateCircle(p, radius, numPoints)); 
        }
        const hullPoints = QuickHull(circlePoints);

        ctx.beginPath();
        ctx.moveTo(hullPoints[0].x, hullPoints[0].y);
        for (let i = 1; i < hullPoints.length; i++) {
            ctx.lineTo(hullPoints[i].x, hullPoints[i].y);
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
    NetworkState.componentsVisible ? document.getElementById('toggle-components-btn').classList.add('custom-active') : document.getElementById('toggle-components-btn').classList.remove('custom-active');
}


function djikstra() {
    updateGraphInfo()
    if (NetworkState.bridgesVisible) toggleBridges();

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

    const components = NetworkState.components;
    var possible = false;
    for (const component of components) {
        if (component.includes(fromNode) && component.includes(toNode)) {
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
        document.getElementById('toggle-directions-btn').classList.add('custom-active');
        directed = true;
    } else {
        NetworkState.options.edges.arrows.to.enabled = false;
        NetworkState.network.setOptions(NetworkState.options)
        document.getElementById('toggle-directions-btn').classList.remove('custom-active');
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

function getAdjacencyList() {
    const nodeMap = new Map();
    const nodeMapInv = new Map();
    NetworkState.nodes.get().forEach((node, index) => {
        nodeMap[node.id] = index;
        nodeMapInv[index] = node.id;
    });
    const adjacencyList = NetworkState.nodes.get().reduce((acc, obj, _) => {
        acc.push(NetworkState.network.getConnectedNodes(obj.id).map(n => nodeMap[n]));
        return acc;
    }, []);
    function edgeToVis(from, to) {
        return NetworkState.edges.get({
            filter: (edge) => 
                (edge.from === nodeMapInv[from] && edge.to === nodeMapInv[to]) ||
                (edge.to === nodeMapInv[from] && edge.from === nodeMapInv[to])
        });
    }
    return {adjacencyList: adjacencyList, edgeToVis: edgeToVis};
}

function getBridges() {
    const { adjacencyList, edgeToVis } = getAdjacencyList();
    const n = adjacencyList.length;
    const visited = Array(n).fill(false);
    const disc = Array(n).fill(-1);
    const low = Array(n).fill(-1);
    var parent = Array(n).fill(-1);
    const bridges = [];
    var time = 0;

    function dfs(u) {
        visited[u] = true;
        disc[u] = time;
        low[u] = time;
        time += 1;
        for (var v of adjacencyList[u]) {
            if (v == parent[u]) 
                continue;
            else if (visited[v]) 
                low[u] = Math.min(low[u],disc[v]);
            else {
                parent[v] = u;
                dfs(v);
                low[u] = Math.min(low[u],low[v]);
                if (low[v] > disc[u]) {
                    bridges.push([u,v]);
                }
            }
        }
    }

    for (var u = 0; u < n; u++) {
        if (visited[u] == false) {
            dfs(u);        
        }
    }

    const visEdges = bridges
        .map(b => edgeToVis(b[0], b[1])) // map adjacency edges to vis.js edges
        .filter(bs => bs.length == 1) // remove parallel edges
        .map(bs => bs[0].id) // convert [edge] into edge.id
    return visEdges;
}

function colorEdges(edgeIds, color, width=1) {
    NetworkState.edges.update(
        NetworkState.edges.get().map(e => {
            const included = edgeIds.includes(e.id);
            return {
                id: e.id,
                color: (included) ? color : NetworkState.options.edges.color,
                width: (included) ? width : 1
            }
        })
    );
}

function drawBridges() {
    colorEdges(NetworkState.bridges, "red", 3);
}

function toggleBridges() {
    const toggleBridgesBtn = document.getElementById('toggle-bridges-btn');
    NetworkState.bridgesVisible = !NetworkState.bridgesVisible;
    NetworkState.bridgesVisible ? 
        toggleBridgesBtn.classList.add('custom-active') : 
        toggleBridgesBtn.classList.remove('custom-active');
    if (!NetworkState.bridgesVisible)
        colorEdges(NetworkState.bridges, NetworkState.options.edges.color, 1);
    updateGraphInfo();
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
    return NetworkState.components.every(isComponentBipartite);
}
