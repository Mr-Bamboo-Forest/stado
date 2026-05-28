import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const userCache = new Map();

export function useUserData(userId) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setUserData(null);
      setLoading(false);
      return;
    }

    // Serve cached data immediately
    if (userCache.has(userId)) {
      setUserData(userCache.get(userId));
    }

    // But keep listening for updates
    const unsubscribe = onSnapshot(
      doc(db, 'users', userId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          userCache.set(userId, data);
          setUserData(data);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  return { userData, loading };
}