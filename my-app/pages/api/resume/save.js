import { db } from '@/lib/firebaseClient';
import { collection, addDoc } from 'firebase/firestore';
import { verifyAuthToken } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const decoded = verifyAuthToken(token);
  if (!decoded || !decoded.id) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  const userId = decoded.id;
  const { rawText, skills = [], experienceYrs = 0 } = req.body;

  try {
    const resumesRef = collection(db, 'users', userId, 'resumes');
    const result = await addDoc(resumesRef, {
      rawText,
      skills,
      experienceYrs,
      uploadedAt: new Date()
    });

    return res.status(200).json({ success: true, resumeId: result.id });
  } catch (error) {
    console.error('Error saving resume:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
