
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    createEventTarget,
    createCanvasContext,
    createElement,
    createDocument,
    createWindow
} = require("./helpers/browser-mocks");

test("event target registers and dispatches events", () => {
    const target = createEventTarget();
    let called = false;

    target.addEventListener("click", () => {
        called = true;
    });

    target.dispatchEvent({ type: "click" });

    assert.equal(called, true);
});

test("event target removes registered listeners", () => {
    const target = createEventTarget();
    const callback = () => {};

    target.addEventListener("click", callback);
    target.removeEventListener("click", callback);

    assert.equal(target.listenerCount("click"), 0);
});

test("canvas mock records drawing operations", () => {
    const context = createCanvasContext();

    context.beginPath();
    context.moveTo(10, 20);
    context.lineTo(30, 40);
    context.stroke();

    assert.equal(context.operations.length, 4);
    assert.equal(context.operations[1].method, "moveTo");
    assert.deepEqual(context.operations[1].args, [10, 20]);
});

test("canvas element provides a 2D context", () => {
    const canvas = createElement("canvas");

    assert.equal(typeof canvas.getContext, "function");
    assert.ok(canvas.getContext("2d"));
    assert.equal(typeof canvas.toDataURL, "function");
});

test("document mock returns consistent elements by ID", () => {
    const document = createDocument();

    const first = document.getElementById("video");
    const second = document.getElementById("video");

    assert.equal(first, second);
    assert.equal(first.id, "video");
});

test("window mock provides browser dimensions", () => {
    const window = createWindow();

    assert.equal(window.innerWidth, 1280);
    assert.equal(window.innerHeight, 720);
    assert.equal(typeof window.addEventListener, "function");
});
