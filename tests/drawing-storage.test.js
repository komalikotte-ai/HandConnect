
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// ==========================================
// LOAD STORAGE SOURCE
// ==========================================

const storageSource = fs.readFileSync(
    path.join(__dirname, "../js/drawing-storage.js"),
    "utf8"
);

// ==========================================
// MOCK INDEXEDDB
// ==========================================

function createIndexedDB(options = {}) {
    const records = new Map();
    const stores = new Set();
    let openCalls = 0;

    function open(databaseName, version) {
        openCalls++;

        const request = {};

        queueMicrotask(() => {
            if (options.failOpen) {
                request.error = new Error("Database open failed.");
                request.onerror?.();
                return;
            }

            const database = {
                objectStoreNames: {
                    contains(name) {
                        return stores.has(name);
                    }
                },

                createObjectStore(name) {
                    stores.add(name);
                    return {};
                },

                transaction(storeName, mode) {
                    if (!stores.has(storeName)) {
                        throw new Error("Object store does not exist.");
                    }

                    const transaction = {
                        error: null,
                        oncomplete: null,
                        onerror: null,
                        onabort: null,

                        objectStore() {
                            return {
                                put(value, key) {
                                    queueMicrotask(() => {
                                        if (options.failWrite) {
                                            transaction.error = new Error(
                                                "Storage write failed."
                                            );

                                            transaction.onerror?.();
                                            transaction.onabort?.();
                                            return;
                                        }

                                        records.set(key, value);
                                        transaction.oncomplete?.();
                                    });
                                },

                                get(key) {
                                    const getRequest = {};

                                    queueMicrotask(() => {
                                        getRequest.result =
                                            records.get(key);

                                        getRequest.onsuccess?.();
                                    });

                                    return getRequest;
                                },

                                delete(key) {
                                    queueMicrotask(() => {
                                        records.delete(key);
                                        transaction.oncomplete?.();
                                    });
                                }
                            };
                        }
                    };

                    return transaction;
                }
            };

            request.result = database;

            if (!stores.has("drawings")) {
                request.onupgradeneeded?.();
            }

            request.onsuccess?.();
        });

        return request;
    }

    return {
        open,
        records,
        get openCalls() {
            return openCalls;
        }
    };
}

// ==========================================
// TEST ENVIRONMENT
// ==========================================

function createStorageEnvironment(options = {}) {
    const indexedDB = createIndexedDB(options);
    const errors = [];

    const window = {};

    const context = vm.createContext({
        window,
        indexedDB,
        console: {
            error(...args) {
                errors.push(args);
            }
        },
        Date,
        Promise,
        Error
    });

    vm.runInContext(storageSource, context);

    return {
        storage: window.DrawingStorage,
        indexedDB,
        errors
    };
}

// ==========================================
// MOCK CANVAS
// ==========================================

function createMockCanvas(options = {}) {
    return {
        width: options.width || 800,
        height: options.height || 600,

        toBlob(callback, mimeType) {
            if (options.failBlob) {
                callback(null);
                return;
            }

            callback({
                type: mimeType,
                size: 1024,
                mockImage: true
            });
        }
    };
}

// ==========================================
// SAVE TESTS
// ==========================================

test("saves a canvas drawing to IndexedDB", async () => {
    const { storage, indexedDB } = createStorageEnvironment();

    const canvas = createMockCanvas();

    const result = await storage.saveDrawing(canvas);

    assert.equal(result, true);

    const saved = indexedDB.records.get("currentDrawing");

    assert.ok(saved);
    assert.equal(saved.width, 800);
    assert.equal(saved.height, 600);
    assert.equal(saved.image.type, "image/png");
    assert.equal(typeof saved.savedAt, "number");
});

test("saves canvas dimensions correctly", async () => {
    const { storage, indexedDB } = createStorageEnvironment();

    const canvas = createMockCanvas({
        width: 1200,
        height: 900
    });

    await storage.saveDrawing(canvas);

    const saved = indexedDB.records.get("currentDrawing");

    assert.equal(saved.width, 1200);
    assert.equal(saved.height, 900);
});

test("rejects saving when canvas image creation fails", async () => {
    const { storage } = createStorageEnvironment();

    const canvas = createMockCanvas({
        failBlob: true
    });

    await assert.rejects(
        storage.saveDrawing(canvas),
        /Could not create drawing image/
    );
});

// ==========================================
// LOAD TESTS
// ==========================================

test("loads a previously saved drawing", async () => {
    const { storage, indexedDB } = createStorageEnvironment();

    const canvas = createMockCanvas();

    await storage.saveDrawing(canvas);

    const result = await storage.loadDrawing();

    assert.ok(result);
    assert.equal(result.width, 800);
    assert.equal(result.height, 600);
    assert.equal(result.image.type, "image/png");
});

test("returns null when no drawing exists", async () => {
    const { storage } = createStorageEnvironment();

    const result = await storage.loadDrawing();

    assert.equal(result, null);
});

// ==========================================
// CLEAR TESTS
// ==========================================

test("clears the saved drawing from IndexedDB", async () => {
    const { storage, indexedDB } = createStorageEnvironment();

    await storage.saveDrawing(createMockCanvas());

    assert.ok(indexedDB.records.has("currentDrawing"));

    const result = await storage.clearDrawing();

    assert.equal(result, true);
    assert.equal(
        indexedDB.records.has("currentDrawing"),
        false
    );
});

test("returns null after clearing a drawing", async () => {
    const { storage } = createStorageEnvironment();

    await storage.saveDrawing(createMockCanvas());

    await storage.clearDrawing();

    const result = await storage.loadDrawing();

    assert.equal(result, null);
});

// ==========================================
// OPERATION QUEUE TESTS
// ==========================================

test("executes save and clear operations in order", async () => {
    const { storage, indexedDB } = createStorageEnvironment();

    const savePromise = storage.saveDrawing(createMockCanvas());
    const clearPromise = storage.clearDrawing();

    const results = await Promise.all([
        savePromise,
        clearPromise
    ]);

    assert.deepEqual(results, [true, true]);

    assert.equal(
        indexedDB.records.has("currentDrawing"),
        false
    );
});

test("executes save before a following load operation", async () => {
    const { storage } = createStorageEnvironment();

    const savePromise = storage.saveDrawing(createMockCanvas());
    const loadPromise = storage.loadDrawing();

    await savePromise;

    const result = await loadPromise;

    assert.ok(result);
    assert.equal(result.width, 800);
});

// ==========================================
// DATABASE ERROR TESTS
// ==========================================

test("rejects when IndexedDB cannot open the database", async () => {
    const { storage, errors } = createStorageEnvironment({
        failOpen: true
    });

    await assert.rejects(
        storage.loadDrawing(),
        /Database open failed/
    );

    assert.equal(errors.length, 1);
});

test("rejects when an IndexedDB write fails", async () => {
    const { storage, errors } = createStorageEnvironment({
        failWrite: true
    });

    await assert.rejects(
        storage.saveDrawing(createMockCanvas()),
        /Storage write failed/
    );

    assert.equal(errors.length, 1);
});

// ==========================================
// DATABASE CONNECTION TEST
// ==========================================

test("reuses the existing database connection", async () => {
    const { storage, indexedDB } = createStorageEnvironment();

    await storage.loadDrawing();
    await storage.loadDrawing();
    await storage.saveDrawing(createMockCanvas());

    assert.equal(indexedDB.openCalls, 1);
});
