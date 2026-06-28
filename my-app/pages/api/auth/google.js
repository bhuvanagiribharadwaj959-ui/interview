import { db } from '@/lib/firebaseClient';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { createAuthToken, normalizeEmail } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { email, displayName, uid } = req.body || {};

    const safeEmail = normalizeEmail(email);

    if (!safeEmail) {
      return res.status(400).json({ error: 'Email is required for Google login.' });
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', safeEmail));
    const querySnapshot = await getDocs(q);

    let userDoc;
    let userId;

    if (querySnapshot.empty) {
      // Create user if they don't exist
      const now = new Date();
      const result = await addDoc(usersRef, {
        name: displayName || 'Google User',
        email: safeEmail,
        firebaseUid: uid,
        createdAt: now.toISOString(),
      });
      userId = result.id;
      userDoc = {
        name: displayName || 'Google User',
        email: safeEmail,
      };
    } else {
      userId = querySnapshot.docs[0].id;
      userDoc = querySnapshot.docs[0].data();
    }

    const user = {
      id: userId,
      name: userDoc.name,
      email: userDoc.email,
    };

    const token = createAuthToken(user);

    return res.status(200).json({ message: 'Login successful.', user, token });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to process Google login.',
      message: error?.message || 'Unknown error',
    });
  }
}

