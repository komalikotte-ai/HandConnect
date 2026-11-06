
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const drawingCanvas = document.getElementById("drawingCanvas");
const drawingCtx = drawingCanvas.getContext("2d");

const brushColor = document.getElementById("brushColor");
const brushSize = document.getElementById("brushSize");
const brushSizeValue = document.getElementById("brushSizeValue");
const clearDrawing = document.getElementById("clearDrawing");

let hands = null;
let camera = null;
let isTracking = false;

const SMOOTHING = 0.45;
const MAX_JUMP_DISTANCE = 100;

let smoothedPoint = null;
let previousDrawPoint = null;
let lastFrameTime = performance.now();

// --------------------------------------------------
// CANVAS RESIZING
// --------------------------------------------------

function resizeCanvas() {
    const width = video.clientWidth || 640;
    const height = video.clientHeight || 480;

    const oldWidth = drawingCanvas.width;
    const oldHeight = drawingCanvas.height;

    const image = document.createElement("canvas");
    image.width = oldWidth;
    image.height = oldHeight;

    if (oldWidth && oldHeight) {
        image.getContext("2d").drawImage(drawingCanvas, 0, 0);
    }

    canvas.width = width;
    canvas.height = height;

    drawingCanvas.width = width;
    drawingCanvas.height = height;

    if (oldWidth && oldHeight) {
        drawingCtx.drawImage(
            image,
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
}

window.addEventListener("resize", resizeCanvas);

// --------------------------------------------------
// COORDINATE CONVERSION
// --------------------------------------------------

function toPx(point) {
    return {
        x: point.x * canvas.width,
        y: point.y * canvas.height
    };
}

// --------------------------------------------------
// POINT SMOOTHING
// --------------------------------------------------

function smoothPoint(point) {
    if (!smoothedPoint) {
        smoothedPoint = point;
        return point;
    }

    const distance = Math.hypot(
        point.x - smoothedPoint.x,
        point.y - smoothedPoint.y
    );

    if (distance > MAX_JUMP_DISTANCE) {
        smoothedPoint = point;
        return point;
    }

    smoothedPoint = {
        x: smoothedPoint.x +
            (point.x - smoothedPoint.x) * SMOOTHING,

        y: smoothedPoint.y +
            (point.y - smoothedPoint.y) * SMOOTHING
    };

    return smoothedPoint;
}

// --------------------------------------------------
// HAND SKELETON
// --------------------------------------------------

const BONES = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [13, 17], [17, 18], [18, 19], [19, 20],
    [0, 17]
];

function drawHandSkeleton(landmarks) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#00e5ff";
    ctx.fillStyle = "#ffffff";

    BONES.forEach(([start, end]) => {
        const a = toPx(landmarks[start]);
        const b = toPx(landmarks[end]);

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
    });

    landmarks.forEach(point => {
        const p = toPx(point);

        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
    });
}

// --------------------------------------------------
// HAND CONNECTION EFFECT
// --------------------------------------------------

function drawHandConnections(allHands) {
    if (allHands.length < 2) return;

    const first = toPx(allHands[0][0]);
    const second = toPx(allHands[1][0]);

    ctx.save();

    ctx.strokeStyle = "rgba(0, 229, 255, 0.7)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    ctx.lineTo(second.x, second.y);
    ctx.stroke();

    ctx.restore();
}

// --------------------------------------------------
// PARTICLE EFFECT
// --------------------------------------------------

