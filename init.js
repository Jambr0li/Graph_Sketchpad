import { initNetwork, togglePhysics, toggleDirection, clearGraph, makeCycleGraph, makeCompleteGraph, 
        makeCubeGraph, makeHyperCube, makeCartesianProduct} from "./network.js";
import { toggleBridges, toggleComponents, djikstra } from "./analyze.js";
import { initColorPicker } from "./colorpicker.js"

initNetwork();
initColorPicker();

document.getElementById("clear-btn").addEventListener("click", clearGraph);
document.getElementById("toggle-directions-btn").addEventListener("click", toggleDirection);
document.getElementById("toggle-physics-btn").addEventListener("click", togglePhysics);
document.getElementById("toggle-components-btn").addEventListener("click", toggleComponents);
document.getElementById("toggle-bridges-btn").addEventListener("click", toggleBridges);
document.getElementById("djikstra-btn").addEventListener("click", djikstra);
document.getElementById("make-cube-graph").addEventListener("click", makeCubeGraph)
document.getElementById("make-hypercube-graph").addEventListener("click", makeHyperCube)
const cycleSizes = [3, 4, 5, 6, 7, 8, 9, 10];

cycleSizes.forEach(n => {
    const btn = document.getElementById(`make-cycle-graph-${n}`);
    if (btn) {
        btn.addEventListener("click", () => makeCycleGraph(n));
    }
    const btn2 = document.getElementById(`make-complete-graph-${n}`);
    if (btn2) {
        btn2.addEventListener("click", () => makeCompleteGraph(n));
    }
});

document.getElementById("generate-cartesian").addEventListener("click", makeCartesianProduct);
