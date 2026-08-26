import { db } from '@/lib/firebaseClient';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
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
    const interviewsRef = collection(db, 'users', userId, 'sessions');
    const q = query(interviewsRef);
    const querySnapshot = await getDocs(q);
    const interviews = querySnapshot.docs.map(doc => ({
      _id: doc.id,
      ...doc.data()
    })).sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0));
    return res.status(200).json(interviews);
  } catch (error) {
    console.warn('Firestore query notice in history.js:', error?.message || error);
    return res.status(200).json([]);
  }
}

