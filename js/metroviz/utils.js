/**
 * Escapes HTML characters in a string to prevent XSS attacks when injecting into the DOM.
 * 
 * @param {string} str - The raw string to escape.
 * @returns {string} The escaped string.
 */
export function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Sanitizes an HTML string using DOMPurify if available in the global scope.
 * Serves as a graceful fallback when DOMPurify is not loaded.
 * 
 * @param {string} html - The HTML string to sanitize.
 * @returns {string} The sanitized HTML string.
 */
export function sanitizeHtml(html) {
    if (typeof window !== 'undefined' && window.DOMPurify) {
        return window.DOMPurify.sanitize(html);
    }
    // Minimal fallback if DOMPurify is not available
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
        .replace(/\son\w+="[^"]*"/gi, '')
        .replace(/\son\w+='[^']*'/gi, '')
        .replace(/javascript:/gi, '');
}

/**
 * Sanitizes an SVG string to remove potentially malicious elements (like <script> or <foreignObject>)
 * before exporting, ensuring downloaded SVG files are safe.
 * 
 * @param {string} svgString - The raw SVG string.
 * @returns {string} The sanitized SVG string.
 */
export function sanitizeSvg(svgString) {
    if (typeof window !== 'undefined' && window.DOMPurify) {
        return window.DOMPurify.sanitize(svgString, {
            USE_PROFILES: { svg: true },
            ADD_ATTR: ['xmlns', 'xmlns:xlink']
        });
    }
    return svgString
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '')
        .replace(/\son\w+="[^"]*"/gi, '')
        .replace(/\son\w+='[^']*'/gi, '')
        .replace(/javascript:/gi, '');
}

/**
 * Sanitizes a filename to prevent path traversal and remove potentially dangerous characters.
 * 
 * @param {string} name - The requested filename.
 * @param {string} fallback - The fallback name if the sanitized name is empty.
 * @returns {string} The sanitized filename.
 */
export function sanitizeFilename(name, fallback = 'metroviz-roadmap') {
    if (!name) return fallback;
    const safeName = name.replace(/[^a-zA-Z0-9_\-\säöüßÄÖÜ]/g, '_').trim();
    return safeName || fallback;
}

/**
 * Parses a date string into a Date object, supporting both standard ISO formats
 * and custom quarter-based formats (e.g., "2023-Q1").
 * 
 * @param {string} dateStr - The date string to parse.
 * @param {'null'|'throw'|'now'} [emptyBehavior='null'] - How to handle empty or invalid inputs.
 * @returns {Date|null} The parsed Date object, or null based on emptyBehavior.
 */
export function parseDate(dateStr, emptyBehavior = 'null') {
    if (!dateStr) {
        if (emptyBehavior === 'throw') throw new Error('Invalid date: empty date string is not allowed');
        if (emptyBehavior === 'now') return new Date();
        return null;
    }
    
    // Support custom quarter-based dates (e.g., "2023-Q1") by converting the quarter to its first month
    if (dateStr.includes('-Q')) {
        const [year, q] = dateStr.split('-Q');
        const quarter = parseInt(q);
        if (emptyBehavior === 'throw' && (isNaN(quarter) || quarter < 1 || quarter > 4)) {
            throw new Error(`Invalid quarter format: ${dateStr}`);
        }
        const month = (quarter - 1) * 3; // Q1 -> Month 0 (Jan), Q2 -> Month 3 (Apr), etc.
        return new Date(year, month, 1);
    }
    
    // Robust parsing for strict YYYY-MM-DD (fixes issues in older Safari/iOS versions)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const parts = dateStr.split('-');
        return new Date(parts[0], parseInt(parts[1], 10) - 1, parts[2]);
    }
    
    const date = new Date(dateStr);
    if (emptyBehavior === 'throw' && isNaN(date.getTime())) {
        throw new Error(`Invalid date format: ${dateStr}`);
    }
    return date;
}

/**
 * Triggers a file download in the browser by generating an ephemeral anchor link.
 * 
 * @param {string|Blob|ArrayBuffer} content - The content to be downloaded.
 * @param {string} mime - The MIME type of the file.
 * @param {string} filename - The target filename.
 */
export function downloadBlob(content, mime, filename) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    
    // Simulate a user click on an anchor element to trigger the browser's download prompt
    downloadLink.href = url;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    // Cleanup the DOM and release the object URL to avoid memory leaks
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
}
