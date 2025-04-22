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

  // Find the latest valid .json file in uploads
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
  let jobdesc = jsonData.jobdesc || '';
  let resumeText = jsonData.resumeText || '';
  if (!jobdesc) {
    console.warn('Warning: jobdesc missing in latest resume JSON');
    jobdesc = 'No job description provided.';
  }
  if (!resumeText) {
    console.warn('Warning: resumeText missing in latest resume JSON');
    resumeText = 'No resume text available.';
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

const prompt = `You are simulating a real Indian technical interview panel. There are four panelists, each with a unique personality and area of focus. For the candidate below, generate a sequence of questions as follows:

- Each question should be asked by a single panelist, rotating through the panel (one per question).
- For each question, use the panelist's name, role, style, and specialty to guide the question content and tone. Reference their perspective directly (e.g., as a DevOps Specialist, as a Senior Engineering Manager, etc.).
- Make each question context-aware, relevant to the candidate's resume and the job description.
- After each answer, provide a brief, agent-specific feedback or follow-up, reflecting the panelist's style (e.g., praise, critique, or probing question).
- Start with a warm welcome and candidate introduction. End with a closing question.
- Do not use markdown, numbering, or extra commentary—just the questions and feedback as they would be spoken aloud.

Panelists:
${agents.map(a => `- ${a.name} (${a.role}): ${a.style}`).join('\n')}

Resume: ${resumeText}
Job Description: ${jobdesc}`;

  try {
    console.log('Gemini prompt (first 200 chars):', prompt.slice(0, 200), '...');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    // The SDK returns an object with response.candidates[0].content.parts[0].text
    let text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let questions = [];
    // Try to split by numbered list first
    let numbered = text.match(/\d+\.\s+[^\d]+/g);
    if (numbered && numbered.length >= 3) {
      questions = numbered.map(q => q.replace(/^\d+\.\s*/, '').trim());
    } else {
      // Fallback: split by double newlines or single newlines
      questions = text.split(/\n{2,}|\n/).map(q => q.trim()).filter(q => q.length > 0);
    }
    // If still only one "question", treat the whole block as instructions, not a question list
    if (questions.length < 2) {
      questions = [text];
    }
    res.json({ questions });
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
