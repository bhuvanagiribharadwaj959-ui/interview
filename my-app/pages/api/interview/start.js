import { getDb } from '@/lib/mongodb';
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
  const { type, difficulty } = req.body;

  try {
    const db = await getDb();
    const interviewsCollection = db.collection('interviews');

    const newInterview = {
      userId,
      startTime: new Date(),
      type: type || 'Mock Interview',
      difficulty: difficulty || 'Medium',
      status: 'in-progress',
      // Initial null values for scores
      readinessScore: 0,
      vocabularyScore: 0, 
      communicationScore: 0,
      technicalScore: 0,
      confidenceScore: 0,
      logicScore: 0,
      duration: '0 min'
    };

    const result = await interviewsCollection.insertOne(newInterview);
    
    return res.status(200).json({ 
      success: true, 
      interviewId: result.insertedId.toString() 
    });

  } catch (err) {
    console.error('Error starting interview:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
