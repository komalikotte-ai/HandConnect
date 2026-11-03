
function detectGesture(lm) {
    const distance = (a, b) =>
        Math.hypot(
            lm[a].x - lm[b].x,
            lm[a].y - lm[b].y
        );

    const openFingers = [8, 12, 16, 20].filter(
        tip => distance(tip, 0) > distance(tip - 2, 0)
    ).length;

    if (distance(4, 8) < 0.05) return "Pinch";
    if (openFingers >= 4) return "Open Hand";
    if (openFingers === 0) return "Fist";
    if (openFingers === 1) return "Point";

    return "Partial";
}
