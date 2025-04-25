// Gemini AI Interview Question Logic
// --- Gemini-powered Interview Questions ---
// NOTE: You must set your Gemini API key below!
const GEMINI_API_KEY = 'YOUR_API_KEY'; // <-- Replace with your Gemini API key

// Utility to get the latest JSON file from uploads (by timestamp in filename)
async function fetchLatestResumeJson() {
  const res = await fetch('/api/latest-resume');
  if (!res.ok) return null;
  return await res.json();
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
let aiFollowup = null;
let isFollowupActive = false;
let resumeContext = null;
let panelIntroduced = false;


// Utility: Clean up AI question text (remove markdown, Q1:, unnecessary symbols, parenthetical explanations)
function cleanAIQuestion(q) {
  if (!q) return '';
  // Remove markdown bold/italic (**text**, *text*, __text__, etc.)
  let cleaned = q.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/__([^_]+)__/g, '$1').replace(/_([^_]+)_/g, '$1');
  // Remove Q1:, Q2:, etc. at start
  cleaned = cleaned.replace(/^Q\d+:\s*/, '');
  // Remove quotes at start/end
  cleaned = cleaned.replace(/^"|"$/g, '');
  // Remove parenthetical explanations (e.g., (This assesses...))
  cleaned = cleaned.replace(/\([^)]*\)$/g, '').trim();
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

// Utility: Play TTS for AI question
function playAIQuestionTTS(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel(); // Stop any ongoing speech
  // Show current agent's lottie, hide others
  const agent = interviewAgents[aiCurrent % interviewAgents.length];
  const lottie = document.getElementById(agent.lottieId);
  // Hide all agent lotties
  interviewAgents.forEach(a => {
    const l = document.getElementById(a.lottieId);
    if (l) l.style.display = 'none';
  });
  if (lottie) lottie.style.display = 'block';

  const utter = new window.SpeechSynthesisUtterance(text);
  utter.lang = 'en-US';
  // Choose voice based on agent.voiceName if available, else fallback to gender
  const voices = window.speechSynthesis.getVoices();
  let preferred = null;
  if (agent.voiceName) {
    preferred = voices.find(v => v.name === agent.voiceName);
  }
  if (!preferred) {
    if (agent.voiceGender === 'male') {
      preferred = voices.find(v => v.lang.startsWith('en') && v.gender === 'male')
        || voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('male'))
        || voices.find(v => v.lang.startsWith('en'));
    } else {
      preferred = voices.find(v => v.lang.startsWith('en') && v.gender === 'female')
        || voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
        || voices.find(v => v.lang.startsWith('en'));
    }
  }
  if (preferred) utter.voice = preferred;
  utter.rate = agent.voiceRate;
  utter.pitch = agent.voicePitch;
  utter.onend = utter.onerror = () => {
    if (lottie) lottie.style.display = 'none';
  };
  window.speechSynthesis.speak(utter);
}

