import { GoogleGenerativeAI } from '@google-ai/generativelanguage';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import chalk from 'chalk';
import 'dotenv/config';

// Replace with your actual API key
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// Define interviewer personalities
const INTERVIEWERS = [
    {
        name: "Dr. adam ghill",
        role: "Principal Software Architect",
        color: "blue",
        style: "analytical and methodical",
        specialty: "System Design and Architecture",
        intro: "Namaste, I am Dr. adam ghill, Principal Software Architect from IIT Delhi. I will be evaluating your architectural thinking and approach to complex system design problems.",
        topics: ["distributed systems", "scalability patterns", "microservices architecture", "database design", "system resilience"],
        tone: "formal and precise, often referencing established design principles",
        background: "20 years in enterprise architecture, previously at Infosys and TCS",
        voice_id: "male",
        voice_rate: 170,  // Words per minute
        voice_pitch: 0.9  // Relative pitch (0-2)
    },
    {
        name: "Priya Venkatesh",
        role: "Senior Engineering Manager",
        color: "magenta", 
        style: "pragmatic and business-focused",
        specialty: "Engineering Leadership",
        intro: "Hi there, myself Priya Venkatesh, Senior Engineering Manager from Bengaluru. I'm interested in how you approach technical leadership and make trade-offs when facing real-world constraints.",
        topics: ["project estimation", "technical leadership", "team coordination", "risk management", "technology selection"],
        tone: "conversational but probing, emphasizing practical experience",
        background: "Ex-Amazon, led engineering teams at Flipkart",
        voice_id: "female",
        voice_rate: 185,
        voice_pitch: 1.3
    },
    {
        name: "Vikram Mehta",
        role: "Lead Backend Developer",
        color: "green",
        style: "code-oriented and detail-driven",
        specialty: "Backend Implementation",
        intro: "Hello ji, Vikram Mehta here, Lead Backend Developer from Pune. I'll be diving into your coding practices, algorithm knowledge, and how you implement solutions to complex problems.",
        topics: ["algorithms", "data structures", "API design", "performance optimization", "concurrency"],
        tone: "straightforward and technical, likes specific examples and code discussions",
        background: "Full-stack developer specialized in high-performance systems",
        voice_id: "male",
        voice_rate: 195,
        voice_pitch: 1.0
    },
    {
        name: "Divya Patel",
        role: "DevOps Specialist",
        color: "yellow",
        style: "automation-focused and security-conscious",
        specialty: "Infrastructure and Operations",
        intro: "Greetings, I am Divya Patel, DevOps Specialist from Hyderabad. My questions will focus on deployment strategies, infrastructure automation, and operational excellence.",
        topics: ["CI/CD pipelines", "cloud architecture", "containerization", "infrastructure as code", "monitoring"],
        tone: "practical and tool-oriented, often mentioning specific technologies",
        background: "Cloud infrastructure expert with Google certification",
        voice_id: "female",
        voice_rate: 175,
        voice_pitch: 1.2
    },
    {
        name: "Rajesh Krishnan",
        role: "Security Engineer",
        color: "red",
        style: "detail-oriented and risk-aware",
        specialty: "Application Security",
        intro: "Good day, Rajesh Krishnan here, Security Engineer from Chennai. I will be examining your approach to secure development practices and threat mitigation strategies.",
        topics: ["secure coding", "authentication systems", "threat modeling", "data protection", "vulnerability assessment"],
        tone: "serious and methodical, often presents scenarios to test security awareness",
        background: "Previously worked in cybersecurity at Tata Consultancy Services",
        voice_id: "male",
        voice_rate: 165,
        voice_pitch: 0.85
    }
];


// Timer utility for tracking interview progress
class InterviewTimer {
  constructor(totalTimeInMinutes) {
    this.startTime = Date.now();
    this.totalTimeMs = totalTimeInMinutes * 60 * 1000;
  }

  getRemainingTime() {
    const elapsedMs = Date.now() - this.startTime;
    return Math.max(0, this.totalTimeMs - elapsedMs);
  }

