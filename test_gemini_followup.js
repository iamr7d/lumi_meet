// Test the /api/gemini-followup endpoint using a main question and user answer
const fetch = require('node-fetch');
const fs = require('fs');
require('dotenv').config();

async function main() {
  // Load resume JSON for context
  let resumeJson;
  try {
    resumeJson = JSON.parse(fs.readFileSync("./uploads/fffffffffffff_2025-04-20T14-58-10.json", "utf8"));
  } catch (e) {
    console.error("Could not read sample resume JSON:", e);
    process.exit(1);
  }

  const main_question = "Tell me about a project where you used Transformers, focusing on the specific challenges you faced and how you solved them.";
  const user_answer = "I used BERT for a text classification project at KnowLumi. The main challenge was handling imbalanced data, which I solved using data augmentation and class weighting.";

  const response = await fetch('http://localhost:3001/api/gemini-followup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      main_question,
      user_answer,
      jobdesc: resumeJson.jobdesc,
      resumeText: resumeJson.resumeText
    })
  });
  const data = await response.json();
  console.log('Follow-up question:', data.followup);
}

main();
