import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';

export type ThemeMode = 'dark' | 'light';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  isError?: boolean;
  failedQuery?: string;
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isFirebaseUser: boolean;
  isAnonymous?: boolean;
}

interface AppContextValue {
  user: AppUser | null;
  authReady: boolean;
  favorites: number[];
  toggleFavorite: (n: number) => Promise<void>;
  isFavorite: (n: number) => boolean;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  clearChatHistory: () => void;
  logout: () => Promise<void>;
  setFallbackUser: (u: AppUser | null) => void;
  isTourOpen: boolean;
  startTour: () => void;
  closeTour: () => void;
  bgAnimated: boolean;
  toggleBgAnimated: () => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  refreshUser: () => Promise<void>;
  isUpgradeModalOpen: boolean;
  openUpgradeModal: () => void;
  closeUpgradeModal: () => void;
}

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  sender: 'bot',
  text: 'أهلًا بك! اسأل أنواء عن النجوم وأسمائها العربية وقصصها في تراثنا.',
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

const LOCAL_AUTH_KEY = 'anwaa_fallback_session';
const BG_STORAGE_KEY = 'anwaa_bg';
const THEME_STORAGE_KEY = 'anwaa_theme';

function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // ignore storage errors
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return 'dark';
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [fallbackUser, setFallbackUserState] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_AUTH_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [authReady, setAuthReady] = useState(false);
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      const savedUser = localStorage.getItem(LOCAL_AUTH_KEY);
      const parsedUser = savedUser ? JSON.parse(savedUser) : null;
      const uid = parsedUser?.uid || 'guest';
      const cached = localStorage.getItem(`anwaa_favs_${uid}`) || localStorage.getItem('anwaa_favs_guest');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.filter((x) => typeof x === 'number' && x >= 1 && x <= 40);
        }
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([INITIAL_WELCOME_MESSAGE]);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [bgAnimated, setBgAnimated] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(BG_STORAGE_KEY);
      if (saved === '0' || saved === 'false' || saved === 'off') return false;
      return true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const toggleBgAnimated = useCallback(() => {
    setBgAnimated((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(BG_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const setFallbackUser = useCallback((u: AppUser | null) => {
    setFallbackUserState(u);
    try {
      if (u) {
        localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(u));
      } else {
        localStorage.removeItem(LOCAL_AUTH_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const openUpgradeModal = useCallback(() => setIsUpgradeModalOpen(true), []);
  const closeUpgradeModal = useCallback(() => setIsUpgradeModalOpen(false), []);

  const refreshUser = useCallback(async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setFirebaseUser({ ...auth.currentUser } as User);
    }
  }, []);

  const favoritesRef = useRef<number[]>(favorites);
  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);

  // Derive unified user
  const user: AppUser | null = firebaseUser
    ? {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.isAnonymous
          ? 'ضيف'
          : (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'مستخدم'),
        isFirebaseUser: true,
        isAnonymous: firebaseUser.isAnonymous,
      }
    : fallbackUser;

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Trigger Guided Tour on first visit after login
  useEffect(() => {
    if (!authReady || !user) return;
    try {
      const done = localStorage.getItem('anwaa_tour_done');
      if (!done) {
        setIsTourOpen(true);
      }
    } catch {
      // ignore localStorage errors
    }
  }, [authReady, user]);

  // Subscribe to user's favorites in Firestore (with local cache fallback)
  useEffect(() => {
    const uidKey = user?.uid || (auth.currentUser ? auth.currentUser.uid : 'guest');
    const localFavKey = `anwaa_favs_${uidKey}`;

    try {
      const cached = localStorage.getItem(localFavKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((x) => typeof x === 'number' && x >= 1 && x <= 40);
          favoritesRef.current = valid;
          setFavorites(valid);
        }
      }
    } catch {
      // ignore
    }

    if (!user || !user.isFirebaseUser || !auth.currentUser) {
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);

    const unsub = onSnapshot(
      userDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.favorites)) {
            const validFavs = data.favorites
              .filter((x: unknown) => typeof x === 'number' && x >= 1 && x <= 40)
              .slice(0, 40);

            // If a local write is still in-flight, do not overwrite optimistic local state
            if (snap.metadata.hasPendingWrites) {
              return;
            }

            favoritesRef.current = validFavs;
            setFavorites(validFavs);
            try {
              localStorage.setItem(localFavKey, JSON.stringify(validFavs));
            } catch {
              // ignore
            }
          }
        }
      },
      (error) => {
        console.warn('Firestore favorites listener error, keeping local state:', error);
        // Do not wipe favorites on error
      }
    );

    return () => unsub();
  }, [authReady, user?.uid, user?.isFirebaseUser]);

  const toggleFavorite = useCallback(
    async (n: number) => {
      if (n < 1 || n > 40) return;

      const uidKey = user?.uid || (auth.currentUser ? auth.currentUser.uid : 'guest');
      const localFavKey = `anwaa_favs_${uidKey}`;

      // Synchronously compute next favorites from the current ref
      const current = favoritesRef.current;
      const exists = current.includes(n);
      const nextFavorites = exists
        ? current.filter((item: number) => item !== n)
        : Array.from(new Set([...current, n])).slice(0, 40);

      // Immediately update ref and state
      favoritesRef.current = nextFavorites;
      setFavorites(nextFavorites);

      // Immediately persist to localStorage
      try {
        localStorage.setItem(localFavKey, JSON.stringify(nextFavorites));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }

      // Persist to Firestore for signed in users
      if (user?.isFirebaseUser && auth.currentUser) {
        try {
          await setDoc(
            doc(db, 'users', user.uid),
            {
              uid: user.uid,
              favorites: nextFavorites,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (error) {
          console.warn('Firestore favorites sync notice:', error);
          // Preserve local storage and optimistic state
        }
      }
    },
    [user]
  );

  const isFavorite = useCallback(
    (n: number) => favorites.includes(n),
    [favorites]
  );

  const clearChatHistory = useCallback(() => {
    setChatMessages([INITIAL_WELCOME_MESSAGE]);
  }, []);

  const logout = useCallback(async () => {
    clearChatHistory();
    setFavorites([]);
    setIsTourOpen(false);
    setFallbackUser(null);
    if (auth.currentUser) {
      await firebaseSignOut(auth);
    }
  }, [clearChatHistory, setFallbackUser]);

  const startTour = useCallback(() => {
    setIsTourOpen(true);
  }, []);

  const closeTour = useCallback(() => {
    setIsTourOpen(false);
    try {
      localStorage.setItem('anwaa_tour_done', '1');
    } catch {
      // ignore
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        authReady,
        favorites,
        toggleFavorite,
        isFavorite,
        chatMessages,
        setChatMessages,
        clearChatHistory,
        logout,
        setFallbackUser,
        isTourOpen,
        startTour,
        closeTour,
        bgAnimated,
        toggleBgAnimated,
        theme,
        toggleTheme,
        refreshUser,
        isUpgradeModalOpen,
        openUpgradeModal,
        closeUpgradeModal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
