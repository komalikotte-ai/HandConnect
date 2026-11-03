
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");

startBtn.addEventListener("click", async () => {
    startBtn.disabled = true;
    statusText.textContent = "Starting Camera...";

    try {
        await startTracking();

        startBtn.disabled = true;
        stopBtn.disabled = false;

        statusDot.classList.add("online");
        statusText.textContent = "Camera Online";

    } catch (error) {
        startBtn.disabled = false;
        stopBtn.disabled = true;

        statusDot.classList.remove("online");
        statusText.textContent = "Camera Error";

        alert(
            "Unable to start camera. Please check camera permissions and try again."
        );
    }
});

stopBtn.addEventListener("click", async () => {
    stopBtn.disabled = true;

    await stopTracking();

    startBtn.disabled = false;

    statusDot.classList.remove("online");
    statusText.textContent = "Camera Offline";
});