function drawSparks(landmarks) {
    if (!landmarks || landmarks.length === 0) return;

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

// --------------------------------------------------
// AIR DRAWING
// Drawing is enabled only for a stable Point gesture.
// --------------------------------------------------

function drawInAir(landmarks, canDraw) {
    if (!landmarks || !canDraw) {
        previousDrawPoint = null;
        smoothedPoint = null;
        return;
    }

    const indexTip = toPx(landmarks[8]);
    const currentPoint = smoothPoint(indexTip);

    drawingCtx.strokeStyle = brushColor.value;
    drawingCtx.lineWidth = Number(brushSize.value);
    drawingCtx.lineCap = "round";
    drawingCtx.lineJoin = "round";

    if (!previousDrawPoint) {
        previousDrawPoint = currentPoint;
        return;
    }

    drawingCtx.beginPath();

    drawingCtx.moveTo(
        previousDrawPoint.x,
        previousDrawPoint.y
    );

    const middleX =
        (previousDrawPoint.x + currentPoint.x) / 2;

    const middleY =
        (previousDrawPoint.y + currentPoint.y) / 2;

    drawingCtx.quadraticCurveTo(
        previousDrawPoint.x,
        previousDrawPoint.y,
        middleX,
        middleY
    );

    drawingCtx.stroke();

    previousDrawPoint = currentPoint;
}

// --------------------------------------------------
// BRUSH CONTROLS
// --------------------------------------------------

brushSize.addEventListener("input", () => {
    brushSizeValue.textContent = brushSize.value;
});

clearDrawing.addEventListener("click", () => {
    drawingCtx.clearRect(
        0,
        0,
        drawingCanvas.width,
        drawingCanvas.height
    );

    previousDrawPoint = null;
    smoothedPoint = null;
});

// --------------------------------------------------
// DASHBOARD
// --------------------------------------------------

function updateDashboard(res, count, gestureLabel) {
    const now = performance.now();

    const delta = now - lastFrameTime;
    const fps = delta > 0 ? Math.round(1000 / delta) : 0;

    lastFrameTime = now;

    const handCountElement =
        document.getElementById("handCount");

    const fpsElement =
        document.getElementById("fps");

    const gestureElement =
        document.getElementById("gesture");

    const spreadElement =
        document.getElementById("spread");

    handCountElement.textContent = count;
    fpsElement.textContent = fps;
    gestureElement.textContent = gestureLabel;

    if (count > 0 && res.multiHandLandmarks?.[0]) {
        const lm = res.multiHandLandmarks[0];

        const wrist = lm[0];
        const indexTip = lm[8];

        const spread = Math.round(
            Math.hypot(
                indexTip.x - wrist.x,
                indexTip.y - wrist.y
            ) * 100
        );

        spreadElement.textContent = spread + "%";
    } else {
        spreadElement.textContent = "-";
    }
}

// --------------------------------------------------
// MEDIAPIPE RESULTS
// --------------------------------------------------

function onResults(res) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rawHands = res.multiHandLandmarks || [];

    const detectedHands = rawHands.map(landmarks => {
        return landmarks.map(point => toPx(point));
    });

    // Get the stabilized gesture state.
    const gestureState = updateGestureState(
        rawHands[0] || null
    );

    // Draw skeletons for detected hands.
    rawHands.forEach(landmarks => {
        drawHandSkeleton(landmarks);
    });

    // Connect two hands when both are detected.
    drawHandConnections(rawHands);

    // Draw only when the Point gesture is stable.
    if (rawHands.length > 0) {
        drawInAir(
            rawHands[0],
            gestureState.canDraw
        );

        drawSparks(rawHands[0]);
    } else {
        previousDrawPoint = null;
        smoothedPoint = null;
    }

    // Update dashboard with stabilized gesture.
    updateDashboard(
        res,
        detectedHands.length,
        gestureState.gesture
    );
}

// --------------------------------------------------
// START CAMERA AND HAND TRACKING
// --------------------------------------------------

async function startTracking() {
    if (isTracking) return;

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
                    await hands.send({ image: video });
                }
            },
            width: 640,
            height: 480
        });

        isTracking = true;

        resetGestureState();

        await camera.start();

    } catch (error) {
        console.error("Hand tracking error:", error);

        await stopTracking();

        throw error;
    }
}

// --------------------------------------------------
// STOP CAMERA AND HAND TRACKING
// --------------------------------------------------

async function stopTracking() {
    isTracking = false;

    if (camera) {
    try {
        camera.stop();
    } catch (error) {
        console.error("Camera stop error:", error);
    }

    camera = null;
}

if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => {
        track.stop();
    });

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

    video.srcObject = null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    previousDrawPoint = null;
    smoothedPoint = null;

    resetGestureState();

    document.getElementById("handCount").textContent = "0";
    document.getElementById("fps").textContent = "0";
    document.getElementById("gesture").textContent = "-";
    document.getElementById("spread").textContent = "-";
}
