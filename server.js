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

// Gemini API proxy endpoint
app.post('/api/gemini-interview-questions', async (req, res) => {
  const { jobdesc, resumeText } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Gemini API key not set' });
  if (!jobdesc || !resumeText) return res.status(400).json({ error: 'Missing jobdesc or resumeText' });

  const prompt = `Generate 5 interview questions for a candidate based on the following resume and job description.\nResume: ${resumeText}\nJob Description: ${jobdesc}`;
  try {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );
    const data = await geminiRes.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let questions = text
      .split(/\n+/)
      .map(q => q.replace(/^\d+\.\s*/, '').trim())
      .filter(q => q.length > 0);
    res.json({ questions });
  } catch (err) {
    res.status(500).json({ error: 'Gemini API call failed', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
