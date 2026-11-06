"use strict";

(() => {
    const DATABASE_NAME = "HandConnectDB";
    const STORE_NAME = "drawings";
    const DRAWING_KEY = "currentDrawing";

    let databasePromise = null;
    let operationQueue = Promise.resolve();

    function openDatabase() {
        if (databasePromise) {
            return databasePromise;
        }

        databasePromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DATABASE_NAME, 1);

            request.onupgradeneeded = () => {
                const database = request.result;

                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    database.createObjectStore(STORE_NAME);
                }
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                databasePromise = null;
                reject(request.error);
            };
        });

        return databasePromise;
    }

    // Keep storage operations in order to prevent an old save
    // from overwriting a newer save or a Clear operation.
    function enqueue(operation) {
        const result = operationQueue.then(operation);

        operationQueue = result.catch(error => {
            console.error("HandConnect storage error:", error);
        });

        return result;
    }

    function saveDrawing(canvas) {
        return enqueue(async () => {
            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob(result => {
                    if (result) {
                        resolve(result);
                    } else {
                        reject(new Error("Could not create drawing image."));
                    }
                }, "image/png");
            });

            const database = await openDatabase();

            return new Promise((resolve, reject) => {
                const transaction = database.transaction(
                    STORE_NAME,
                    "readwrite"
                );

                transaction.objectStore(STORE_NAME).put(
                    {
                        image: blob,
                        width: canvas.width,
                        height: canvas.height,
                        savedAt: Date.now()
                    },
                    DRAWING_KEY
                );

                transaction.oncomplete = () => resolve(true);

                transaction.onerror = () => {
                    reject(transaction.error);
                };

                transaction.onabort = () => {
                    reject(transaction.error);
                };
            });
        });
    }

    function loadDrawing() {
        return enqueue(async () => {
            const database = await openDatabase();

            return new Promise((resolve, reject) => {
                const transaction = database.transaction(
                    STORE_NAME,
                    "readonly"
                );

                const request = transaction
                    .objectStore(STORE_NAME)
                    .get(DRAWING_KEY);

                request.onsuccess = () => {
                    resolve(request.result || null);
                };

                request.onerror = () => {
                    reject(request.error);
                };
            });
        });
    }

    function clearDrawing() {
        return enqueue(async () => {
            const database = await openDatabase();

            return new Promise((resolve, reject) => {
                const transaction = database.transaction(
                    STORE_NAME,
                    "readwrite"
                );

                transaction.objectStore(STORE_NAME).delete(DRAWING_KEY);

                transaction.oncomplete = () => resolve(true);

                transaction.onerror = () => {
                    reject(transaction.error);
                };

                transaction.onabort = () => {
                    reject(transaction.error);
                };
            });
        });
    }

    window.DrawingStorage = {
        saveDrawing,
        loadDrawing,
        clearDrawing
    };
})();