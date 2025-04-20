// Gemini AI Interview Question Logic
// --- Gemini-powered Interview Questions ---
// NOTE: You must set your Gemini API key below!
const GEMINI_API_KEY = 'YOUR_API_KEY'; // <-- Replace with your Gemini API key

// Utility to get the latest JSON file from uploads (by timestamp in filename)
async function fetchLatestResumeJson() {
  const res = await fetch('/uploads/');
  const text = await res.text();
  // Parse HTML directory listing (works if directory listing is enabled)
  const matches = [...text.matchAll(/href="([^"]+\.json)"/g)].map(m => m[1]);
  if (!matches.length) return null;
  // Extract timestamp from filename and sort by it
  const sorted = matches.sort((a, b) => {
    // Extract ISO timestamp from filenames like name_YYYY-MM-DDTHH-MM-SS.json
    const getTime = f => {
      const m = f.match(/_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
      if (!m) return 0;
      return new Date(m[1].replace(/-/g, ':').replace('T', 'T').replace(/:(\d{2})$/, '-$1')).getTime();
    };
    return getTime(b) - getTime(a);
  });
  const latest = sorted[0];
  const jsonRes = await fetch('/uploads/' + latest);
  return await jsonRes.json();
}

async function generateQuestionsWithGemini(jobdesc, resumeText) {
  // Call our backend proxy instead of Gemini API directly
  const response = await fetch('/api/gemini-interview-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobdesc, resumeText })
  });
  const data = await response.json();
  if (data.questions) return data.questions;
  return [];
}

let aiQuestions = [];
let aiCurrent = 0;

function showAIQuestion() {
  const container = document.getElementById('ai-questions');
  if (!aiQuestions.length) {
    container.textContent = 'No AI questions generated.';
    document.getElementById('next-question').classList.add('hidden');
    return;
  }
  container.textContent = aiQuestions[aiCurrent];
  document.getElementById('next-question').classList.toggle('hidden', aiCurrent >= aiQuestions.length - 1);
}

document.addEventListener('DOMContentLoaded', async function() {
  // Fetch data and generate questions
  const data = await fetchLatestResumeJson();
  if (!data) {
    document.getElementById('ai-questions').textContent = 'No resume data found.';
    return;
  }
  aiQuestions = await generateQuestionsWithGemini(data.jobdesc, data.resumeText);
  aiCurrent = 0;
  showAIQuestion();
  if (aiQuestions.length > 1) document.getElementById('next-question').classList.remove('hidden');
  document.getElementById('next-question').onclick = function() {
    if (aiCurrent < aiQuestions.length - 1) {
      aiCurrent++;
      showAIQuestion();
    }
  };
});

// --- Existing interview logic below ---
// Camera feed logic
const cameraFeed = document.getElementById('cameraFeed');
const videoBtn = document.querySelector('button[title="Video On"]');
const controlMicBtn = document.querySelector('button[title="Mic Off"]');
const endCallBtn = document.querySelector('button[title="End Call"]');
const cameraPanel = document.querySelector('.relative.rounded-3xl');

function endCall() {
  stopVideo();
  stopMic();
  pauseTimer();
  // Overlay message
  if (cameraPanel) {
    let overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(255,255,255,0.92)';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 20;
    overlay.innerHTML = '<span style="font-size:2.2rem;font-weight:700;color:#d32f2f;margin-bottom:12px;">Interview Ended</span><span style="font-size:1.1rem;color:#333;">Thank you for participating.</span>';
    cameraPanel.appendChild(overlay);
  }
  // Optionally: disable controls
  if (videoBtn) videoBtn.disabled = true;
  if (controlMicBtn) controlMicBtn.disabled = true;
  if (endCallBtn) endCallBtn.disabled = true;
}

if (endCallBtn) {
  endCallBtn.addEventListener('click', endCall);
}

let videoStream = null;
let videoOn = true;
let micOn = true;

function updateVideoBtn() {
  if (videoOn) {
    videoBtn.classList.remove('text-gray-400');
    videoBtn.classList.add('text-blue-600');
    videoBtn.querySelector('i').className = 'fa-solid fa-video';
  } else {
    videoBtn.classList.remove('text-blue-600');
    videoBtn.classList.add('text-gray-400');
    videoBtn.querySelector('i').className = 'fa-solid fa-video-slash';
  }
}

function updateMicBtn() {
  if (!controlMicBtn) return;
  const icon = controlMicBtn.querySelector('i');
  if (!icon) return;
  if (micOn) {
    controlMicBtn.classList.remove('text-gray-400');
    controlMicBtn.classList.add('text-blue-600');
    icon.className = 'fa-solid fa-microphone';
    icon.style.color = '#B197FC';
  } else {
    controlMicBtn.classList.remove('text-blue-600');
    controlMicBtn.classList.add('text-gray-400');
    icon.className = 'fa-solid fa-microphone-slash';
    icon.style.color = '';
  }
}

async function startVideo() {
  if (!videoStream) {
    videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }
  cameraFeed.srcObject = videoStream;
  cameraFeed.play();
  videoOn = true;
  updateVideoBtn();
}

function stopVideo() {
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    cameraFeed.srcObject = null;
    videoStream = null;
  }
  videoOn = false;
  updateVideoBtn();
}

if (videoBtn) {
  videoBtn.addEventListener('click', async function() {
    if (videoOn) {
      stopVideo();
      pauseTimer();
    } else {
      await startVideo();
      resumeTimer();
    }
  });
}

// Start video and timer on page load
startVideo().then(() => startTimer());