// --- Interview Agent Definitions ---
const interviewAgents = [
  {
    name: "Dr. Arjun Sharma",
    role: "Principal Software Architect",
    avatar: "arjun_sharma.png",
    lottieId: "arjunLottie",
    color: "blue",
    style: "analytical and methodical",
    specialty: "System Design and Architecture",
    voiceName: "Google UK English Male",
    voiceGender: "male",
    voiceRate: 1.0,
    voicePitch: 0.9,
    intro: "I have over 20 years of experience building scalable systems for enterprises. I enjoy diving deep into architecture and design challenges.",
    personality: "Analytical, supportive, and detail-oriented",
    feedbacks: [
      "That's a well-structured answer. Could you elaborate on the scalability aspect?",
      "Interesting approach! I appreciate your attention to detail.",
      "Your experience with system design is impressive.",
      "I'd like to hear more about your technical leadership in that project."
    ]
  },
  {
    name: "Priya Venkatesh",
    role: "Senior Engineering Manager",
    avatar: "priya_venkatesh.png",
    lottieId: "priyaLottie",
    color: "green",
    style: "pragmatic and business-focused",
    specialty: "Engineering Leadership",
    voiceName: "Google UK English Female",
    voiceGender: "female",
    voiceRate: 1.1,
    voicePitch: 1.3,
    intro: "I lead cross-functional teams and focus on innovation and delivery. I'm passionate about mentorship and building strong engineering cultures.",
    personality: "Friendly, pragmatic, and results-driven",
    feedbacks: [
      "Great example of teamwork. How did you motivate your team during challenges?",
      "I like your leadership approach. Can you share a time you resolved a conflict?",
      "You seem to value collaboration, which is important to us.",
      "That's an insightful answer about project management."
    ]
  },
  {
    name: "Vikram Mehta",
    role: "Lead Backend Developer",
    avatar: "vikram_mehta.png",
    lottieId: "vikramLottie",
    color: "pink",
    style: "code-oriented and detail-driven",
    specialty: "Backend Implementation",
    voiceName: "Google US English",
    voiceGender: "male",
    voiceRate: 1.05,
    voicePitch: 1.1,
    intro: "I specialize in backend development and distributed systems. I love solving complex problems and optimizing APIs.",
    personality: "Technical, precise, and curious",
    feedbacks: [
      "Nice explanation! Can you walk me through your API design decisions?",
      "Good problem-solving skills. How did you debug that issue?",
      "Your answer shows strong technical depth.",
      "I appreciate your focus on reliability and performance."
    ]
  },
  {
    name: "Divya Patel",
    role: "DevOps Specialist",
    avatar: "divya_patel.png",
    lottieId: "divyaLottie",
    color: "red",
    style: "automation-focused and security-conscious",
    specialty: "Infrastructure and Operations",
    voiceName: "Google US English Female",
    voiceGender: "female",
    voiceRate: 1.0,
    voicePitch: 1.5,
    intro: "I'm passionate about automation, cloud infrastructure, and security best practices. I help teams deliver faster and safer.",
    personality: "Efficient, practical, and security-minded",
    feedbacks: [
      "That's a good approach to automation. How did you ensure security?",
      "I like your focus on reliability. Can you share a DevOps challenge you faced?",
      "Your answer highlights strong operational awareness.",
      "Great! How did you handle deployment failures?"
    ]
  }
];


function appendToChatFeed(text, sender = 'You') {
  const feed = document.getElementById('aiChatFeed');
  // Prevent duplicate consecutive messages
  const last = feed.lastElementChild;
  if (last && last.textContent.trim() === text.trim() && last.querySelector('span')?.textContent === sender) return;
  const msgDiv = document.createElement('div');
  msgDiv.className = 'flex flex-row items-end gap-2 mb-2';
  msgDiv.innerHTML = `<div class="bg-green-50 rounded-2xl px-5 py-3 text-green-900 font-medium shadow border border-green-100 max-w-[90%]">${text}</div><span class="text-xs text-gray-400 ml-1">${sender}</span>`;
  feed.appendChild(msgDiv);
  feed.scrollTop = feed.scrollHeight;
}

function appendAIToChatFeed(text) {
  const feed = document.getElementById('aiChatFeed');
  // Prevent duplicate consecutive AI messages
  const last = feed.lastElementChild;
  if (last && last.textContent.trim() === text.trim() && last.querySelector('span')?.textContent === 'AI') return;
  const msgDiv = document.createElement('div');
  msgDiv.className = 'flex flex-row items-end gap-2 mb-2';
  msgDiv.innerHTML = `<div class="bg-blue-50 rounded-2xl px-5 py-3 text-blue-900 font-medium shadow border border-blue-100 max-w-[90%]">${text}</div><span class="text-xs text-blue-400 ml-1">AI</span>`;
  feed.appendChild(msgDiv);
  feed.scrollTop = feed.scrollHeight;
}

function renderSidebar() {
  const sidebar = document.getElementById('question-list');
  if (!sidebar) return;
  sidebar.innerHTML = '';
  aiQuestions.forEach((q, idx) => {
    const item = document.createElement('button');
    let icon = '';
    let classes = 'sidebar-question flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-blue-400 ';
    if (idx < aiCurrent) {
      icon = '<i class="fa-solid fa-check text-green-500 mr-2"></i>';
      classes += 'bg-green-100 text-green-800';
    } else if (idx === aiCurrent) {
      icon = '<i class="fa-solid fa-circle text-blue-500 mr-2"></i>';
      classes += 'bg-blue-200 text-blue-900 font-bold shadow-lg scale-105 ring-2 ring-blue-400';
    } else {
      icon = '<i class="fa-solid fa-lock text-gray-400 mr-2"></i>';
      classes += 'bg-gray-100 text-gray-400';
    }
    item.className = classes;
    item.setAttribute('aria-label', `Go to Question ${idx + 1}`);
    item.innerHTML = icon + `Q${idx + 1}`;
    item.disabled = idx > aiCurrent;
    item.onclick = () => {
      if (idx <= aiCurrent) {
        aiCurrent = idx;
        showAIQuestion();
      }
    };
    sidebar.appendChild(item);
  });
}

