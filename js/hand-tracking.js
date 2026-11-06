"use strict";

// ==========================================
// DOM ELEMENTS
// ==========================================

const video = document.getElementById("video");

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const drawingCanvas = document.getElementById("drawingCanvas");
const drawingCtx = drawingCanvas.getContext("2d");

const brushColor = document.getElementById("brushColor");
const brushSize = document.getElementById("brushSize");
const brushSizeValue = document.getElementById("brushSizeValue");

const clearDrawing = document.getElementById("clearDrawing");
const undoDrawing = document.getElementById("undoDrawing");
const redoDrawing = document.getElementById("redoDrawing");

const toolButtons = document.querySelectorAll(".tool-btn");

const handCountElement = document.getElementById("handCount");
const fpsElement = document.getElementById("fps");
const gestureElement = document.getElementById("gesture");
const spreadElement = document.getElementById("spread");

// ==========================================
// TRACKING VARIABLES
// ==========================================

let hands = null;
let camera = null;
let isTracking = false;

const SMOOTHING = 0.45;
const MAX_JUMP_DISTANCE = 100;
const MAX_HISTORY = 20;

let smoothedPoint = null;
let previousDrawPoint = null;
let lastFrameTime = performance.now();

// ==========================================
// DRAWING TOOL VARIABLES
// ==========================================

let selectedTool = "brush";

let undoStack = [];
let redoStack = [];

let currentStrokeSnapshot = null;
let currentStrokeHasDrawn = false;

let shapeStartPoint = null;

// ==========================================
// DRAWING AUTOSAVE AND RECOVERY
// ==========================================

let isRestoringDrawing = false;

function saveCurrentDrawing() {
    if (isRestoringDrawing || !window.DrawingStorage) {
        return;
    }

    window.DrawingStorage.saveDrawing(drawingCanvas)
        .catch(error => {
            console.error(
                "HandConnect: Drawing autosave failed:",
                error
            );
        });
}

function removeSavedDrawing() {
    if (!window.DrawingStorage) {
        return;
    }

    window.DrawingStorage.clearDrawing()
        .catch(error => {
            console.error(
                "HandConnect: Could not clear saved drawing:",
                error
            );
        });
}

async function restoreSavedDrawing() {
    if (!window.DrawingStorage) {
        return false;
    }

    let imageUrl = null;

    try {
        const savedDrawing = await window.DrawingStorage.loadDrawing();

        if (!savedDrawing) {
            return false;
        }

        if (!(savedDrawing.image instanceof Blob)) {
            console.warn("HandConnect: Saved drawing is invalid.");
            await window.DrawingStorage.clearDrawing();
            return false;
        }

        imageUrl = URL.createObjectURL(savedDrawing.image);

        const image = new Image();
        image.src = imageUrl;

        await image.decode();

        if (!image.naturalWidth || !image.naturalHeight) {
            throw new Error("Saved drawing image is empty.");
        }

        drawingCtx.clearRect(
            0,
            0,
            drawingCanvas.width,
            drawingCanvas.height
        );

        drawingCtx.drawImage(
            image,
            0,
            0,
            drawingCanvas.width,
            drawingCanvas.height
        );

        // A restored drawing starts with a fresh history.
        undoStack = [];
        redoStack = [];

        currentStrokeSnapshot = null;
        currentStrokeHasDrawn = false;

        previousDrawPoint = null;
        smoothedPoint = null;
        shapeStartPoint = null;

        updateHistoryButtons();

        console.log("HandConnect: Previous drawing restored.");

        return true;

    } catch (error) {
        console.error(
            "HandConnect: Drawing restoration failed:",
            error
        );

        // Remove a corrupted drawing instead of repeatedly
        // attempting to restore it on every camera start.
        try {
            await window.DrawingStorage.clearDrawing();
        } catch (clearError) {
            console.error(
                "HandConnect: Could not remove invalid saved drawing:",
                clearError
            );
        }

        return false;

    } finally {
        if (imageUrl) {
            URL.revokeObjectURL(imageUrl);
        }
    }
}

