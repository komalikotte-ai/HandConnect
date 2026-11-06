"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
    path.join(__dirname, "../js/keyboard-shortcuts.js"),
    "utf8"
);

// ==========================================
// MOCK DOM ELEMENTS
// ==========================================

class HTMLElement {
    constructor(options = {}) {
        this.disabled = options.disabled || false;
        this.isContentEditable = options.isContentEditable || false;
        this.matchesTypingSelector = options.matchesTypingSelector || false;
        this.clickCount = 0;
    }

    click() {
        this.clickCount++;
    }

    closest() {
        return this.matchesTypingSelector ? this : null;
    }
}

// ==========================================
// TEST ENVIRONMENT
// ==========================================

function createHarness(options = {}) {
    const elements = {
        undoDrawing: options.undoButton === false
            ? null
            : new HTMLElement({
                disabled: options.undoDisabled || false
            }),

        redoDrawing: options.redoButton === false
            ? null
            : new HTMLElement({
                disabled: options.redoDisabled || false
            })
    };

    const tools = {};

    for (const tool of [
        "brush",
        "eraser",
        "line",
        "rectangle",
        "circle"
    ]) {
        tools[tool] = new HTMLElement();
    }

    if (options.missingTool) {
        delete tools[options.missingTool];
    }

    let keydownHandler = null;
    const queries = [];

    const document = {
        getElementById(id) {
            return elements[id] || null;
        },

        querySelector(selector) {
            queries.push(selector);

            const match = selector.match(
                /\.tool-btn\[data-tool="(.+)"\]/
            );

            if (!match) {
                return null;
            }

            return tools[match[1]] || null;
        },

        addEventListener(eventName, callback) {
            if (eventName === "keydown") {
                keydownHandler = callback;
            }
        }
    };

    vm.runInNewContext(source, {
        document,
        HTMLElement
    });

    function dispatchKey(options = {}) {
        const event = {
            key: options.key || "",
            ctrlKey: options.ctrlKey || false,
            metaKey: options.metaKey || false,
            shiftKey: options.shiftKey || false,
            altKey: options.altKey || false,
            repeat: options.repeat || false,
            target: options.target || new HTMLElement(),
            defaultPrevented: false,

            preventDefault() {
                this.defaultPrevented = true;
            }
        };

        keydownHandler(event);

        return event;
    }

    return {
        elements,
        tools,
        queries,
        dispatchKey
    };
}

// ==========================================
// DRAWING TOOL SHORTCUT TESTS
// ==========================================

const toolCases = [
    ["b", "brush"],
    ["e", "eraser"],
    ["l", "line"],
    ["r", "rectangle"],
    ["c", "circle"]
];

for (const [key, tool] of toolCases) {
    test(`selects ${tool} when pressing ${key.toUpperCase()}`, () => {
        const app = createHarness();

        const event = app.dispatchKey({ key });

        assert.equal(app.tools[tool].clickCount, 1);
        assert.equal(event.defaultPrevented, true);
    });
}

test("supports uppercase drawing tool shortcuts", () => {
    const app = createHarness();

    app.dispatchKey({ key: "B" });

    assert.equal(app.tools.brush.clickCount, 1);
});

test("does nothing when the requested tool button is missing", () => {
    const app = createHarness({
        missingTool: "brush"
    });

    const event = app.dispatchKey({ key: "b" });

    assert.equal(event.defaultPrevented, true);
    assert.equal(app.tools.brush, undefined);
});

// ==========================================
// UNDO TESTS
// ==========================================

test("Ctrl+Z triggers undo", () => {
    const app = createHarness();

    const event = app.dispatchKey({
        key: "z",
        ctrlKey: true
    });

    assert.equal(app.elements.undoDrawing.clickCount, 1);
    assert.equal(event.defaultPrevented, true);
});

test("Command+Z triggers undo", () => {
    const app = createHarness();

    app.dispatchKey({
        key: "z",
        metaKey: true
    });

    assert.equal(app.elements.undoDrawing.clickCount, 1);
});

test("does not trigger undo when the undo button is disabled", () => {
    const app = createHarness({
        undoDisabled: true
    });

    const event = app.dispatchKey({
        key: "z",
        ctrlKey: true
    });

    assert.equal(app.elements.undoDrawing.clickCount, 0);
    assert.equal(event.defaultPrevented, true);
});