// --- SVG Timer Ring Animation ---
function updateTimerRing() {
  const progress = document.getElementById('timer-progress');
  if (!progress) return;
  const percent = timerRemaining / timerDuration;
  const dashArray = 100;
  const dashOffset = dashArray * (1 - percent);
  progress.setAttribute('stroke-dasharray', dashArray);
  progress.setAttribute('stroke-dashoffset', dashOffset);
  // Animate color as time runs out
  if (percent < 0.33) progress.setAttribute('stroke', '#dc2626'); // red
  else if (percent < 0.66) progress.setAttribute('stroke', '#f59e42'); // orange
  else progress.setAttribute('stroke', '#2563eb'); // blue
}

// Timer logic
// --- AUTO ADVANCE LOGIC ---
let questionTimer = null;
let timerDuration = 120; // seconds per question (2 min)
let timerRemaining = timerDuration;
let silenceAdvanceTimeout = null;

// New: Schedule auto-advance after long inactivity (60s)
function scheduleAutoAdvanceAfterInactivity() {
  if (silenceAdvanceTimeout) clearTimeout(silenceAdvanceTimeout);
  silenceAdvanceTimeout = setTimeout(() => {
    // Show warning before advancing
    const feed = document.getElementById('aiChatFeed');
    const warningDiv = document.createElement('div');
    warningDiv.className = 'flex flex-row items-center gap-2 mb-4 animate-fade-in';
    warningDiv.innerHTML = `<div class="bg-yellow-50 rounded-2xl px-5 py-3 text-yellow-900 font-semibold shadow border border-yellow-200 max-w-[90%]">No activity detected for 1 minute. Moving to the next question...</div>`;
    feed.appendChild(warningDiv);
    setTimeout(() => {
      if (!isFollowupActive && (!userAnswers[aiCurrent] || userAnswers[aiCurrent].trim() === '')) {
        autoAdvanceQuestion();
      }
    }, 2000); // 2s delay for user to see warning
  }, 60000); // 60 seconds
}


// Timer is now only for UI display, not auto-advancing
function startQuestionTimer() {
  clearInterval(questionTimer);
  timerRemaining = timerDuration;
  updateTimerDisplayUI();
  questionTimer = setInterval(() => {
    timerRemaining--;
    updateTimerDisplayUI();
    if (timerRemaining <= 0) {
      clearInterval(questionTimer);
      // Do not auto-advance on timer expiry
    }
  }, 1000);
}

function updateTimerDisplayUI() {
  const timerEl = document.getElementById('question-timer');
  if (!timerEl) return;
  const min = String(Math.floor(timerRemaining / 60)).padStart(2, '0');
  const sec = String(timerRemaining % 60).padStart(2, '0');
  timerEl.textContent = `${min}:${sec}`;
  updateTimerRing();
}

function autoAdvanceQuestion() {
  // If no answer, just advance
  if (!userAnswers[aiCurrent]) {
    userAnswers[aiCurrent] = '';
  }
  if (aiCurrent < aiQuestions.length - 1) {
    aiCurrent++;
    showAIQuestion();
  } else {
    document.getElementById('ai-questions').textContent = 'Interview complete!';
    document.getElementById('ai-answer-input').classList.add('hidden');
    document.getElementById('submit-answer-btn').classList.add('hidden');
  }
}

let silenceTimeout = null;