// ==========================================
// DRAWING TOOL SELECTION
// ==========================================

toolButtons.forEach(button => {
    button.addEventListener("click", () => {
        const newTool = button.dataset.tool;

        const allowedTools = [
            "brush",
            "eraser",
            "line",
            "rectangle",
            "circle"
        ];

        if (!allowedTools.includes(newTool)) {
            return;
        }

        finishCurrentStroke();

        selectedTool = newTool;

        toolButtons.forEach(toolButton => {
            const active = toolButton.dataset.tool === selectedTool;

            toolButton.classList.toggle("active", active);
            toolButton.setAttribute("aria-pressed", String(active));
        });

        previousDrawPoint = null;
        smoothedPoint = null;
        shapeStartPoint = null;
    });
});

// ==========================================
// CANVAS HISTORY
// ==========================================

function createCanvasSnapshot() {
    const snapshot = document.createElement("canvas");

    snapshot.width = drawingCanvas.width;
    snapshot.height = drawingCanvas.height;

    const snapshotContext = snapshot.getContext("2d");

    snapshotContext.drawImage(drawingCanvas, 0, 0);

    return snapshot;
}

function updateHistoryButtons() {
    undoDrawing.disabled =
        undoStack.length === 0 && !currentStrokeHasDrawn;

    redoDrawing.disabled = redoStack.length === 0;
}

function beginCurrentStroke() {
    if (currentStrokeSnapshot) {
        return;
    }

    currentStrokeSnapshot = createCanvasSnapshot();
    currentStrokeHasDrawn = false;
    shapeStartPoint = null;

    updateHistoryButtons();
}

function finishCurrentStroke() {
    if (!currentStrokeSnapshot) {
        return;
    }

    if (currentStrokeHasDrawn) {
        undoStack.push(currentStrokeSnapshot);

        if (undoStack.length > MAX_HISTORY) {
            undoStack.shift();
        }

        // A new drawing action invalidates the redo history.
        redoStack = [];

        // Save only after a drawing action is completed.
        saveCurrentDrawing();
    }

    currentStrokeSnapshot = null;
    currentStrokeHasDrawn = false;
    shapeStartPoint = null;

    updateHistoryButtons();
}

function restoreCanvasSnapshot(snapshot) {
    drawingCtx.clearRect(
        0,
        0,
        drawingCanvas.width,
        drawingCanvas.height
    );

    drawingCtx.drawImage(
        snapshot,
        0,
        0,
        drawingCanvas.width,
        drawingCanvas.height
    );

    previousDrawPoint = null;
    smoothedPoint = null;
    shapeStartPoint = null;
}

// ==========================================
// UNDO
// ==========================================

undoDrawing.addEventListener("click", () => {
    finishCurrentStroke();

    if (undoStack.length === 0) {
        return;
    }

    redoStack.push(createCanvasSnapshot());

    const previousSnapshot = undoStack.pop();

    restoreCanvasSnapshot(previousSnapshot);

    updateHistoryButtons();

    saveCurrentDrawing();
});

// ==========================================
// REDO
// ==========================================

redoDrawing.addEventListener("click", () => {
    finishCurrentStroke();

    if (redoStack.length === 0) {
        return;
    }

    undoStack.push(createCanvasSnapshot());

    const nextSnapshot = redoStack.pop();

    restoreCanvasSnapshot(nextSnapshot);

    updateHistoryButtons();

    saveCurrentDrawing();
});

// ==========================================
// CANVAS RESIZING
// ==========================================

