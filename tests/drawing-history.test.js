
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// ==========================================
// BROWSER MOCKS
// ==========================================

function createEventTarget() {
    const listeners = {};

    return {
        disabled: false,
        value: "",
        textContent: "",
        clientWidth: 640,
        clientHeight: 480,
        dataset: {},
        style: {},

        classList: {
            toggle() {},
            add() {},
            remove() {}
        },

        addEventListener(type, callback) {
            if (!listeners[type]) {
                listeners[type] = [];
            }

            listeners[type].push(callback);
        },

        removeEventListener(type, callback) {
            if (!listeners[type]) return;

            listeners[type] = listeners[type].filter(
                listener => listener !== callback
            );
        },

        dispatchEvent(type) {
            (listeners[type] || []).forEach(callback => callback());
        },

        setAttribute() {},
        removeAttribute() {}
    };
}

function createCanvas() {
    const operations = [];

    const context = {
        operations,

        clearRect(...args) {
            operations.push({
                method: "clearRect",
                args
            });
        },

        drawImage(...args) {
            operations.push({
                method: "drawImage",
                args
            });
        },

        save() {},
        restore() {},
        beginPath() {},
        closePath() {},
        moveTo() {},
        lineTo() {},
        stroke() {},
        rect() {},
        arc() {},
        fill() {},
        fillRect() {},
        strokeRect() {},
        setLineDash() {}
    };

    return {
        width: 640,
        height: 480,
        clientWidth: 640,
        clientHeight: 480,
        operations,

        getContext() {
            return context;
        },

        toDataURL() {
            return "data:image/png;base64,test";
        }
    };
}

// ==========================================
// TEST HARNESS
// ==========================================

function createHarness() {
    const elements = new Map();
    const savedDrawings = {
        saveCalls: 0,
        clearCalls: 0
    };

    const windowTarget = createEventTarget();

    windowTarget.DrawingStorage = {
        saveDrawing() {
            savedDrawings.saveCalls++;
            return Promise.resolve();
        },

        clearDrawing() {
            savedDrawings.clearCalls++;
            return Promise.resolve();
        },

        loadDrawing() {
            return Promise.resolve(null);
        }
    };

    const document = {
        getElementById(id) {
            if (!elements.has(id)) {
                let element;

                if (id === "canvas" || id === "drawingCanvas") {
                    element = createCanvas();
                } else {
                    element = createEventTarget();
                }

                if (id === "brushSize") {
                    element.value = "5";
                }

                if (id === "brushColor") {
                    element.value = "#000000";
                }

                elements.set(id, element);
            }

            return elements.get(id);
        },

        querySelectorAll() {
            return [];
        },

        querySelector() {
            return null;
        },

        createElement(tagName) {
            if (tagName === "canvas") {
                return createCanvas();
            }

            return createEventTarget();
        },

        addEventListener() {},
        removeEventListener() {}
    };

    const sourcePath = path.join(
        __dirname,
        "..",
        "js",
        "hand-tracking.js"
    );

    let source = fs.readFileSync(sourcePath, "utf8");

    // Expose selected internal functions only to this test environment.
    source += `

globalThis.historyTest = {
    beginCurrentStroke,
    finishCurrentStroke,
    undoCanvas,
    redoCanvas,
    clearCanvas,
    resizeCanvas,
    drawFreehand,
    updateHistoryButtons,

    getUndoStack: () => undoStack,
    getRedoStack: () => redoStack,
    getDrawingCanvas: () => drawingCanvas,

    getCurrentStrokeSnapshot: () => currentStrokeSnapshot,
    getCurrentStrokeHasDrawn: () => currentStrokeHasDrawn,

    setCurrentStrokeHasDrawn: value => {
        currentStrokeHasDrawn = value;
    },

    setPreviousDrawPoint: value => {
        previousDrawPoint = value;
    }
};
`;

    const sandbox = {
        document,
        window: windowTarget,

        console,

        performance: {
            now: () => 1000
        },

        requestAnimationFrame(callback) {
            return 1;
        },

        cancelAnimationFrame() {},

        setTimeout,
        clearTimeout,

        Blob,
        URL,

        Image: class {
            constructor() {
                this.onload = null;
                this.onerror = null;
            }
        },

        Math,
        Date,
        Promise,

        Map,
        Set,
        Array,
        Object,
        Number,
        String,
        Boolean,
        JSON,

        Infinity,
        NaN,

        isFinite,
        parseFloat,
        parseInt
    };

    sandbox.globalThis = sandbox;

    vm.createContext(sandbox);

    vm.runInContext(source, sandbox, {
        filename: "hand-tracking.js"
    });

    return {
        history: sandbox.historyTest,
        elements,
        savedDrawings,
        window: windowTarget
    };
}

// ==========================================
// HISTORY TESTS
// ==========================================

test("beginning a stroke creates one snapshot", () => {
    const { history } = createHarness();

    history.beginCurrentStroke();

    assert.ok(history.getCurrentStrokeSnapshot());
    assert.equal(history.getUndoStack().length, 0);
});

test("beginning an existing stroke does not create another snapshot", () => {
    const { history } = createHarness();

    history.beginCurrentStroke();

    const firstSnapshot = history.getCurrentStrokeSnapshot();

    history.beginCurrentStroke();

    assert.equal(
        history.getCurrentStrokeSnapshot(),
        firstSnapshot
    );
});