function showAIQuestion() {
  // Panel introductions at the very start
  if (!panelIntroduced && aiCurrent === 0) {
    panelIntroduced = true;
    const feed = document.getElementById('aiChatFeed');
    feed.innerHTML = '';
    interviewAgents.forEach(agent => {
      const introDiv = document.createElement('div');
      introDiv.className = 'flex flex-row items-start gap-2 mb-4 animate-fade-in';
      introDiv.innerHTML = `<div class="bg-blue-50 rounded-2xl px-5 py-3 text-blue-900 font-semibold shadow border border-blue-200 max-w-[90%]">
        Hello, I'm <b>${agent.name}</b>, ${agent.role}. ${agent.intro || ''} ${agent.personality ? `<span class='italic text-blue-700'>(${agent.personality})</span>` : ''}
      </div>`;
      feed.appendChild(introDiv);
    });
    // After intros, show the first question after a short pause
    setTimeout(() => showAIQuestion(), 2000);
    return;
  }
  // Always schedule auto-advance after 2s, even with no input or answer
  if (typeof silenceAdvanceTimeout !== 'undefined' && silenceAdvanceTimeout) clearTimeout(silenceAdvanceTimeout);
  silenceAdvanceTimeout = setTimeout(() => {
    if (!isFollowupActive && (!userAnswers[aiCurrent] || userAnswers[aiCurrent].trim() === '')) {
      autoAdvanceQuestion();
    }
  }, 5000);

  // Hide the old container for questions (if present)
  const container = document.getElementById('ai-questions');
  if (container) container.style.display = 'none';
  renderSidebar();

  // Render current question at the top of the AI Interview Feed
  const feed = document.getElementById('aiChatFeed');
  feed.innerHTML = '';

  // Timer above question
  const timerDiv = document.createElement('div');
  timerDiv.className = 'flex flex-row items-center justify-center mb-2';
  timerDiv.innerHTML = `<span id="question-timer" class="inline-block text-lg font-bold text-blue-700 bg-blue-100 rounded-full px-4 py-1 shadow-sm border border-blue-200"></span>`;
  feed.appendChild(timerDiv);
  updateTimerDisplayUI();

  // Show current question
  if (aiQuestions.length > 0) {
    const qDiv = document.createElement('div');
    qDiv.className = 'flex flex-col items-start gap-2 mb-6 animate-fade-in';
    // Clean up question text: remove markdown, Q1:, extra symbols, and explanations in parentheses
    const cleanQuestion = cleanAIQuestion(aiQuestions[aiCurrent]);

    // Add AI Interviewer label and question card
    const agent = interviewAgents[aiCurrent % interviewAgents.length];
    qDiv.innerHTML = `
      <div class="flex flex-col items-start w-full">
        <div id="ai-interviewer-label" class="mb-2 ml-1 px-4 py-1 bg-gradient-to-r from-blue-200 via-blue-100 to-blue-50 text-blue-800 font-semibold rounded-full shadow text-sm border border-blue-200" style="display:inline-block; border-radius: 1.3rem 1.3rem 1.3rem 0.5rem;">
          AI Interviewer – <span id="current-agent-name">${agent.name}</span> <span class="font-normal text-gray-500">(<span id="current-agent-role">${agent.role}</span>)</span>
        </div>
        <div class="bg-white rounded-2xl px-8 py-6 text-gray-900 font-semibold shadow border-2 border-blue-200 max-w-[95%] text-xl leading-relaxed">
          ${cleanQuestion}
        </div>
      </div>
    `;
    feed.appendChild(qDiv);

    // Play TTS for the current question
    playAIQuestionTTS(cleanQuestion);

    // Start silence detection for KnowLumi AI Agent
    if (silenceTimeout) clearTimeout(silenceTimeout);
    silenceTimeout = setTimeout(() => {
      let feedback;
      if (userAnswers[aiCurrent]) {
        feedback = generateKnowLumiFeedback(cleanQuestion, userAnswers[aiCurrent]);
      } else {
        feedback = `If you need help, feel free to start answering or ask for clarification!`;
      }
      playKnowLumiTTS(feedback);
      appendToChatFeed(feedback, 'KnowLumi AI Agent');
    }, 10000); // 10 seconds

    // Schedule auto-advance after 60s inactivity
    scheduleAutoAdvanceAfterInactivity();
  }

  // Show answer if already answered
  if (userAnswers[aiCurrent]) {
    const aDiv = document.createElement('div');
    aDiv.className = 'flex flex-row items-end gap-2 mb-6 animate-fade-in';
    aDiv.innerHTML = `<div class="bg-green-50 rounded-2xl px-5 py-3 text-green-900 font-medium shadow border border-green-100 max-w-[90%]">${userAnswers[aiCurrent]}</div><span class="text-xs text-gray-400 ml-1">You</span>`;
    feed.appendChild(aDiv);
  }


  // Start/reset timer for each question
  startQuestionTimer();

  // Show input only for current question
  const answerInput = document.getElementById('ai-answer-input');
  const submitBtn = document.getElementById('submit-answer-btn');
  const nextBtn = document.getElementById('next-question');
  if (!isFollowupActive && aiQuestions.length > 0) {
    answerInput.value = '';
    answerInput.classList.remove('hidden');
    submitBtn.classList.remove('hidden');
    // Reset silence timer on input
    answerInput.oninput = () => {
      if (silenceTimeout) {
        clearTimeout(silenceTimeout);
        silenceTimeout = setTimeout(() => {
          let feedback;
          if (userAnswers[aiCurrent]) {
            feedback = generateKnowLumiFeedback(cleanQuestion, userAnswers[aiCurrent]);
          } else {
            feedback = `If you need help, feel free to start answering or ask for clarification!`;
          }
          playKnowLumiTTS(feedback);
          appendToChatFeed(feedback, 'KnowLumi AI Agent');
        }, 10000);
      }
      // Reset inactivity auto-advance timer on input
      if (silenceAdvanceTimeout) clearTimeout(silenceAdvanceTimeout);
      scheduleAutoAdvanceAfterInactivity();
    };

  } else {
    answerInput.classList.add('hidden');
    submitBtn.classList.add('hidden');
  }
  // Next Question button logic
  if (
    !isFollowupActive &&
    aiQuestions.length > 0 &&
    userAnswers[aiCurrent] &&
    aiCurrent < aiQuestions.length - 1
  ) {
    nextBtn.classList.remove('hidden');
    nextBtn.onclick = () => {
      aiCurrent++;
      showAIQuestion();
    };
  } else {
    nextBtn.classList.add('hidden');
    nextBtn.onclick = null;
  }
}

