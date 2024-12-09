import { initNetwork, togglePhysics, toggleDirection, clearGraph } from "./network.js";
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
