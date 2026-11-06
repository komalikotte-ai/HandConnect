
"use strict";

// ==========================================
// GESTURE CONFIGURATION
// ==========================================

const GESTURE_STABILITY_MS = 180;

const PINCH_THRESHOLD = 0.045;
const PINCH_RELEASE_THRESHOLD = 0.065;

// ==========================================
// GESTURE STATE
// ==========================================

let candidateGesture = null;
let candidateSince = 0;
let stableGesture = null;

// ==========================================
// FINGER DETECTION
// ==========================================

function fingerIsExtended(lm, tip, pip) {
    const wristDistance = Math.hypot(
        lm[tip].x - lm[0].x,
        lm[tip].y - lm[0].y
    );

    const jointDistance = Math.hypot(
        lm[pip].x - lm[0].x,
        lm[pip].y - lm[0].y
    );

    return wristDistance > jointDistance;
}

// ==========================================
// GESTURE CLASSIFICATION
// ==========================================

function detectGesture(lm) {
    if (!lm || lm.length < 21) {
        return null;
    }

    const distance = (a, b) =>
        Math.hypot(
            lm[a].x - lm[b].x,
            lm[a].y - lm[b].y
        );

    const thumbIndexDistance = distance(4, 8);
    const thumbMiddleDistance = distance(4, 12);

    // Undo: thumb and index finger pinch.
    if (
        thumbIndexDistance < PINCH_THRESHOLD &&
        thumbMiddleDistance > PINCH_RELEASE_THRESHOLD
    ) {
        return "Undo";
    }

    // Redo: thumb and middle finger pinch.
    if (
        thumbMiddleDistance < PINCH_THRESHOLD &&
        thumbIndexDistance > PINCH_RELEASE_THRESHOLD
    ) {
        return "Redo";
    }

    const indexExtended = fingerIsExtended(lm, 8, 6);
    const middleExtended = fingerIsExtended(lm, 12, 10);
    const ringExtended = fingerIsExtended(lm, 16, 14);
    const pinkyExtended = fingerIsExtended(lm, 20, 18);

    const extendedCount = [
        indexExtended,
        middleExtended,
        ringExtended,
        pinkyExtended
    ].filter(Boolean).length;

    // Open palm.
    if (extendedCount === 4) {
        return "Open Hand";
    }

    // Index finger pointing.
    if (
        indexExtended &&
        !middleExtended &&
        !ringExtended &&
        !pinkyExtended
    ) {
        return "Point";
    }

    // Closed fist.
    if (extendedCount === 0) {
        return "Fist";
    }

    return "Partial";
}

// ==========================================
// GESTURE STABILIZATION
// ==========================================

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

    if (
        candidateGesture !== null &&
        now - candidateSince >= GESTURE_STABILITY_MS
    ) {
        stableGesture = candidateGesture;
    }

    const isStable = stableGesture === rawGesture;

    return {
        gesture: isStable ? stableGesture : "Detecting...",
        rawGesture,
        canDraw: isStable && stableGesture === "Point"
    };
}
