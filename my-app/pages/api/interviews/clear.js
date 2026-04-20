import { getDb } from '@/lib/mongodb';
import { verifyAuthToken } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const decoded = verifyAuthToken(token);
  if (!decoded || !decoded.id) return res.status(401).json({ error: 'Invalid token' });

  try {
    const db = await getDb();
    const result = await db.collection('interviews').deleteMany({ userId: decoded.id });
    return res.status(200).json({ message: 'History cleared', deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Error clearing history:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
