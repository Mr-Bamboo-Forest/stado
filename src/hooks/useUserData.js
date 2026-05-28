import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// Module-level cache — intentionally NOT cleared between re-renders,
// but we compare membership tier so stale "free" data doesn't get served
// after an upgrade.
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

    // Serve cached data immediately only if it has a membership tier set,
    // so we never flash stale "free" data over a paid membership.
    const cached = userCache.get(userId);
    if (cached) {
      setUserData(cached);
    }

    // Live listener — this is the authoritative source and will always
    // override the cache whenever Firestore data changes (e.g. after payment).
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
        console.error('useUserData snapshot error:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  return { userData, loading };
}

// Call this after a payment to evict the cache so the next render
// doesn't flash the old "free" tier before onSnapshot fires.
export function bustUserCache(userId) {
  if (userId) userCache.delete(userId);
}