function resizeCanvas() {
    const width =
        video.clientWidth ||
        canvas.clientWidth ||
        640;

    const height =
        video.clientHeight ||
        canvas.clientHeight ||
        480;

    const oldWidth = drawingCanvas.width;
    const oldHeight = drawingCanvas.height;

    let savedDrawing = null;

    if (oldWidth > 0 && oldHeight > 0) {
        savedDrawing = document.createElement("canvas");

        savedDrawing.width = oldWidth;
        savedDrawing.height = oldHeight;

        savedDrawing
            .getContext("2d")
            .drawImage(drawingCanvas, 0, 0);
    }

    canvas.width = width;
    canvas.height = height;

    drawingCanvas.width = width;
    drawingCanvas.height = height;

    if (savedDrawing) {
        drawingCtx.drawImage(
            savedDrawing,
            0,
            0,
            oldWidth,
            oldHeight,
            0,
            0,
            width,
            height
        );
    }

    // Old history snapshots may have different dimensions.
    undoStack = [];
    redoStack = [];

    currentStrokeSnapshot = null;
    currentStrokeHasDrawn = false;

    previousDrawPoint = null;
    smoothedPoint = null;
    shapeStartPoint = null;

    updateHistoryButtons();
}

window.addEventListener("resize", resizeCanvas);

// ==========================================
// COORDINATE CONVERSION
// ==========================================

function toPx(point) {
    return {
        x: point.x * drawingCanvas.width,
        y: point.y * drawingCanvas.height
    };
}

// ==========================================
// POINT SMOOTHING
// ==========================================

function smoothPoint(point) {
    if (!smoothedPoint) {
        smoothedPoint = { ...point };
        return { ...smoothedPoint };
    }

    const distance = Math.hypot(
        point.x - smoothedPoint.x,
        point.y - smoothedPoint.y
    );

    if (distance > MAX_JUMP_DISTANCE) {
        smoothedPoint = { ...point };
        return { ...smoothedPoint };
    }

    smoothedPoint = {
        x:
            smoothedPoint.x +
            (point.x - smoothedPoint.x) * SMOOTHING,

        y:
            smoothedPoint.y +
            (point.y - smoothedPoint.y) * SMOOTHING
    };

    return { ...smoothedPoint };
}

// ==========================================
// HAND SKELETON CONNECTIONS
// ==========================================

const BONES = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [13, 17], [17, 18], [18, 19], [19, 20],
    [0, 17]
];

