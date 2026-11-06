
function fingerIsExtended(lm, tip, pip) {
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

// Gesture stabilization
const GESTURE_STABILITY_MS = 180;

let candidateGesture = null;
let candidateSince = 0;
let stableGesture = null;

function resetGestureState() {
    candidateGesture = null;
    candidateSince = 0;
    stableGesture = null;
}

function updateGestureState(lm, now = performance.now()) {
    if (!lm) {
        resetGestureState();

        return {
            gesture: "-",
            rawGesture: null,
            canDraw: false
        };
    }

    const rawGesture = detectGesture(lm);

    if (rawGesture !== candidateGesture) {
        candidateGesture = rawGesture;
        candidateSince = now;
    }

    if (now - candidateSince >= GESTURE_STABILITY_MS) {
        stableGesture = candidateGesture;
    }

    const isStable = stableGesture === rawGesture;

    return {
        gesture: isStable ? stableGesture : "Detecting...",
        rawGesture,
        canDraw: isStable && stableGesture === "Point"
    };
}
