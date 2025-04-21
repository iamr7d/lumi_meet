require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const parseAndSaveTxt = require('./parseResume');

const app = express();
const PORT = 3001;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Multer storage config for custom filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const name = req.body.name.replace(/[^a-zA-Z0-9]/g, '_');
    const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    cb(null, `${name}_${date}.pdf`);
  }
});
const upload = multer({ storage });

// Parse form fields
app.use(express.urlencoded({ extended: true }));

// Serve uploads directory as static for JSON access
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());

// Serve static files for frontend
app.use(express.static(__dirname));

app.post('/upload', upload.single('resume'), async (req, res) => {
  const { name, college, jobdesc } = req.body;
  const pdfPath = path.join(uploadsDir, req.file.filename);
  const jsonPath = pdfPath.replace(/\.pdf$/i, '.json');

  // Parse PDF to get resume text
  let resumeText = '';
  try {
    const pdfParse = require('pdf-parse');
    const dataBuffer = require('fs').readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);
    resumeText = data.text;
  } catch (err) {
    resumeText = '';
  }

  // Save all info as JSON
  const jsonObj = {
    name,
    college,
    jobdesc,
    resumeText
  };
  require('fs').writeFileSync(jsonPath, JSON.stringify(jsonObj, null, 2), 'utf8');

  res.json({ success: true, filename: req.file.filename });
});

// Gemini API proxy endpoint using @google/generative-ai SDK
const { GoogleGenerativeAI } = require('@google/generative-ai');

app.post('/api/gemini-interview-questions', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Gemini API key not set' });

  // Accept real-time input (preferred): resumeJson, jobdesc, questionIndex
  let resumeText = '', jobdesc = '', questionIndex = 0;
  if (req.body && (req.body.resumeJson || req.body.resumeText)) {
    // Real-time mode
    resumeText = req.body.resumeText || (req.body.resumeJson && req.body.resumeJson.resumeText) || '';
    jobdesc = req.body.jobdesc || (req.body.resumeJson && req.body.resumeJson.jobdesc) || '';
    questionIndex = typeof req.body.questionIndex === 'number' ? req.body.questionIndex : 0;
  } else {
    // Legacy: Find the latest valid .json file in uploads
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.json'));
    if (!files.length) return res.status(400).json({ error: 'No resume JSON found' });
    let jsonData = null;
    let usedFile = null;
    for (const file of files.sort((a, b) => fs.statSync(path.join(uploadsDir, b)).mtimeMs - fs.statSync(path.join(uploadsDir, a)).mtimeMs)) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(uploadsDir, file), 'utf8'));
        if (typeof data === 'object' && data !== null) {
          jsonData = data;
          usedFile = file;
          break;
        }
      } catch (e) {
        console.warn('Skipping corrupt JSON file:', file);
        continue;
      }
    }
    if (!jsonData) return res.status(400).json({ error: 'No valid resume JSON found' });
    jobdesc = jsonData.jobdesc || '';
    resumeText = jsonData.resumeText || '';
    if (!jobdesc) {
      console.warn('Warning: jobdesc missing in latest resume JSON');
      jobdesc = 'No job description provided.';
    }
    if (!resumeText) {
      console.warn('Warning: resumeText missing in latest resume JSON');
      resumeText = 'No resume text available.';
    }
    questionIndex = 0;
  }

  const agents = [
  {
    name: "Dr. Arjun Sharma",
    role: "Principal Software Architect",
    style: "analytical and methodical, focuses on system design and architecture",
    specialty: "system design, architecture, scalability"
  },
  {
    name: "Priya Venkatesh",
    role: "Senior Engineering Manager",
    style: "pragmatic and business-focused, interested in leadership and teamwork",
    specialty: "leadership, teamwork, project management"
  },
  {
    name: "Vikram Mehta",
    role: "Lead Backend Developer",
    style: "code-oriented and detail-driven, focuses on backend and implementation",
    specialty: "backend coding, technical implementation, problem-solving"
  },
  {
    name: "Divya Patel",
    role: "DevOps Specialist",
    style: "automation-focused and security-conscious, specializes in infrastructure and operations",
    specialty: "DevOps, infrastructure, automation, security"
  }
];

