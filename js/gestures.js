
function fingerIsExtended(lm, tip, pip) {
    // Compare fingertip and middle joint relative to the wrist.
    // This is a simple heuristic for a roughly upright hand.
    return Math.hypot(
        lm[tip].x - lm[0].x,
        lm[tip].y - lm[0].y
    ) > Math.hypot(
        lm[pip].x - lm[0].x,
        lm[pip].y - lm[0].y
    );
}

function isIndexFingerPointing(lm) {
    const indexExtended = fingerIsExtended(lm, 8, 6);

    const middleFolded = !fingerIsExtended(lm, 12, 10);
    const ringFolded = !fingerIsExtended(lm, 16, 14);
    const pinkyFolded = !fingerIsExtended(lm, 20, 18);

    return (
        indexExtended &&
        middleFolded &&
        ringFolded &&
        pinkyFolded
    );
}

function detectGesture(lm) {
    const distance = (a, b) =>
        Math.hypot(
            lm[a].x - lm[b].x,
            lm[a].y - lm[b].y
        );

    const openFingers = [8, 12, 16, 20].filter(
        tip => fingerIsExtended(lm, tip, tip - 2)
    ).length;

    if (distance(4, 8) < 0.05) return "Pinch";
    if (openFingers >= 4) return "Open Hand";
    if (openFingers === 0) return "Fist";
    if (isIndexFingerPointing(lm)) return "Point";

    return "Partial";
}
