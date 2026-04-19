import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDocFromServer, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Upsert user profile
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const snap = await getDocFromServer(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, {
              displayName: currentUser.displayName || 'Anonymous Cinephile',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
        } catch (e) {
          console.error("Error creating user profile", e);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        console.warn('Sign-in popup was cancelled by the user or by a new request.');
      } else {
        console.error('Authentication error:', error);
      }
    }
  };

  const logOut = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