// Track user answers
let userAnswers = [];

// Update answer submission logic to store answers
// (replace original submit-answer-btn onclick)
document.getElementById('submit-answer-btn').onclick = async function() {
  const answerInput = document.getElementById('ai-answer-input');
  const userAnswer = answerInput.value.trim();
  if (!userAnswer) return;
  userAnswers[aiCurrent] = userAnswer;
  appendToChatFeed(userAnswer, 'You');
  answerInput.value = '';
  answerInput.disabled = true;
  this.disabled = true;
  if (!isFollowupActive) {
    // Request follow-up based on main question and user answer
    isFollowupActive = true;
    document.getElementById('ai-questions').textContent = 'Generating follow-up...';
    try {
      const resp = await fetch('/api/gemini-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          main_question: aiQuestions[aiCurrent],
          user_answer: userAnswer,
          jobdesc: resumeContext.jobdesc,
          resumeText: resumeContext.resumeText
        })
      });
      const data = await resp.json();
      aiFollowup = data.followup;
      appendAIToChatFeed(aiFollowup);
      showAIQuestion();
    } catch (e) {
      aiFollowup = null;
      document.getElementById('ai-questions').textContent = 'Error generating follow-up.';
      isFollowupActive = false;
    }
  } else {
    // After follow-up, allow next question
    isFollowupActive = false;
    aiFollowup = null;
    if (aiCurrent < aiQuestions.length - 1) {
      aiCurrent++;
      showAIQuestion();
      document.getElementById('next-question').classList.remove('hidden');
    } else {
      document.getElementById('ai-questions').textContent = 'Interview complete!';
      document.getElementById('ai-answer-input').classList.add('hidden');
      document.getElementById('submit-answer-btn').classList.add('hidden');
    }
  }
  answerInput.disabled = false;
  this.disabled = false;
  // Schedule auto-advance after 2s if user doesn't interact
  scheduleAutoAdvanceAfterSilence();
};

