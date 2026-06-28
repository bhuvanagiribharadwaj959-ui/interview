import { db } from '@/lib/firebaseClient';
import { collection, query, where, getDocs, addDoc, updateDoc } from 'firebase/firestore';
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
      return res.status(400).json({ error: 'Email is required.' });
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
        name: displayName || safeEmail.split('@')[0],
        email: safeEmail,
        firebaseUid: uid,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        authProvider: 'firebase',
      });
      userId = result.id;
      userDoc = {
        name: displayName || safeEmail.split('@')[0],
        email: safeEmail,
      };
    } else {
      const docSnap = querySnapshot.docs[0];
      userId = docSnap.id;
      userDoc = docSnap.data();

      // If the user exists but doesn't have firebaseUid linked, link it now
      if (!userDoc.firebaseUid && uid) {
        await updateDoc(docSnap.ref, {
          firebaseUid: uid,
          updatedAt: new Date().toISOString()
        });
      }
    }

    const user = {
      id: userId,
      name: userDoc.name,
      email: userDoc.email,
    };

    const token = createAuthToken(user);

    return res.status(200).json({ message: 'Session authenticated successfully.', user, token });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to process session authentication.',
      message: error?.message || 'Unknown error',
    });
  }
}
