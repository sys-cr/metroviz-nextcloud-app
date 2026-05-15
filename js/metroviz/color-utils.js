/**
 * Converts a hexadecimal color string to HSV (Hue, Saturation, Value) representation.
 * 
 * @param {string} hex - The hex color string (e.g., "#FF0000").
 * @returns {{h: number, s: number, v: number}} Object containing hue (0-360), saturation (0-1), and value (0-1).
 */
export function hexToHsv(hex) {
    // Normalize RGB values to 0-1 range for standard color space calculations
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    const v = max;
    
    // Saturation is zero if the color is black (max === 0) to avoid division by zero
    const s = max === 0 ? 0 : d / max;
    let h = 0;
    
    // Calculate hue based on which RGB component is dominant
    if (d > 1e-6) {
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
    }
    return { h: h * 360, s, v };
}

/**
 * Sorts an array of hex colors primarily by hue (rainbow order).
 * Desaturated colors (grays) are pushed to the end and sorted by brightness.
 * 
 * @param {string[]} hexes - Array of hex color strings.
 * @returns {string[]} A new array of sorted hex color strings.
 */
export function sortPaletteRainbow(hexes) {
    return [...hexes].sort((a, b) => {
        const A = hexToHsv(a);
        const B = hexToHsv(b);
        
        // Treat colors with very low saturation as grays
        const grayA = A.s < 0.15;
        const grayB = B.s < 0.15;
        
        // Segregate grays from vibrant colors
        if (grayA !== grayB) return grayA ? 1 : -1;
        
        // Sort grays by brightness (value) descending
        if (grayA && grayB) return B.v - A.v;
        
        // Sort vibrant colors by hue ascending
        return A.h - B.h;
    });
}

export const METRO_PALETTE_BASE = [
    '#E32017', '#003688', '#0019A8', '#009A44', '#007229',
    '#FFD300', '#F4A9BE', '#9B0056', '#B36305', '#00A0E2',
    '#76D0BD', '#00AFAD', '#EE7623', '#9364CC', '#66C028',
    '#0064B0', '#8BC75F', '#E3000F', '#6F1D55', '#62259D',
    '#FF6319', '#2850AD', '#6CBE45', '#FCCC0A', '#CCCCCC',
    '#B933AD', '#996633', '#0078D4', '#17B890', '#7B208B'
];

/**
 * Positions the color palette dropdown with a fixed layout in the viewport.
 * This prevents clipping inside container elements that have hidden overflow.
 * 
 * @param {HTMLElement} triggerEl - The element that triggers the dropdown.
 * @param {HTMLElement} menuEl - The dropdown menu element to be positioned.
 */
export function positionMetroPaletteDropdown(triggerEl, menuEl) {
    if (!triggerEl || !menuEl) return;
    const margin = 8;
    const rect = triggerEl.getBoundingClientRect();
    
    // Fallback estimates for dimensions if the menu is not yet fully rendered
    const estW = 6 * 32 + 5 * 3 + 12 + 2 * 6;
    const estH = 6 * 32 + 5 * 3 + 12 + 2 * 6;
    
    let w = menuEl.offsetWidth;
    let h = menuEl.offsetHeight;
    if (w < 40) w = estW;
    if (h < 40) h = estH;
    
    // Align the right edge of the menu with the right edge of the trigger
    let left = rect.right - w;
    // Constrain horizontally within the viewport bounds
    left = Math.max(margin, Math.min(left, window.innerWidth - w - margin));
    
    // Default vertical placement: below the trigger
    let top = rect.bottom + 4;
    
    // Flip to above the trigger if there is insufficient space below
    if (top + h > window.innerHeight - margin) {
        top = rect.top - h - 4;
    }
    // Constrain vertically within the viewport bounds to ensure visibility
    top = Math.max(margin, Math.min(top, window.innerHeight - h - margin));
    
    menuEl.style.position = 'fixed';
    menuEl.style.left = `${Math.round(left)}px`;
    menuEl.style.top = `${Math.round(top)}px`;
    menuEl.style.right = 'auto';
}

if (typeof window !== 'undefined') {
    window.metrovizPositionPalette = positionMetroPaletteDropdown;
}
