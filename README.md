# LumiMeet – AI Interview Platform

![LumiMeet Banner](https://raw.githubusercontent.com/iamr7d/lumi_meet/main/banner.png)

A modern, AI-powered interview platform that leverages Google Gemini to generate dynamic interview questions based on your uploaded resume and job description. Built with Node.js, Express, and a beautiful Tailwind CSS frontend.

---

## 🚀 Features

- **AI-Powered Questions:**
  - Uses Google Gemini to generate tailored interview questions from your resume and job description.
- **Drag-and-Drop Resume Upload:**
  - Modern, compact dropzone UI for easy file uploads.
- **Secure Backend Proxy:**
  - API keys are never exposed to the frontend; all Gemini requests are proxied securely through Express.
- **Speech Recognition:**
  - Real-time, robust speech-to-text for interview simulation and feedback.
- **Beautiful UI:**
  - Responsive, modern design using Tailwind CSS and Font Awesome icons.
- **Performance Metrics:**
  - Displays AI performance scores and interview progress.

---

## 📸 Screenshots

![Interview Page](https://raw.githubusercontent.com/iamr7d/lumi_meet/main/screenshot1.png)

---

## 🛠️ Tech Stack

- **Frontend:** HTML, JavaScript, Tailwind CSS
- **Backend:** Node.js, Express
- **AI Integration:** Google Gemini (via secure backend proxy)
- **File Uploads:** Multer
- **PDF Parsing:** pdf-parse
- **Speech Recognition:** Web Speech API

---

## ⚡ Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/iamr7d/lumi_meet.git
cd lumi_meet
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
```
**Never commit your `.env` file!**

### 4. Start the server
```bash
node server.js
```
The server will run on [http://localhost:3001](http://localhost:3001)

---

## 📝 Usage

1. **Upload Resume:** Drag and drop your resume (PDF) and fill in your details and job description.
2. **Start Interview:**
    - The platform extracts your resume text and generates AI-powered questions.
    - Questions appear one by one on the interview page.
3. **Speech Recognition:**
    - Respond to questions using your mic. Real-time speech-to-text is shown.
4. **Performance Tracking:**
    - See your AI score and progress in real-time.

---

## 🔒 Security & Best Practices
- **API Key Security:**
  - Your Gemini API key is stored in `.env` and never sent to the browser.
- **.gitignore:**
  - `.env`, `node_modules/`, and `uploads/` are ignored by git to protect secrets and large files.

---

## 📂 Project Structure

```
├── index.html           # Main upload and entry page
├── interview.html       # Interview UI
├── interview.js         # Interview logic (AI, questions, speech)
├── upload.js            # Upload logic
├── dropzone.js          # Drag-and-drop UI
├── server.js            # Express backend (API, uploads, Gemini proxy)
├── parseResume.js       # PDF parsing logic
├── uploads/             # Uploaded resumes (gitignored)
├── .env                 # API keys (never commit)
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

---

## 🤖 AI Integration Details
- Uses Google Gemini (via REST API) to generate interview questions.
- Backend endpoint `/api/gemini-interview-questions` securely proxies requests.
- Resume/jobdesc parsed from the latest uploaded JSON.

---

## 💡 Customization & Deployment
- **Add more question types:** Modify the prompt in `server.js`.
- **Deploy:**
  - You can deploy on any Node.js-friendly host (Render, Heroku, Vercel, etc.).
  - Set your environment variables on the host for security.

---

## 🙏 Credits

- [Google Gemini](https://ai.google.dev/gemini-api/docs)
- [Tailwind CSS](https://tailwindcss.com/)
- [Font Awesome](https://fontawesome.com/)
- [pdf-parse](https://www.npmjs.com/package/pdf-parse)
- [Multer](https://www.npmjs.com/package/multer)

---

## 📬 Contact

- **Author:** Rahulraj PV ([LinkedIn](https://www.linkedin.com/in/rahulrajpv/))
- **Project:** [iamr7d/lumi_meet](https://github.com/iamr7d/lumi_meet)

---

> LumiMeet – Empowering modern interviews with AI.
