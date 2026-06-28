import { db } from '@/lib/firebaseClient';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
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

    let userDoc;
    let userId;

    if (uid) {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        userId = uid;
        userDoc = userSnap.data();
      } else {
        // Fallback check by email just in case they were registered without UID
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', safeEmail));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          userId = docSnap.id;
          userDoc = docSnap.data();
          
          // Link UID
          await updateDoc(docSnap.ref, {
            firebaseUid: uid,
            updatedAt: new Date().toISOString()
          });
        } else {
          // Create new user using the uid as the document ID
          const now = new Date();
          await setDoc(userRef, {
            name: displayName || safeEmail.split('@')[0],
            email: safeEmail,
            firebaseUid: uid,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            authProvider: 'firebase',
          });
          userId = uid;
          userDoc = {
            name: displayName || safeEmail.split('@')[0],
            email: safeEmail,
          };
        }
      }
    } else {
      // Fallback if no uid is provided
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', safeEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        const now = new Date();
        const result = await addDoc(usersRef, {
          name: displayName || safeEmail.split('@')[0],
          email: safeEmail,
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
