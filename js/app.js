
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const cameraMessage = document.getElementById("message");

let isProcessing = false;

startBtn.addEventListener("click", async () => {
    if (isProcessing) return;

    isProcessing = true;
    startBtn.disabled = true;
    stopBtn.disabled = true;

    statusText.textContent = "Starting Camera...";

    try {
        await startTracking();

        cameraMessage.classList.add("hidden");

        stopBtn.disabled = false;
        statusDot.classList.add("online");
        statusText.textContent = "Camera Online";

    } catch (error) {
        console.error("Camera start error:", error);

        cameraMessage.classList.remove("hidden");

        startBtn.disabled = false;
        stopBtn.disabled = true;

        statusDot.classList.remove("online");
        statusText.textContent = "Camera Error";

    } finally {
        isProcessing = false;
    }
});

stopBtn.addEventListener("click", async () => {
    if (isProcessing) return;

    isProcessing = true;
    stopBtn.disabled = true;

    statusText.textContent = "Stopping Camera...";

    try {
        await stopTracking();

        cameraMessage.classList.remove("hidden");

        startBtn.disabled = false;
        statusDot.classList.remove("online");
        statusText.textContent = "Camera Offline";

    } catch (error) {
        console.error("Camera stop error:", error);
        statusText.textContent = "Stop Error";

    } finally {
        isProcessing = false;
    }
});
