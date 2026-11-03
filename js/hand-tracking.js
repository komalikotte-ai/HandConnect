
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const TIPS = [4, 8, 12, 16, 20];

const BONES = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [13, 17], [17, 18], [18, 19], [19, 20],
    [0, 17]
];

const HAND_COLORS = ["#ff4fd8", "#ffe83a"];
const BEAM_COLORS = [
    "#ff3b3b", "#ff9a2e", "#7dff5a",
    "#3ad7ff", "#c46bff"
];

let camera = null;
let tracker = null;
let sparks = [];
let last = performance.now();
let fpsSmooth = 0;
let isRunning = false;

function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function toPx(p) {
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;

    const s = Math.max(
        canvas.width / vw,
        canvas.height / vh
    );

    return {
        x: p.x * vw * s - (vw * s - canvas.width) / 2,
        y: p.y * vh * s - (vh * s - canvas.height) / 2
    };
}

function glowLine(a, b, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = width / 3;
    ctx.shadowBlur = 0;
    ctx.stroke();
}

function addSpark(p, color) {
    sparks.push({
        x: p.x,
        y: p.y,
        life: 1,
        color,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6
    });
}

function drawSparks() {
    sparks = sparks.filter(s => (s.life -= 0.04) > 0);

    for (const s of sparks) {
        s.x += s.vx;
        s.y += s.vy;

        ctx.globalAlpha = s.life;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 2, s.y - s.vy * 2);
        ctx.stroke();
    }

    ctx.globalAlpha = 1;
}

function updateDashboard(res, count) {
    const now = performance.now();

    fpsSmooth = fpsSmooth * 0.9 +
        (1000 / (now - last)) * 0.1;

    last = now;

    document.getElementById("handCount").textContent = count;
    document.getElementById("fps").innerHTML =
        `${Math.round(fpsSmooth)} <small>FPS</small>`;

    const lm = res.multiHandLandmarks?.[0];

    document.getElementById("gesture").textContent =
        lm ? detectGesture(lm) : "-";

    let spread = 0;

    if (lm) {
        const d = Math.hypot(
            lm[4].x - lm[20].x,
            lm[4].y - lm[20].y
        );

        spread = Math.min(100, Math.round(d * 250));
    }

    document.getElementById("spread").textContent =
        spread + "%";
}

function onResults(res) {
    if (!isRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";

    const hands = (res.multiHandLandmarks || [])
        .map(lm => lm.map(toPx));

    hands.forEach((points, h) => {
        for (const [a, b] of BONES) {
            glowLine(points[a], points[b], HAND_COLORS[h % 2], 4);
        }
    });

    if (hands.length === 2) {
        TIPS.forEach((tip, i) => {
            glowLine(
                hands[0][tip],
                hands[1][tip],
                BEAM_COLORS[i],
                6
            );

            if (Math.random() < 0.35) {
                addSpark(hands[0][tip], BEAM_COLORS[i]);
                addSpark(hands[1][tip], BEAM_COLORS[i]);
            }
        });
    }

    drawSparks();
    updateDashboard(res, hands.length);
}

async function startTracking() {
    if (isRunning) return;

    isRunning = true;

    try {
        tracker = new Hands({
            locateFile: file =>
                "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/" + file
        });

        tracker.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.6,
            minTrackingConfidence: 0.5
        });

        tracker.onResults(onResults);

        camera = new Camera(video, {
            onFrame: async () => {
                if (isRunning) {
                    await tracker.send({ image: video });
                }
            },
            width: 1280,
            height: 720
        });

        await camera.start();

        video.style.display = "block";
        document.getElementById("message").style.display = "none";

        return true;

    } catch (error) {
        console.error("Camera error:", error);
        isRunning = false;
        await stopTracking();
        throw error;
    }
}

async function stopTracking() {
    isRunning = false;

    if (camera) {
        camera.stop();
        camera = null;
    }

    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }

    if (tracker) {
        await tracker.close();
        tracker = null;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    sparks = [];

    video.style.display = "none";

    document.getElementById("handCount").textContent = "0";
    document.getElementById("fps").innerHTML = '0 <small>FPS</small>';
    document.getElementById("gesture").textContent = "-";
    document.getElementById("spread").textContent = "0%";

    document.getElementById("message").style.display = "flex";
}
