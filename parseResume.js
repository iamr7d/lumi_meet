// Utility to parse PDF and save as TXT using pdf-parse
const fs = require('fs');
const pdfParse = require('pdf-parse');

async function parseAndSaveTxt(pdfPath, txtPath) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);
    fs.writeFileSync(txtPath, data.text, 'utf8');
    return true;
  } catch (err) {
    console.error('PDF parsing error:', err);
    return false;
  }
}

module.exports = parseAndSaveTxt;
