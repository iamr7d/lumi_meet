// Tester script for Gemini interview question generation
// Usage: node test_gemini_questions.js

const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
require("dotenv").config();

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No GEMINI_API_KEY in .env");
    process.exit(1);
  }

  // Load a sample resume JSON (edit filename as needed)
  let resumeJson;
  try {
    resumeJson = JSON.parse(fs.readFileSync("./uploads/fffffffffffff_2025-04-20T14-58-10.json", "utf8"));
  } catch (e) {
    console.error("Could not read sample resume JSON:", e);
    process.exit(1);
  }

  const prompt = `Generate 5 main interview questions for a candidate based on the following resume and job description.\nFor each main question, also generate 2-3 realistic follow-up questions that a human interviewer might ask to dig deeper or clarify, based on the candidate's likely answers.\nReturn ONLY a valid JSON array, where each item is:\n{\n  \"main_question\": string,\n  \"type\": string,\n  \"topic\": string,\n  \"follow_ups\": string[]\n}\nDo not include any explanation or text outside the JSON array.\nResume: ${resumeJson.resumeText}\nJob Description: ${resumeJson.jobdesc}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    let text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let questions;
    try {
      // Try to extract the JSON array from the response if extra text is present
      const match = text.match(/\[.*\]/s);
      if (match) {
        questions = JSON.parse(match[0]);
      } else {
        questions = JSON.parse(text);
      }
    } catch (e) {
      console.error('Failed to parse Gemini response as JSON:', text);
      process.exit(1);
    }
    console.log("Structured Questions with Follow-ups:");
    questions.forEach((q, i) => {
      console.log(`Main Q${i+1}:`, q.main_question);
      console.log(`  Type: ${q.type} | Topic: ${q.topic}`);
      if (q.follow_ups && q.follow_ups.length) {
        q.follow_ups.forEach((fu, j) => {
          console.log(`    Follow-up ${j+1}: ${fu}`);
        });
      }
      console.log('');
    });
  } catch (err) {
    console.error("Gemini API call failed:", err);
  }
}

main();
