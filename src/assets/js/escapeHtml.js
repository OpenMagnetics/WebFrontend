// Escapes a value for interpolation into an HTML string (text or a quoted
// attribute). Anything that is not a string is stringified first, so numbers
// and enum values pass through unchanged apart from the escaping.
const HTML_ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

export function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}
