export const colors = {
    "light":         "#2a2a2a",
    "white":         "#d4d4d4",
    "dark":          "#1a1a1a",
    "primary":       "#539796",
    "secondary":     "#005f48",
    "info":          "#b18aea",
    "success":       "#00b6ff",
    "warning":       "#ffb94e",
    "danger":        "#ff8800",
    "border-color":  "#539796",
}

export function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? "rgb(" + parseInt(result[1], 16) + ", " + parseInt(result[2], 16) + ", " + parseInt(result[3], 16) + ")" : null;
}
