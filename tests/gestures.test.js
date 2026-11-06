
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gestureSource = fs.readFileSync(
    path.join(__dirname, "../js/gestures.js"),
    "utf8"
);

function createGestureEnvironment() {
    const context = vm.createContext({
        performance: {
            now: () => 0
        }
    });

    const testableSource = gestureSource + `

        globalThis.gestureTestAPI = {
            fingerIsExtended,
            detectGesture,
            resetGestureState,
            updateGestureState
        };
    `;

    vm.runInContext(testableSource, context);

    return context.gestureTestAPI;
}

function createLandmarks() {
    return Array.from(
        { length: 21 },
        () => ({ x: 0, y: 0 })
    );
}

// Extended: fingertip is farther from wrist than PIP.
function setExtendedFinger(lm, pip, tip) {
    lm[pip] = { x: 0, y: 0.2 };
    lm[tip] = { x: 0, y: 0.4 };
}

// Folded: fingertip is closer to wrist than PIP.
function setFoldedFinger(lm, pip, tip) {
    lm[pip] = { x: 0, y: 0.7 };
    lm[tip] = { x: 0, y: 0.5 };
}

function createPointGesture() {
    const lm = createLandmarks();

    setExtendedFinger(lm, 6, 8);
    setFoldedFinger(lm, 10, 12);
    setFoldedFinger(lm, 14, 16);
    setFoldedFinger(lm, 18, 20);

    lm[4] = { x: 0.9, y: 0.9 };

    return lm;
}

function createOpenHandGesture() {
    const lm = createLandmarks();

    lm[4] = { x: 0.9, y: 0.9 };

    setExtendedFinger(lm, 6, 8);
    setExtendedFinger(lm, 10, 12);
    setExtendedFinger(lm, 14, 16);
    setExtendedFinger(lm, 18, 20);

    return lm;
}

function createFistGesture() {
    const lm = createLandmarks();

    lm[4] = { x: 0.9, y: 0.9 };

    setFoldedFinger(lm, 6, 8);
    setFoldedFinger(lm, 10, 12);
    setFoldedFinger(lm, 14, 16);
    setFoldedFinger(lm, 18, 20);

    return lm;
}

function createUndoGesture() {
    const lm = createLandmarks();

    lm[4] = { x: 0.5, y: 0.5 };
    lm[8] = { x: 0.51, y: 0.5 };
    lm[12] = { x: 0.9, y: 0.9 };

    return lm;
}

function createRedoGesture() {
    const lm = createLandmarks();

    lm[4] = { x: 0.5, y: 0.5 };
    lm[8] = { x: 0.9, y: 0.9 };
    lm[12] = { x: 0.51, y: 0.5 };

    return lm;
}

function createPartialGesture() {
    const lm = createLandmarks();

    lm[4] = { x: 0.9, y: 0.9 };

    setExtendedFinger(lm, 6, 8);
    setExtendedFinger(lm, 10, 12);
    setFoldedFinger(lm, 14, 16);
    setFoldedFinger(lm, 18, 20);

    return lm;
}

// ==========================================
// GESTURE CLASSIFICATION TESTS
// ==========================================

test("detects index finger pointing gesture", () => {
    const api = createGestureEnvironment();

    assert.equal(
        api.detectGesture(createPointGesture()),
        "Point"
    );
});

test("detects open palm gesture", () => {
    const api = createGestureEnvironment();

    assert.equal(
        api.detectGesture(createOpenHandGesture()),
        "Open Hand"
    );
});

test("detects thumb and index pinch as Undo", () => {
    const api = createGestureEnvironment();

    assert.equal(
        api.detectGesture(createUndoGesture()),
        "Undo"
    );
});

test("detects thumb and middle pinch as Redo", () => {
    const api = createGestureEnvironment();

    assert.equal(
        api.detectGesture(createRedoGesture()),
        "Redo"
    );
});

test("detects closed fist gesture", () => {
    const api = createGestureEnvironment();

    assert.equal(
        api.detectGesture(createFistGesture()),
        "Fist"
    );
});

test("detects partially extended fingers", () => {
    const api = createGestureEnvironment();

    assert.equal(
        api.detectGesture(createPartialGesture()),
        "Partial"
    );
});

test("rejects missing or incomplete landmark data", () => {
    const api = createGestureEnvironment();

    assert.equal(api.detectGesture(null), null);
    assert.equal(api.detectGesture([]), null);
    assert.equal(
        api.detectGesture(createLandmarks().slice(0, 20)),
        null
    );
});

// ==========================================
// FINGER DETECTION TESTS
// ==========================================

test("identifies an extended finger", () => {
    const api = createGestureEnvironment();
    const lm = createLandmarks();

    setExtendedFinger(lm, 6, 8);

    assert.equal(
        api.fingerIsExtended(lm, 8, 6),
        true
    );
});

test("identifies a folded finger", () => {
    const api = createGestureEnvironment();
    const lm = createLandmarks();

    setFoldedFinger(lm, 6, 8);

    assert.equal(
        api.fingerIsExtended(lm, 8, 6),
        false
    );
});

// ==========================================
// GESTURE STABILIZATION TESTS
// ==========================================

test("does not accept a gesture before 180 ms", () => {
    const api = createGestureEnvironment();
    const point = createPointGesture();

    const result = api.updateGestureState(point, 100);

    assert.equal(result.rawGesture, "Point");
    assert.equal(result.gesture, "Detecting...");
    assert.equal(result.canDraw, false);
});

test("accepts a gesture after 180 ms of stability", () => {
    const api = createGestureEnvironment();
    const point = createPointGesture();

    api.updateGestureState(point, 100);

    const result = api.updateGestureState(point, 280);

    assert.equal(result.gesture, "Point");
    assert.equal(result.canDraw, true);
});

test("does not stabilize a gesture before the required duration", () => {
    const api = createGestureEnvironment();
    const point = createPointGesture();

    api.updateGestureState(point, 100);

    const result = api.updateGestureState(point, 279);

    assert.equal(result.gesture, "Detecting...");
    assert.equal(result.canDraw, false);
});

test("restarts stabilization when the gesture changes", () => {
    const api = createGestureEnvironment();

    const point = createPointGesture();
    const openHand = createOpenHandGesture();

    api.updateGestureState(point, 100);
    api.updateGestureState(point, 280);

    const changed = api.updateGestureState(openHand, 300);

    assert.equal(changed.rawGesture, "Open Hand");
    assert.equal(changed.gesture, "Detecting...");
    assert.equal(changed.canDraw, false);
});

test("allows drawing only for a stable Point gesture", () => {
    const api = createGestureEnvironment();
    const point = createPointGesture();

    api.updateGestureState(point, 100);

    const result = api.updateGestureState(point, 280);

    assert.equal(result.canDraw, true);
});

test("does not allow drawing for a stable Open Hand gesture", () => {
    const api = createGestureEnvironment();
    const openHand = createOpenHandGesture();

    api.updateGestureState(openHand, 100);

    const result = api.updateGestureState(openHand, 280);

    assert.equal(result.gesture, "Open Hand");
    assert.equal(result.canDraw, false);
});

test("resets gesture state when landmarks are missing", () => {
    const api = createGestureEnvironment();

    api.updateGestureState(createPointGesture(), 100);

    const result = api.updateGestureState(null, 300);

    assert.equal(result.gesture, "-");
    assert.equal(result.rawGesture, null);
    assert.equal(result.canDraw, false);
});
