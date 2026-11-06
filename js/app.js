
(() => {
    "use strict";

    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");
    const statusDot = document.getElementById("statusDot");
    const statusText = document.getElementById("statusText");
    const cameraMessage = document.getElementById("message");
    const exportDrawing = document.getElementById("exportDrawing");

    let isProcessing = false;

    if (!startBtn || !stopBtn || !statusDot || !statusText || !cameraMessage) {
        console.error("HandConnect: One or more camera control elements are missing.");
        return;
    }

    // CAMERA START
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

    // CAMERA STOP
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
            startBtn.disabled = false;
        } finally {
            isProcessing = false;
        }
    });

    // EXPORT DRAWING AS PNG
    if (exportDrawing) {
        exportDrawing.addEventListener("click", () => {
            const canvasToExport = document.getElementById("drawingCanvas");

            if (!canvasToExport || !canvasToExport.width || !canvasToExport.height) {
                alert("Drawing canvas is not ready.");
                return;
            }

            canvasToExport.toBlob((blob) => {
                if (!blob) {
                    alert("PNG creation failed. Please try again.");
                    return;
                }

                const imageUrl = URL.createObjectURL(blob);
                const downloadLink = document.createElement("a");

                downloadLink.href = imageUrl;
                downloadLink.download = "handconnect-drawing.png";

                document.body.appendChild(downloadLink);
                downloadLink.click();
                downloadLink.remove();

                setTimeout(() => URL.revokeObjectURL(imageUrl), 1000);

                console.log("HandConnect PNG downloaded successfully.");
            }, "image/png");
        });
    } else {
        console.error("HandConnect: Download PNG button not found.");
    }
})();
