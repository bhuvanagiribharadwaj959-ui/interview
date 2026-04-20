import { getDb } from '@/lib/mongodb';
import { verifyAuthToken } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
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

  try {
    const db = await getDb();
    const interviewsCollection = db.collection('interviews');

    // Fetch all interviews for this user
    const interviews = await interviewsCollection
      .find({ userId: userId })
      .sort({ startTime: -1, date: -1 }) // Sort by startTime or date descending
      .toArray();

    return res.status(200).json(interviews);
  } catch (error) {
    console.error('Error fetching interview history:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