// --- AUDIO/WAVEFORM ---
let micStream = null;
let analyser, dataArray, source, audioCtx;

async function startMic() {
  if (!micStream) {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    dataArray = new Uint8Array(analyser.fftSize);
    source = audioCtx.createMediaStreamSource(micStream);
    source.connect(analyser);
  }
  micOn = true;
  updateMicBtn();
}

function stopMic() {
  if (micStream) {
    micStream.getTracks().forEach(track => track.stop());
    micStream = null;
    analyser = null;
    dataArray = null;
    source = null;
    audioCtx && audioCtx.close();
    audioCtx = null;
  }
  micOn = false;
  updateMicBtn();
}

if (controlMicBtn) {
  controlMicBtn.addEventListener('click', async function() {
    if (micOn) {
      stopMic();
    } else {
      await startMic();
    }
  });
}

// Start mic on page load
startMic();

// --- TIMER ---
let timer = 0;
let timerInterval = null;
const timerSpan = document.querySelector('.font-mono');
function updateTimerDisplay() {
  const h = String(Math.floor(timer / 3600)).padStart(2, '0');
  const m = String(Math.floor((timer % 3600) / 60)).padStart(2, '0');
  const s = String(timer % 60).padStart(2, '0');
  timerSpan.textContent = `${h}:${m}:${s}`;
}
function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    timer++;
    updateTimerDisplay();
  }, 1000);
}
function pauseTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}
function resumeTimer() {
  if (!timerInterval) startTimer();
}
function resetTimer() {
  timer = 0;
  updateTimerDisplay();
}
// --- CONTINUOUS REAL-TIME SPEECH TO TEXT FOR AI INTERVIEW FEED ONLY ---
const LANG = 'en-US';
let camRecognition;
let camRecognitionRunning = false;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  camRecognition = new SpeechRecognition();
  camRecognition.lang = LANG;
  camRecognition.continuous = true;
  camRecognition.interimResults = true;

  camRecognition.onresult = (event) => {
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        final += event.results[i][0].transcript;
      }
    }
    // If a final result is recognized, append it to the AI Interview Feed
    if (final.trim()) {
      const aiChatFeed = document.getElementById('aiChatFeed');
      if (aiChatFeed) {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex flex-row items-end gap-2';
        wrapper.innerHTML = `<div class="bg-green-50 rounded-xl px-4 py-3 text-green-900 font-medium shadow border border-green-100">${final}</div><span class="text-xs text-gray-400 ml-1">You</span>`;
        aiChatFeed.appendChild(wrapper);
        aiChatFeed.scrollTop = aiChatFeed.scrollHeight;
      }
    }
  };
  camRecognition.onstart = () => { camRecognitionRunning = true; };
  camRecognition.onend = () => {
    camRecognitionRunning = false;
    setTimeout(() => {
      if (!camRecognitionRunning) camRecognition.start();
    }, 200);
  };
  camRecognition.onerror = () => {
    camRecognitionRunning = false;
    setTimeout(() => {
      if (!camRecognitionRunning) camRecognition.start();
    }, 500);
  };
  // Start immediately
  if (!camRecognitionRunning) camRecognition.start();
}
// --- END CAMERA CARD SPEECH TO TEXT ---


// --- WAVEFORM ---
// Real-time waveform based on microphone input
const canvas = document.getElementById('waveform');
if (canvas && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  const ctx = canvas.getContext('2d');
  let analyser, dataArray, source, audioStream;
  let audioCtx;

  function drawWave() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Gradient for main line
    let grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0, '#60a5fa'); // blue-400
    grad.addColorStop(0.5, '#818cf8'); // indigo-400
    grad.addColorStop(1, '#34d399'); // green-400
    ctx.shadowColor = '#818cf8';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 4;
    // Draw main waveform
    ctx.beginPath();
    ctx.strokeStyle = grad;
    if (analyser && dataArray) {
      analyser.getByteTimeDomainData(dataArray);
      for (let x = 0; x < canvas.width; x++) {
        const dataIndex = Math.floor(x * dataArray.length / canvas.width);
        const v = dataArray[dataIndex] / 128.0;
        const y = (canvas.height / 2) + (v - 1.0) * (canvas.height / 2) * 0.7;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // Draw two additional soft lines for depth
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath();
        ctx.globalAlpha = 0.18 * (3 - i);
        ctx.lineWidth = 2 - i * 0.5;
        for (let x = 0; x < canvas.width; x++) {
          const dataIndex = Math.floor(x * dataArray.length / canvas.width);
          const v = dataArray[dataIndex] / 128.0;
          // Offset each line slightly for "depth"
          const y = (canvas.height / 2) + (v - 1.0) * (canvas.height / 2) * (0.7 - i * 0.13);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = grad;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 4;
    } else {
      // fallback: flat line
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.strokeStyle = grad;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    requestAnimationFrame(drawWave);
  }

  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then(function (stream) {
      audioStream = stream;
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      dataArray = new Uint8Array(analyser.fftSize);
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      drawWave();
    })
    .catch(function (err) {
      // fallback: animate a flat line if no mic
      drawWave();
    });
}

// Enable switching between questions
document.querySelectorAll('.question-card').forEach(card => {
  card.addEventListener('click', function() {
    document.querySelectorAll('.question-card').forEach(c => {
      c.classList.remove('shadow-lg', 'border-gray-100');
    });
    this.classList.add('shadow-lg', 'border-gray-100');
    // Optionally add logic here to update the main panel/feed for the selected question
  });
});