function drawHandSkeleton(landmarks) {
    ctx.save();

    ctx.lineWidth = 3;
    ctx.strokeStyle = "#00e5ff";
    ctx.fillStyle = "#ffffff";

    BONES.forEach(([start, end]) => {
        const pointA = toPx(landmarks[start]);
        const pointB = toPx(landmarks[end]);

        ctx.beginPath();
        ctx.moveTo(pointA.x, pointA.y);
        ctx.lineTo(pointB.x, pointB.y);
        ctx.stroke();
    });

    landmarks.forEach(point => {
        const position = toPx(point);

        ctx.beginPath();
        ctx.arc(position.x, position.y, 4, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.restore();
}

// ==========================================
// HAND CONNECTION EFFECT
// ==========================================

function drawHandConnections(allHands) {
    if (allHands.length < 2) {
        return;
    }

    const firstHand = toPx(allHands[0][0]);
    const secondHand = toPx(allHands[1][0]);

    ctx.save();

    ctx.strokeStyle = "rgba(0, 229, 255, 0.7)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(firstHand.x, firstHand.y);
    ctx.lineTo(secondHand.x, secondHand.y);
    ctx.stroke();

    ctx.restore();
}

// ==========================================
// FINGERTIP PARTICLE EFFECT
// ==========================================

function drawSparks(landmarks) {
    if (!landmarks || landmarks.length === 0) {
        return;
    }

    const point = toPx(landmarks[8]);

    ctx.save();

    ctx.fillStyle = "#00e5ff";
    ctx.shadowColor = "#00e5ff";
    ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// ==========================================
// DRAWING STYLE
// ==========================================

function applyDrawingStyle() {
    drawingCtx.lineWidth = Number(brushSize.value);
    drawingCtx.lineCap = "round";
    drawingCtx.lineJoin = "round";

    drawingCtx.strokeStyle = brushColor.value;

    if (selectedTool === "eraser") {
        drawingCtx.globalCompositeOperation = "destination-out";
    } else {
        drawingCtx.globalCompositeOperation = "source-over";
    }
}

// ==========================================
// BRUSH AND ERASER
// ==========================================

function drawFreehand(point) {
    if (!previousDrawPoint) {
        previousDrawPoint = { ...point };
        return;
    }

    const distance = Math.hypot(
        point.x - previousDrawPoint.x,
        point.y - previousDrawPoint.y
    );

    if (distance > MAX_JUMP_DISTANCE) {
        previousDrawPoint = { ...point };
        return;
    }

    drawingCtx.save();

    applyDrawingStyle();

    drawingCtx.beginPath();

    drawingCtx.moveTo(
        previousDrawPoint.x,
        previousDrawPoint.y
    );

    drawingCtx.lineTo(
        point.x,
        point.y
    );

    drawingCtx.stroke();

    drawingCtx.restore();

    currentStrokeHasDrawn = true;

    previousDrawPoint = { ...point };

    updateHistoryButtons();
}

// ==========================================
// SHAPE PREVIEW
// ==========================================

function drawShapePreview(start, end) {
    if (!currentStrokeSnapshot) {
        return;
    }

    // Clear the previous preview and restore the original drawing.
    drawingCtx.clearRect(
        0,
        0,
        drawingCanvas.width,
        drawingCanvas.height
    );

    drawingCtx.drawImage(
        currentStrokeSnapshot,
        0,
        0
    );

    drawingCtx.save();

    drawingCtx.globalCompositeOperation = "source-over";
    drawingCtx.strokeStyle = brushColor.value;
    drawingCtx.lineWidth = Number(brushSize.value);
    drawingCtx.lineCap = "round";
    drawingCtx.lineJoin = "round";

    drawingCtx.beginPath();

    if (selectedTool === "line") {
        drawingCtx.moveTo(start.x, start.y);
        drawingCtx.lineTo(end.x, end.y);
    }

    if (selectedTool === "rectangle") {
        drawingCtx.rect(
            start.x,
            start.y,
            end.x - start.x,
            end.y - start.y
        );
    }

    if (selectedTool === "circle") {
        const radius = Math.hypot(
            end.x - start.x,
            end.y - start.y
        );

        drawingCtx.arc(
            start.x,
            start.y,
            radius,
            0,
            Math.PI * 2
        );
    }

    drawingCtx.stroke();
    drawingCtx.restore();

    const distance = Math.hypot(
        end.x - start.x,
        end.y - start.y
    );

    if (distance > 2) {
        currentStrokeHasDrawn = true;
        updateHistoryButtons();
    }
}

// ==========================================
// AIR DRAWING
// ==========================================

function drawInAir(landmarks, canDraw) {
    // Finish the current drawing action when the gesture ends.
    if (!landmarks || !canDraw) {
        finishCurrentStroke();

        previousDrawPoint = null;
        smoothedPoint = null;

        return;
    }

    beginCurrentStroke();

    const indexTip = toPx(landmarks[8]);
    const currentPoint = smoothPoint(indexTip);

    // Freehand tools.
    if (
        selectedTool === "brush" ||
        selectedTool === "eraser"
    ) {
        drawFreehand(currentPoint);
        return;
    }

    // Shape tools.
    if (!shapeStartPoint) {
        shapeStartPoint = { ...currentPoint };
        return;
    }

    drawShapePreview(
        shapeStartPoint,
        currentPoint
    );
}

// ==========================================
// BRUSH SIZE CONTROL
// ==========================================

brushSize.addEventListener("input", () => {
    brushSizeValue.textContent = brushSize.value + "px";
});

// ==========================================
// CLEAR CANVAS
// ==========================================

clearDrawing.addEventListener("click", () => {
    finishCurrentStroke();

    drawingCtx.clearRect(
        0,
        0,
        drawingCanvas.width,
        drawingCanvas.height
    );

    undoStack = [];
    redoStack = [];

    currentStrokeSnapshot = null;
    currentStrokeHasDrawn = false;

    previousDrawPoint = null;
    smoothedPoint = null;
    shapeStartPoint = null;

    updateHistoryButtons();

    // Remove the autosaved drawing as well.
    removeSavedDrawing();
});

// ==========================================
// DASHBOARD
// ==========================================

function updateDashboard(res, count, gestureLabel) {
    const now = performance.now();
    const delta = now - lastFrameTime;

    const fps = delta > 0
        ? Math.round(1000 / delta)
        : 0;

    lastFrameTime = now;

    handCountElement.textContent = count;
    fpsElement.textContent = fps;
    gestureElement.textContent = gestureLabel || "-";

    if (count > 0 && res.multiHandLandmarks?.[0]) {
        const landmarks = res.multiHandLandmarks[0];

        const spread = Math.min(
            100,
            Math.round(
                Math.hypot(
                    landmarks[4].x - landmarks[20].x,
                    landmarks[4].y - landmarks[20].y
                ) * 250
            )
        );

        spreadElement.textContent = spread + "%";
    } else {
        spreadElement.textContent = "-";
    }
}

// ==========================================
// MEDIAPIPE RESULTS
// ==========================================

function onResults(res) {
    // Do not process camera frames while restoring a drawing.
    if (isRestoringDrawing) {
        return;
    }

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    const rawHands = res.multiHandLandmarks || [];

    const gestureState = updateGestureState(
        rawHands[0] || null
    );

    rawHands.forEach(landmarks => {
        drawHandSkeleton(landmarks);
    });

    drawHandConnections(rawHands);

    if (rawHands.length > 0) {
        drawInAir(
            rawHands[0],
            gestureState.canDraw
        );

        drawSparks(rawHands[0]);
    } else {
        finishCurrentStroke();

        previousDrawPoint = null;
        smoothedPoint = null;
    }

    updateDashboard(
        res,
        rawHands.length,
        gestureState.gesture
    );
}

// ==========================================
// START CAMERA AND TRACKING
// ==========================================

async function startTracking() {
    if (isTracking) {
        return;
    }

    try {
        resizeCanvas();

        hands = new Hands({
            locateFile: file =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
        });

        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.6,
            minTrackingConfidence: 0.5
        });

        hands.onResults(onResults);

        camera = new Camera(video, {
            onFrame: async () => {
                if (hands && isTracking) {
                    await hands.send({
                        image: video
                    });
                }
            },

            width: 640,
            height: 480
        });

        isTracking = true;

        resetGestureState();

        // Pause frame processing while the saved drawing is restored.
        isRestoringDrawing = true;

        try {
            await camera.start();

            resizeCanvas();

            await restoreSavedDrawing();

        } finally {
            isRestoringDrawing = false;
        }

        return true;

    } catch (error) {
        isRestoringDrawing = false;

        console.error("Hand tracking start error:", error);

        await stopTracking();

        throw error;
    }
}

// ==========================================
// STOP CAMERA AND TRACKING
// ==========================================

async function stopTracking() {
    isTracking = false;

    finishCurrentStroke();

    if (camera) {
        try {
            camera.stop();
        } catch (error) {
            console.error("Camera stop error:", error);
        }

        camera = null;
    }

    if (video.srcObject) {
        video.srcObject
            .getTracks()
            .forEach(track => track.stop());

        video.srcObject = null;
    }

    if (hands) {
        try {
            await hands.close();
        } catch (error) {
            console.error("MediaPipe close error:", error);
        }

        hands = null;
    }

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    previousDrawPoint = null;
    smoothedPoint = null;
    shapeStartPoint = null;

    resetGestureState();

    handCountElement.textContent = "0";
    fpsElement.textContent = "0";
    gestureElement.textContent = "-";
    spreadElement.textContent = "-";

    lastFrameTime = performance.now();

    updateHistoryButtons();
}

// ==========================================
// INITIALIZATION
// ==========================================

toolButtons.forEach(button => {
    const active = button.dataset.tool === selectedTool;

    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
});

updateHistoryButtons();