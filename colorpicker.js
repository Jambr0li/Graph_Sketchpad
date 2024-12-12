export { ColorPickerState, initColorPicker }

const ColorPickerState = {
    color: "#98c4fc",
    maxColors: 24,
};

let selectedColorButton = null; // Track the currently selected color button

function initColorPicker() {
    const nodeColorSelector = document.getElementById('node-color-selection');
    nodeColorSelector.value = ColorPickerState.color;    
    nodeColorSelector.placeholder = ColorPickerState.color;    
    nodeColorSelector.addEventListener('change', updateColorPalette);
    updateColorPalette({ target: { value: ColorPickerState.color } });
}

function selectColorButton(button, color) {
    if (selectedColorButton) {
        selectedColorButton.style.boxShadow = "none";
    }
    button.style.boxShadow = "0 0 3px 1px black";
    selectedColorButton = button;
    ColorPickerState.color = color;
    document.getElementById('node-color-selection').value = color;
}

function updateColorPalette(event) {
    const newColor = event.target.value; // Get the selected color
    const previewsContainer = document.getElementById('color-previews');

    const colorButton = document.createElement('button');
    colorButton.style.backgroundColor = newColor;
    colorButton.style.width = '15px';
    colorButton.style.height = '15px';
    colorButton.style.border = '1px solid #000';
    colorButton.style.marginRight = '5px';
    colorButton.style.cursor = 'pointer';

    previewsContainer.insertBefore(colorButton, previewsContainer.firstChild);
    while (previewsContainer.childNodes.length > ColorPickerState.maxColors) {
        previewsContainer.removeChild(previewsContainer.lastChild);
    }
    colorButton.addEventListener('click', () => {
        selectColorButton(colorButton, newColor);
    });
    selectColorButton(colorButton, newColor);
}