  getRemainingTimeFormatted() {
    const remainingMs = this.getRemainingTime();
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  isTimeUp() {
    return this.getRemainingTime() <= 0;
  }

  getProgressPercentage() {
    return 100 - (this.getRemainingTime() / this.totalTimeMs * 100);
  }
}

// Print formatted message from a specific interviewer
function printInterviewerMessage(interviewer, message) {
  console.log('\n' + chalk[interviewer.color](`[${interviewer.name} - ${interviewer.role}]: `) + message);
}

// Generate interviewer's message based on their style
async function generateInterviewerMessage(interviewer, messageType, context = {}) {
  let prompt;
  
  switch(messageType) {
    case 'question':
      prompt = `As ${interviewer.name}, a ${interviewer.role} who is ${interviewer.style}, generate a ${context.difficulty} technical interview question about ${context.topic}. The question should reflect your specific expertise and interview style.`;
      break;
    case 'analysis':
      prompt = `As ${interviewer.name}, a ${interviewer.role} who is ${interviewer.style}, analyze the following response to your question: "${context.question}" Response: "${context.response}". Provide feedback on technical accuracy, completeness, and depth from your professional perspective.`;
      break;
    case 'followUp':
      prompt = `As ${interviewer.name}, a ${interviewer.role} who is ${interviewer.style}, based on the candidate's response: "${context.response}" to your question: "${context.question}", generate a relevant follow-up question that digs deeper into the candidate's knowledge or challenges them further on specific aspects of their answer.`;
      break;
  }

  try {
    const result = await model.generateContent({ prompt });
    return result.response?.text() || `[Error generating ${messageType}]`;
  } catch (error) {
    console.error(`Error generating ${messageType}:`, error);
    return `[Error generating ${messageType}]`;
  }
}

// Generate candidate profile and evaluation criteria
async function generateCandidateProfile() {
  const prompt = "Generate a job description for a senior software engineer position, including required skills and experience.";
  try {
    const result = await model.generateContent({ prompt });
    return result.response?.text() || "Error generating profile";
  } catch (error) {
    console.error("Error generating candidate profile:", error);
    return "Error generating profile";
  }
}

// Generate overall evaluation report
async function generateEvaluationReport(interviewHistory, interviewerFeedback) {
  const prompt = `Based on the following interview history and feedback, generate a comprehensive evaluation report for the candidate. 
    
  Interview history: ${JSON.stringify(interviewHistory)}
  
  Interviewer feedback: ${JSON.stringify(interviewerFeedback)}
  
  The report should include:
  1. Overview of candidate performance
  2. Key strengths identified
  3. Areas for improvement
  4. Technical assessment (scale of 1-5)
  5. Communication assessment (scale of 1-5)
  6. Problem-solving assessment (scale of 1-5)
  7. Final recommendation (Hire, Consider, Do Not Hire)`;
  
  try {
    const result = await model.generateContent({ prompt });
    return result.response?.text() || "Error generating evaluation report";
  } catch (error) {
    console.error("Error generating evaluation report:", error);
    return "Error generating evaluation report";
  }
}

// Save interview transcript
function saveInterviewTranscript(interviewHistory, evaluationReport) {
  // Here you would implement file saving functionality
  console.log(chalk.cyan("\nInterview transcript would be saved to file (implementation not shown)"));
}

// Main interview function
async function runTechnicalInterview() {
  try {
    const rl = readline.createInterface({ input, output });
    const interviewHistory = [];
    const interviewerFeedback = {};
    
    // Interview configuration
    const interviewDuration = 45; // minutes
    const timer = new InterviewTimer(interviewDuration);
    const targetNumQuestions = 8;
    let completedQuestions = 0;
    
    // Display welcome message
    console.log(chalk.bold.yellow("\n=== TECHNICAL INTERVIEW SIMULATION ==="));
    console.log(chalk.yellow(`This interview will last up to ${interviewDuration} minutes with ${interviewers.length} different technical interviewers.`));
    
    // Display job profile
    const jobProfile = await generateCandidateProfile();
    console.log(chalk.white.bold("\nPOSITION OVERVIEW:"));
    console.log(jobProfile);
    interviewHistory.push({ role: "System", message: jobProfile });
    
    // Get candidate info
    const candidateName = await rl.question(chalk.cyan("\nPlease enter your name: "));
    console.log(chalk.green(`\nWelcome, ${candidateName}! The interview will begin momentarily.`));
    
    // Introductions from each interviewer
    console.log(chalk.white.bold("\n=== INTRODUCTIONS ==="));
    for (const interviewer of interviewers) {
      printInterviewerMessage(interviewer, interviewer.intro);
      interviewHistory.push({ speaker: interviewer.name, role: interviewer.role, message: interviewer.intro });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Slight delay between introductions
    }
    
    // Main interview loop
    console.log(chalk.white.bold("\n=== BEGINNING TECHNICAL QUESTIONS ==="));
    
    while (completedQuestions < targetNumQuestions && !timer.isTimeUp()) {
      // Display time remaining
      console.log(chalk.yellow(`\n[Time remaining: ${timer.getRemainingTimeFormatted()} | Progress: ${Math.round(completedQuestions / targetNumQuestions * 100)}%]`));
      
      // Select interviewer (rotate through them)
      const currentInterviewer = interviewers[completedQuestions % interviewers.length];
      
      // Determine question topic and difficulty based on interview progress
      let topic, difficulty;
      
      if (completedQuestions === 0) {
        // First question - ask candidate for preferences
        topic = await rl.question(chalk.cyan("\nWhat technical area would you like to start with? "));
        difficulty = "medium";
      } else {
        // Generate topic and difficulty based on progress
        const progress = completedQuestions / targetNumQuestions;
        
        // As interview progresses, increase difficulty
        if (progress < 0.3) difficulty = "medium";
        else if (progress < 0.7) difficulty = "challenging";
        else difficulty = "advanced";
        
        // Rotate through common technical topics based on interviewer
        const topicsByInterviewer = {
          "Alex": ["system architecture", "design patterns", "microservices", "scalability"],
          "Morgan": ["algorithms", "data structures", "code optimization", "debugging approaches"],
          "Taylor": ["CI/CD pipelines", "containerization", "cloud infrastructure", "monitoring solutions"],
          "Jordan": ["security vulnerabilities", "authentication systems", "data protection", "secure coding"]
        };
        
        const possibleTopics = topicsByInterviewer[currentInterviewer.name];
        topic = possibleTopics[Math.floor(Math.random() * possibleTopics.length)];
      }
      
      // Generate and display question
      const question = await generateInterviewerMessage(currentInterviewer, 'question', { topic, difficulty });
      printInterviewerMessage(currentInterviewer, question);
      interviewHistory.push({ speaker: currentInterviewer.name, role: currentInterviewer.role, message: question, type: "question", topic });
      
      // Get candidate response
      const response = await rl.question(chalk.white("\nYour answer: "));
      interviewHistory.push({ speaker: candidateName, role: "Candidate", message: response });
      
      // Generate interviewer analysis (not always shown to candidate)
      const analysis = await generateInterviewerMessage(currentInterviewer, 'analysis', { question, response });
      if (!interviewerFeedback[currentInterviewer.name]) {
        interviewerFeedback[currentInterviewer.name] = [];
      }
      interviewerFeedback[currentInterviewer.name].push({ question, response, analysis, topic });
      
      // Show brief reaction or follow-up based on analysis
      const followUp = await generateInterviewerMessage(currentInterviewer, 'followUp', { question, response });
      printInterviewerMessage(currentInterviewer, followUp);
      interviewHistory.push({ speaker: currentInterviewer.name, role: currentInterviewer.role, message: followUp, type: "followUp" });
      
      // Get candidate response to follow-up
      const followUpResponse = await rl.question(chalk.white("\nYour answer: "));
      interviewHistory.push({ speaker: candidateName, role: "Candidate", message: followUpResponse });
      
      // Update analysis with follow-up response
      const followUpAnalysis = await generateInterviewerMessage(currentInterviewer, 'analysis', { question: followUp, response: followUpResponse });
      interviewerFeedback[currentInterviewer.name].push({ question: followUp, response: followUpResponse, analysis: followUpAnalysis, topic });
      
      completedQuestions++;
      
      // Add a short transition if not at the end
      if (completedQuestions < targetNumQuestions && !timer.isTimeUp()) {
        const nextInterviewer = interviewers[completedQuestions % interviewers.length];
        console.log(chalk.yellow(`\n[Transitioning to questions from ${nextInterviewer.name}...]`));
        await new Promise(resolve => setTimeout(resolve, 1500)); // Brief pause between interviewers
      }
    }
    
    // Interview conclusion
    console.log(chalk.white.bold("\n=== INTERVIEW CONCLUSION ==="));
    
    if (timer.isTimeUp()) {
      console.log(chalk.yellow("\nTime limit reached."));
    } else {
      console.log(chalk.green("\nAll planned questions completed."));
    }
    
    // Thank the candidate
    const closingInterviewer = interviewers[0]; // Let the first interviewer close
    printInterviewerMessage(closingInterviewer, `Thank you for your time today, ${candidateName}. We appreciate your thorough responses and the technical knowledge you've demonstrated. The team will review your performance and get back to you soon with next steps.`);
    
    // Generate and display evaluation report (in a real scenario, this would be private)
    console.log(chalk.white.bold("\n=== EVALUATION REPORT ==="));
    console.log(chalk.yellow("Generating evaluation report... (in a real interview, this would not be shown to the candidate)"));
    
    const evaluationReport = await generateEvaluationReport(interviewHistory, interviewerFeedback);
    console.log(evaluationReport);
    
    // Save transcript option
    const saveTranscript = await rl.question(chalk.cyan("\nWould you like to save the interview transcript? (yes/no): "));
    if (saveTranscript.toLowerCase() === 'yes') {
      saveInterviewTranscript(interviewHistory, evaluationReport);
    }
    
    console.log(chalk.bold.green("\nInterview simulation completed. Thank you for participating!"));
    rl.close();
    
  } catch (error) {
    console.error("Error during interview:", error);
  }
}

// Start the interview
console.log(chalk.bold("\nTechnical Interview Simulation - Starting Up..."));
runTechnicalInterview();
