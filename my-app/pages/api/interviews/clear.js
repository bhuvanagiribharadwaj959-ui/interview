import { db } from '@/lib/firebaseClient';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
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
    const interviewsRef = collection(db, 'interviews');
    const q = query(interviewsRef, where('userId', '==', decoded.id));
    const snapshot = await getDocs(q);
    
    let deletedCount = 0;
    const deletePromises = snapshot.docs.map(docSnapshot => {
      deletedCount++;
      return deleteDoc(doc(db, 'interviews', docSnapshot.id));
    });
    
    await Promise.all(deletePromises);

    return res.status(200).json({ message: 'History cleared', deletedCount });
  } catch (error) {
    console.error('Error clearing history:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