// Real-time, single-question prompt
const agent = agents[questionIndex % agents.length];
const prompt = `You are simulating a real Indian technical interview panel. You are currently acting as ${agent.name}, ${agent.role}, who is ${agent.style} (specialty: ${agent.specialty}).

Given the following candidate resume and job description, generate the next interview question (number ${questionIndex + 1}) that is highly relevant to the candidate's background and the job requirements. Make it specific, context-aware, and from your unique perspective. Do not repeat previous questions. Do not provide feedback or commentary, only the question as it would be spoken aloud.\n\nResume: ${resumeText}\nJob Description: ${jobdesc}`;

  try {
    console.log('Gemini prompt (first 200 chars):', prompt.slice(0, 200), '...');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    let text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // Clean up: Remove markdown, numbering, or extra commentary
    text = text.replace(/^\d+\.\s*/, '').replace(/^Q\d+:\s*/, '').trim();
    res.json({ question: text });
  } catch (err) {
    console.error('Gemini API call failed:', err);
    if (err && err.stack) console.error('Stack trace:', err.stack);
    res.status(500).json({ error: 'Gemini API call failed', details: err.message, stack: err.stack });
  }
});

// Gemini follow-up question endpoint
app.post('/api/gemini-followup', async (req, res) => {
  const { main_question, user_answer, jobdesc, resumeText } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Gemini API key not set' });
  if (!main_question || !user_answer) return res.status(400).json({ error: 'Missing main_question or user_answer' });

  const prompt = `Given the following main interview question and the candidate's answer, generate a realistic follow-up question that a human interviewer would ask to dig deeper or clarify, based on this answer. Return only the follow-up question as a string.\n\nMain question: ${main_question}\nCandidate's answer: ${user_answer}\nJob Description: ${jobdesc || ''}\nResume: ${resumeText || ''}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    let text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ followup: text });
  } catch (err) {
    res.status(500).json({ error: 'Gemini follow-up failed', details: err.message });
  }
});

app.get('/api/latest-resume', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const uploadsDir = path.join(__dirname, 'uploads');
  const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.json'));
  if (!files.length) return res.status(404).json({ error: 'No resume JSON found' });
  const latest = files.sort((a, b) => fs.statSync(path.join(uploadsDir, b)).mtimeMs - fs.statSync(path.join(uploadsDir, a)).mtimeMs)[0];
  const jsonPath = path.join(uploadsDir, latest);
  try {
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    res.json(jsonData);
  } catch (e) {
    res.status(500).json({ error: 'Failed to parse resume JSON' });
  }
});

// Rate answer in bands from multiple perspectives and save
app.post('/api/gemini-rate-answer', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Gemini API key not set' });
  const { question, answer } = req.body;
  if (!question || !answer) return res.status(400).json({ error: 'Missing question or answer' });

  // Interviewers (same as above)
  const interviewers = [
    {
      name: "Dr. Arjun Sharma",
      role: "Principal Software Architect",
      style: "analytical and methodical, focuses on system design and architecture",
      specialty: "system design, architecture, scalability"
    },
    {
      name: "Priya Venkatesh",
      role: "Senior Engineering Manager",
      style: "pragmatic and business-focused, interested in leadership and teamwork",
      specialty: "leadership, teamwork, project management"
    },
    {
      name: "Vikram Mehta",
      role: "Lead Backend Developer",
      style: "code-oriented and detail-driven, focuses on backend and implementation",
      specialty: "backend coding, technical implementation, problem-solving"
    },
    {
      name: "Divya Patel",
      role: "DevOps Specialist",
      style: "automation-focused and security-conscious, specializes in infrastructure and operations",
      specialty: "DevOps, infrastructure, automation, security"
    }
  ];

  const bands = [
    "0-10", "10-20", "20-30", "30-40", "40-50", "50-60", "60-70", "70-80", "80-90", "90-100"
  ];

  const genAI = new (require('@google/generative-ai').GoogleGenerativeAI)(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // For each interviewer, ask Gemini to rate the answer in a band and provide feedback
  const ratings = [];
  for (const interviewer of interviewers) {
    const prompt = `You are ${interviewer.name}, a ${interviewer.role} (${interviewer.style}, specialty: ${interviewer.specialty}). \n\nRate the following candidate answer to the question, from your unique professional perspective. \n\nQuestion: ${question}\nAnswer: ${answer}\n\nGive ONLY:\n1. The score band (choose one: 0-10, 10-20, ..., 90-100)\n2. A brief justification (1-2 sentences) from your perspective.\nFormat your response as: Band: <band>\nFeedback: <justification>`;
    try {
      const result = await model.generateContent(prompt);
      let text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      // Parse band and feedback
      let bandMatch = text.match(/Band:\s*([0-9]{1,2}-[0-9]{1,3})/);
      let feedbackMatch = text.match(/Feedback:\s*(.*)/);
      ratings.push({
        interviewer: interviewer.name,
        role: interviewer.role,
        band: bandMatch ? bandMatch[1] : null,
        feedback: feedbackMatch ? feedbackMatch[1] : text
      });
    } catch (err) {
      ratings.push({
        interviewer: interviewer.name,
        role: interviewer.role,
        band: null,
        feedback: `Gemini API error: ${err.message}`
      });
    }
  }

  // Save to user_interview_history.json
  const fs = require('fs');
  const historyPath = require('path').join(__dirname, 'user_interview_history.json');
  let history = [];
  if (fs.existsSync(historyPath)) {
    try {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch (e) { history = []; }
  }
  history.push({
    timestamp: new Date().toISOString(),
    question,
    answer,
    ratings
  });
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8');

  res.json({ ratings });
});

// Rate all answers in a session, return ratings over time and a final verdict
app.post('/api/gemini-rate-session', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Gemini API key not set' });
  const { answers } = req.body; // [{question, answer, timestamp}]
  if (!Array.isArray(answers) || answers.length === 0) return res.status(400).json({ error: 'No answers provided' });

  const interviewers = [
    {
      name: "Dr. Arjun Sharma",
      role: "Principal Software Architect",
      style: "analytical and methodical, focuses on system design and architecture",
      specialty: "system design, architecture, scalability"
    },
    {
      name: "Priya Venkatesh",
      role: "Senior Engineering Manager",
      style: "pragmatic and business-focused, interested in leadership and teamwork",
      specialty: "leadership, teamwork, project management"
    },
    {
      name: "Vikram Mehta",
      role: "Lead Backend Developer",
      style: "code-oriented and detail-driven, focuses on backend and implementation",
      specialty: "backend coding, technical implementation, problem-solving"
    },
    {
      name: "Divya Patel",
      role: "DevOps Specialist",
      style: "automation-focused and security-conscious, specializes in infrastructure and operations",
      specialty: "DevOps, infrastructure, automation, security"
    }
  ];

  const genAI = new (require('@google/generative-ai').GoogleGenerativeAI)(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // For each answer, rate from each perspective
  const sessionRatings = [];
  for (const ansObj of answers) {
    const { question, answer, timestamp } = ansObj;
    const ratings = [];
    for (const interviewer of interviewers) {
      const prompt = `You are ${interviewer.name}, a ${interviewer.role} (${interviewer.style}, specialty: ${interviewer.specialty}).\n\nRate the following candidate answer to the question, from your unique professional perspective.\n\nQuestion: ${question}\nAnswer: ${answer}\n\nGive ONLY:\n1. The score band (choose one: 0-10, 10-20, ..., 90-100)\n2. A brief justification (1-2 sentences) from your perspective.\nFormat your response as: Band: <band>\nFeedback: <justification>`;
      try {
        const result = await model.generateContent(prompt);
        let text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        let bandMatch = text.match(/Band:\s*([0-9]{1,2}-[0-9]{1,3})/);
        let feedbackMatch = text.match(/Feedback:\s*(.*)/);
        ratings.push({
          interviewer: interviewer.name,
          role: interviewer.role,
          band: bandMatch ? bandMatch[1] : null,
          feedback: feedbackMatch ? feedbackMatch[1] : text
        });
      } catch (err) {
        ratings.push({
          interviewer: interviewer.name,
          role: interviewer.role,
          band: null,
          feedback: `Gemini API error: ${err.message}`
        });
      }
    }
    sessionRatings.push({ question, answer, timestamp, ratings });
  }

  // Compute a simple final verdict (average band, etc.)
  let total = 0, count = 0;
  sessionRatings.forEach(qr => {
    qr.ratings.forEach(r => {
      if (r.band) {
        // Use the upper bound of the band for averaging
        let upper = parseInt(r.band.split('-')[1] || '0', 10);
        total += upper;
        count++;
      }
    });
  });
  const avgScore = count > 0 ? total / count : 0;
  let verdict = 'Needs Improvement';
  if (avgScore >= 80) verdict = 'Outstanding';
  else if (avgScore >= 60) verdict = 'Strong Candidate';
  else if (avgScore >= 40) verdict = 'Average';

  // Store session results for plotting
  const fs = require('fs');
  const historyPath = require('path').join(__dirname, 'user_interview_session_history.json');
  let history = [];
  if (fs.existsSync(historyPath)) {
    try {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch (e) { history = []; }
  }
  history.push({
    timestamp: new Date().toISOString(),
    sessionRatings,
    avgScore,
    verdict
  });
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8');

  res.json({ sessionRatings, avgScore, verdict });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
