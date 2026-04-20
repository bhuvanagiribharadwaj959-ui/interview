import { PDFParse } from 'pdf-parse';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fileData, fileName } = req.body || {};

  if (!fileData) {
    return res.status(400).json({ error: 'No file data provided' });
  }

  try {
    // Decode base64 to buffer
    const buffer = Buffer.from(fileData, 'base64');
    console.log(`Parsing resume: ${fileName}, size: ${buffer.length} bytes`);

    let text = '';

    if (fileName?.toLowerCase().endsWith('.pdf')) {
      const pdfParser = new PDFParse({ data: buffer });
      await pdfParser.load();
      const result = await pdfParser.getText();
      // getText returns TextResult with pages array, join all page texts
      text = result.pages.map(p => p.text).join('\n');
      pdfParser.destroy();
    } else {
      // For DOC/DOCX or text files — try plain text extraction
      text = buffer.toString('utf-8');
    }

    // Clean up extracted text
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!text || text.length < 20) {
      return res.status(400).json({
        error: 'Could not extract meaningful text from resume',
        hint: 'Please upload a text-based PDF (not scanned image)',
      });
    }

    console.log(`Extracted ${text.length} characters from resume`);

    return res.status(200).json({
      text,
      fileName,
      charCount: text.length,
    });
  } catch (error) {
    console.error('Resume parsing error:', error);
    return res.status(500).json({
      error: 'Failed to parse resume',
      message: error.message,
    });
  }
}