document.addEventListener('DOMContentLoaded', async function() {
  // --- Camera auto-start logic ---
  if (typeof cameraFeed !== 'undefined' && cameraFeed && videoOn) {
    try {
      await startVideo();
      console.log('Camera started automatically on load.');
    } catch (err) {
      console.error('Error starting camera on load:', err);
    }
  } else {
    console.warn('cameraFeed element not found on DOMContentLoaded.');
  }

  // Fetch data and generate questions
  resumeContext = await fetchLatestResumeJson();
  if (!resumeContext) {
    document.getElementById('ai-questions').textContent = 'No resume data found.';
    return;
  }
  aiQuestions = await generateQuestionsWithGemini(resumeContext.jobdesc, resumeContext.resumeText);
  aiCurrent = 0;
  aiFollowup = null;
  isFollowupActive = false;
  showAIQuestion();

  // --- Voice Answer Logic (auto-capture when mic is off) ---
  let recognition = null;
  let recognizing = false;
  let answerInput = document.getElementById('ai-answer-input');
  let submitBtn = document.getElementById('submit-answer-btn');

  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = function() {
      recognizing = true;
      if (answerInput) answerInput.placeholder = 'Listening...';
    };
    recognition.onend = function() {
      recognizing = false;
      if (answerInput) answerInput.placeholder = 'Type your answer here...';
      // If mic is still off, restart recognition (for continuous experience)
      if (!micOn) {
        try { recognition.start(); } catch (e) {}
      }
    };
    recognition.onerror = function() {
      recognizing = false;
      if (answerInput) answerInput.placeholder = 'Type your answer here...';
      // Try to restart if mic is off
      if (!micOn) {
        setTimeout(() => { try { recognition.start(); } catch (e) {} }, 500);
      }
    };
    recognition.onresult = function(event) {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      if (answerInput) answerInput.value = transcript;
    };

    // Listen for mic state changes
    function updateSpeechRecognition() {
      if (!micOn) {
        // Start recognition if not already running
        if (!recognizing) {
          try { recognition.start(); } catch (e) {}
        }
      } else {
        // Stop recognition if running
        if (recognizing) {
          recognition.stop();
        }
      }
    }
    // Patch mic button event to update speech recognition
    const controlMicBtn = document.querySelector('button[title="Mic Off"]');
    if (controlMicBtn) {
      controlMicBtn.addEventListener('click', function() {
        setTimeout(updateSpeechRecognition, 300); // Wait for micOn to update
      });
    }
    // Also update on page load
    updateSpeechRecognition();
  }

  // Submit answer logic
  document.getElementById('submit-answer-btn').onclick = async function() {
    const answerInput = document.getElementById('ai-answer-input');
    const userAnswer = answerInput.value.trim();
    if (!userAnswer) return;
    appendToChatFeed(userAnswer, 'You');
    answerInput.value = '';
    answerInput.disabled = true;
    this.disabled = true;
    if (!isFollowupActive) {
      // Request follow-up based on main question and user answer
      isFollowupActive = true;
      document.getElementById('ai-questions').textContent = 'Generating follow-up...';
      try {
        const resp = await fetch('/api/gemini-followup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            main_question: aiQuestions[aiCurrent],
            user_answer: userAnswer,
            jobdesc: resumeContext.jobdesc,
            resumeText: resumeContext.resumeText
          })
        });
        const data = await resp.json();
        aiFollowup = data.followup;
        appendAIToChatFeed(aiFollowup);
        showAIQuestion();
      } catch (e) {
        aiFollowup = null;
        document.getElementById('ai-questions').textContent = 'Error generating follow-up.';
        isFollowupActive = false;
      }
    } else {
      // After follow-up, allow next question
      isFollowupActive = false;
      aiFollowup = null;
      if (aiCurrent < aiQuestions.length - 1) {
        aiCurrent++;
        showAIQuestion();
        document.getElementById('next-question').classList.remove('hidden');
      } else {
        document.getElementById('ai-questions').textContent = 'Interview complete!';
        document.getElementById('ai-answer-input').classList.add('hidden');
        document.getElementById('submit-answer-btn').classList.add('hidden');
      }
    }
    answerInput.disabled = false;
    this.disabled = false;
  };

  document.getElementById('next-question').onclick = function() {
    if (aiCurrent < aiQuestions.length - 1) {
      aiCurrent++;
      aiFollowup = null;
      isFollowupActive = false;
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
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch (err) {
      // Show placeholder if camera fails
      if (cameraFeed) {
        cameraFeed.style.display = 'none';
        let parent = cameraFeed.parentElement;
        let placeholder = parent.querySelector('.camera-placeholder');
        if (!placeholder) {
          placeholder = document.createElement('div');
          placeholder.className = 'camera-placeholder absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-500 rounded-[2.2rem] z-10';
          placeholder.innerHTML = '<span style="font-size:1.2rem;">Camera unavailable</span><span style="font-size:0.95rem;">Check browser permissions or connect a webcam.</span>';
          parent.appendChild(placeholder);
        }
      }
      console.error('Could not access camera:', err);
      return;
    }
  }
  if (cameraFeed) {
    cameraFeed.srcObject = videoStream;
    cameraFeed.style.display = '';
    // Remove placeholder if present
    let parent = cameraFeed.parentElement;
    let placeholder = parent.querySelector('.camera-placeholder');
    if (placeholder) parent.removeChild(placeholder);
    cameraFeed.play();
  }
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