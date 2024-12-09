import { initNetwork, togglePhysics, toggleDirection, clearGraph } from "./network.js";
import { toggleBridges, toggleComponents } from "./analyze.js";

initNetwork();

document.getElementById("clear-btn").addEventListener("click", clearGraph);
document.getElementById("toggle-directions-btn").addEventListener("click", toggleDirection);
document.getElementById("toggle-physics-btn").addEventListener("click", togglePhysics);
document.getElementById("toggle-components-btn").addEventListener("click", toggleComponents);
document.getElementById("toggle-bridges-btn").addEventListener("click", toggleBridges);