test("finishing an unchanged stroke does not add undo history", () => {
    const { history } = createHarness();

    history.beginCurrentStroke();
    history.finishCurrentStroke();

    assert.equal(history.getUndoStack().length, 0);
    assert.equal(history.getCurrentStrokeSnapshot(), null);
});

test("finishing a changed stroke adds one undo snapshot and saves", () => {
    const { history, savedDrawings } = createHarness();

    history.beginCurrentStroke();
    history.setCurrentStrokeHasDrawn(true);
    history.finishCurrentStroke();

    assert.equal(history.getUndoStack().length, 1);
    assert.equal(savedDrawings.saveCalls, 1);
    assert.equal(history.getCurrentStrokeSnapshot(), null);
});

test("undo restores the previous snapshot and enables redo", () => {
    const { history } = createHarness();

    history.beginCurrentStroke();
    history.setCurrentStrokeHasDrawn(true);
    history.finishCurrentStroke();

    const result = history.undoCanvas();

    assert.equal(result, true);
    assert.equal(history.getUndoStack().length, 0);
    assert.equal(history.getRedoStack().length, 1);
});

test("redo restores the snapshot saved by undo", () => {
    const { history } = createHarness();

    history.beginCurrentStroke();
    history.setCurrentStrokeHasDrawn(true);
    history.finishCurrentStroke();

    history.undoCanvas();

    const result = history.redoCanvas();

    assert.equal(result, true);
    assert.equal(history.getUndoStack().length, 1);
    assert.equal(history.getRedoStack().length, 0);
});

test("undo returns false when history is empty", () => {
    const { history } = createHarness();

    assert.equal(history.undoCanvas(), false);
});

test("redo returns false when redo history is empty", () => {
    const { history } = createHarness();

    assert.equal(history.redoCanvas(), false);
});

test("a new drawing action clears redo history", () => {
    const { history } = createHarness();

    history.beginCurrentStroke();
    history.setCurrentStrokeHasDrawn(true);
    history.finishCurrentStroke();

    history.undoCanvas();

    assert.equal(history.getRedoStack().length, 1);

    history.beginCurrentStroke();
    history.setCurrentStrokeHasDrawn(true);
    history.finishCurrentStroke();

    assert.equal(history.getRedoStack().length, 0);
});

test("undo and redo save the updated drawing", () => {
    const { history, savedDrawings } = createHarness();

    history.beginCurrentStroke();
    history.setCurrentStrokeHasDrawn(true);
    history.finishCurrentStroke();

    const savesBeforeUndo = savedDrawings.saveCalls;

    history.undoCanvas();

    assert.ok(savedDrawings.saveCalls > savesBeforeUndo);

    const savesBeforeRedo = savedDrawings.saveCalls;

    history.redoCanvas();

    assert.ok(savedDrawings.saveCalls > savesBeforeRedo);
});

test("undo commits an active changed stroke before undoing", () => {
    const { history } = createHarness();

    history.beginCurrentStroke();
    history.setCurrentStrokeHasDrawn(true);

    const result = history.undoCanvas();

    assert.equal(result, true);
    assert.equal(history.getUndoStack().length, 0);
    assert.equal(history.getRedoStack().length, 1);
    assert.equal(history.getCurrentStrokeSnapshot(), null);
});

test("history is limited to 20 snapshots", () => {
    const { history } = createHarness();

    for (let i = 0; i < 25; i++) {
        history.beginCurrentStroke();
        history.setCurrentStrokeHasDrawn(true);
        history.finishCurrentStroke();
    }

    assert.equal(history.getUndoStack().length, 20);
});

test("clear removes history and saved drawing", () => {
    const { history, savedDrawings } = createHarness();

    history.beginCurrentStroke();
    history.setCurrentStrokeHasDrawn(true);
    history.finishCurrentStroke();

    history.clearCanvas();

    assert.equal(history.getUndoStack().length, 0);
    assert.equal(history.getRedoStack().length, 0);
    assert.equal(savedDrawings.clearCalls, 1);
});

test("clearing an active stroke resets its state", () => {
    const { history } = createHarness();

    history.beginCurrentStroke();
    history.setCurrentStrokeHasDrawn(true);

    history.clearCanvas();

    assert.equal(history.getCurrentStrokeSnapshot(), null);
    assert.equal(history.getCurrentStrokeHasDrawn(), false);
    assert.equal(history.getUndoStack().length, 0);
});

test("resizing the canvas resets history", () => {
    const { history } = createHarness();

    history.beginCurrentStroke();
    history.setCurrentStrokeHasDrawn(true);
    history.finishCurrentStroke();

    assert.equal(history.getUndoStack().length, 1);

    history.resizeCanvas();

    assert.equal(history.getUndoStack().length, 0);
    assert.equal(history.getRedoStack().length, 0);
});

test("resizing preserves canvas dimensions from video", () => {
    const { history } = createHarness();

    history.resizeCanvas();

    const canvas = history.getDrawingCanvas();

    assert.equal(canvas.width, 640);
    assert.equal(canvas.height, 480);
});