// ==========================================
// REDO TESTS
// ==========================================

test("Ctrl+Y triggers redo", () => {
    const app = createHarness();

    const event = app.dispatchKey({
        key: "y",
        ctrlKey: true
    });

    assert.equal(app.elements.redoDrawing.clickCount, 1);
    assert.equal(event.defaultPrevented, true);
});

test("Ctrl+Shift+Z triggers redo", () => {
    const app = createHarness();

    app.dispatchKey({
        key: "z",
        ctrlKey: true,
        shiftKey: true
    });

    assert.equal(app.elements.redoDrawing.clickCount, 1);
});

test("Command+Shift+Z triggers redo", () => {
    const app = createHarness();

    app.dispatchKey({
        key: "z",
        metaKey: true,
        shiftKey: true
    });

    assert.equal(app.elements.redoDrawing.clickCount, 1);
});

test("does not trigger redo when the redo button is disabled", () => {
    const app = createHarness({
        redoDisabled: true
    });

    const event = app.dispatchKey({
        key: "y",
        ctrlKey: true
    });

    assert.equal(app.elements.redoDrawing.clickCount, 0);
    assert.equal(event.defaultPrevented, true);
});

test("Ctrl+Shift+Z does not trigger redo when the redo button is disabled", () => {
    const app = createHarness({
        redoDisabled: true
    });

    app.dispatchKey({
        key: "z",
        ctrlKey: true,
        shiftKey: true
    });

    assert.equal(app.elements.redoDrawing.clickCount, 0);
});

// ==========================================
// TYPING TARGET TESTS
// ==========================================

const typingTargets = [
    "input",
    "textarea",
    "select",
    "contenteditable",
    "textbox"
];

for (const targetType of typingTargets) {
    test(`ignores shortcuts when typing in ${targetType}`, () => {
        const app = createHarness();

        const target = new HTMLElement({
            isContentEditable: targetType === "contenteditable",
            matchesTypingSelector: targetType !== "contenteditable"
        });

        const event = app.dispatchKey({
            key: "b",
            target
        });

        assert.equal(app.tools.brush.clickCount, 0);
        assert.equal(event.defaultPrevented, false);
    });
}

test("ignores undo shortcuts when typing in an input", () => {
    const app = createHarness();

    const target = new HTMLElement({
        matchesTypingSelector: true
    });

    app.dispatchKey({
        key: "z",
        ctrlKey: true,
        target
    });

    assert.equal(app.elements.undoDrawing.clickCount, 0);
});

// ==========================================
// REPEATED KEY TESTS
// ==========================================

test("ignores repeated drawing tool key events", () => {
    const app = createHarness();

    const event = app.dispatchKey({
        key: "b",
        repeat: true
    });

    assert.equal(app.tools.brush.clickCount, 0);
    assert.equal(event.defaultPrevented, false);
});

test("ignores repeated undo key events", () => {
    const app = createHarness();

    app.dispatchKey({
        key: "z",
        ctrlKey: true,
        repeat: true
    });

    assert.equal(app.elements.undoDrawing.clickCount, 0);
});

// ==========================================
// ALT AND UNRELATED KEY TESTS
// ==========================================

test("does not intercept Alt-modified drawing shortcuts", () => {
    const app = createHarness();

    const event = app.dispatchKey({
        key: "b",
        altKey: true
    });

    assert.equal(app.tools.brush.clickCount, 0);
    assert.equal(event.defaultPrevented, false);
});

test("ignores unrelated keyboard keys", () => {
    const app = createHarness();

    const event = app.dispatchKey({
        key: "x"
    });

    assert.equal(event.defaultPrevented, false);

    for (const tool of Object.values(app.tools)) {
        assert.equal(tool.clickCount, 0);
    }
});

test("does not trigger drawing tools when a modifier key is pressed", () => {
    const app = createHarness();

    app.dispatchKey({
        key: "b",
        ctrlKey: true
    });

    assert.equal(app.tools.brush.clickCount, 0);
});

test("does not intercept Alt-modified undo shortcuts", () => {
    const app = createHarness();

    app.dispatchKey({
        key: "b",
        altKey: true
    });

    assert.equal(app.tools.brush.clickCount, 0);
});