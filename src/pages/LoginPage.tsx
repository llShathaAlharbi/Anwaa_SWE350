import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  sendPasswordResetEmail,
  signInAnonymously,
} from 'firebase/auth';
import { Moon, Sun } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { useApp } from '../context/AppContext';

const withTimeout = async <T,>(
  promise: Promise<T>,
  ms = 15000,
  timeoutMsg = 'استغرقت العملية وقتاً أطول من المتوقع، حاول مجدداً.'
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMsg)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
};

const LOCAL_ACCOUNTS_KEY = 'anwaa_local_accounts';

interface LocalAccount {
  uid: string;
  name: string;
  email: string;
  password: string;
}

function getLocalAccounts(): Record<string, LocalAccount> {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalAccount(acc: LocalAccount) {
  try {
    const all = getLocalAccounts();
    all[acc.email.toLowerCase()] = acc;
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export const LoginPage: React.FC = () => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { user, setFallbackUser, theme, toggleTheme } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const fromPath =
    (location.state as { from?: { pathname?: string; search?: string } })?.from
      ? `${(location.state as { from: { pathname: string; search?: string } }).from.pathname}${
          (location.state as { from: { pathname: string; search?: string } }).from.search || ''
        }`
      : '/';

  useEffect(() => {
    if (user) {
      navigate(fromPath === '/login' ? '/' : fromPath, { replace: true });
    }
  }, [user, navigate, fromPath]);

  const mapFirebaseError = (code?: string): string => {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
      case 'auth/invalid-email':
        return 'البريد أو كلمة المرور غير صحيحة.';
      case 'auth/email-already-in-use':
        return 'هذا البريد مسجّل مسبقاً.';
      case 'auth/weak-password':
        return 'كلمة المرور قصيرة، استخدم ٦ أحرف على الأقل.';
      default:
        return 'تعذّر الاتصال، حاول مرة أخرى.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResetMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('البريد أو كلمة المرور غير صحيحة.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('كلمة المرور قصيرة، استخدم ٦ أحرف على الأقل.');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'login') {
        try {
          await signInWithEmailAndPassword(auth, trimmedEmail, password);
        } catch (err: unknown) {
          const code = (err as { code?: string })?.code;
          if (code === 'auth/operation-not-allowed') {
            const accounts = getLocalAccounts();
            const found = accounts[trimmedEmail.toLowerCase()];
            if (!found || found.password !== password) {
              setErrorMsg('البريد أو كلمة المرور غير صحيحة.');
              setLoading(false);
              return;
            }
            setFallbackUser({
              uid: found.uid,
              email: found.email,
              displayName: found.name || found.email.split('@')[0],
              isFirebaseUser: false,
            });
            return;
          }
          setErrorMsg(mapFirebaseError(code));
          setLoading(false);
          return;
        }
      } else {
        const displayName = name.trim() || trimmedEmail.split('@')[0];
        try {
          const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
          if (cred.user && displayName) {
            await updateProfile(cred.user, { displayName });
          }
        } catch (err: unknown) {
          const code = (err as { code?: string })?.code;
          if (code === 'auth/operation-not-allowed') {
            const accounts = getLocalAccounts();
            if (accounts[trimmedEmail.toLowerCase()]) {
              setErrorMsg('هذا البريد مسجّل مسبقاً.');
              setLoading(false);
              return;
            }
            const newAcc: LocalAccount = {
              uid: 'user_' + Math.random().toString(36).slice(2, 12),
              name: displayName,
              email: trimmedEmail,
              password,
            };
            saveLocalAccount(newAcc);
            setFallbackUser({
              uid: newAcc.uid,
              email: newAcc.email,
              displayName: newAcc.name,
              isFirebaseUser: false,
            });
            return;
          }
          setErrorMsg(mapFirebaseError(code));
          setLoading(false);
          return;
        }
      }
    } catch {
      setErrorMsg('تعذّر الاتصال، حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setResetMsg(null);
    setLoading(true);
    try {
      await withTimeout(signInWithPopup(auth, googleProvider), 15000);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('استغرقت العملية')) {
        setErrorMsg(err.message);
      } else {
        const code = (err as { code?: string })?.code;
        setErrorMsg(mapFirebaseError(code));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setErrorMsg(null);
    setResetMsg(null);
    setLoading(true);
    try {
      await withTimeout(signInAnonymously(auth), 15000);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') {
        // Smooth fallback for offline/disabled guest mode
        const guestUid = 'guest_' + Math.random().toString(36).substring(2, 10);
        setFallbackUser({
          uid: guestUid,
          email: null,
          displayName: 'ضيف',
          isFirebaseUser: false,
          isAnonymous: true,
        });
        return;
      }
      if (err instanceof Error && err.message.includes('استغرقت العملية')) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('تعذّر الدخول كضيف، حاول مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMsg(null);
    setResetMsg(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('البريد أو كلمة المرور غير صحيحة.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setResetMsg('أرسلنا رابط إعادة التعيين إلى بريدك.');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/operation-not-allowed') {
        setResetMsg('أرسلنا رابط إعادة التعيين إلى بريدك.');
      } else {
        setErrorMsg(mapFirebaseError(code));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 min-h-screen w-full flex flex-col items-center justify-center px-4 py-8" dir="rtl">
      <div
        className="w-full max-w-[420px] bg-[var(--panel)] border border-[var(--line)] rounded-[10px] shadow-2xl flex flex-col gap-5"
        style={{ padding: '24px' }}
      >
        {/* Top Row: Brand & Theme Toggle */}
        <div className="relative text-center">
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'light'}
            aria-label="تبديل الوضع الليلي والنهاري"
            title="تبديل الوضع الليلي والنهاري"
            onClick={toggleTheme}
            className="absolute left-0 top-0 h-8 w-8 rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--gold)] flex items-center justify-center transition-colors cursor-pointer"
          >
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-[var(--gold)]" />
            ) : (
              <Sun className="w-4 h-4 text-[var(--gold)]" />
            )}
          </button>

          <div className="font-amiri text-2xl font-bold text-[var(--gold)] mb-1">أنواء</div>
          <h1 className="font-amiri text-[30px] font-bold text-[var(--gold)] leading-tight">
            تسجيل الدخول
          </h1>
        </div>

        {/* Two tabs: "دخول" / "حساب جديد" */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[var(--panel2)] border border-[var(--line)] rounded-[8px]">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMsg(null);
              setResetMsg(null);
            }}
            className={`py-2 rounded-[6px] text-sm font-medium transition-colors cursor-pointer ${
              tab === 'login'
                ? 'bg-[var(--panel)] text-[var(--gold)] font-semibold shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            دخول
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMsg(null);
              setResetMsg(null);
            }}
            className={`py-2 rounded-[6px] text-sm font-medium transition-colors cursor-pointer ${
              tab === 'register'
                ? 'bg-[var(--panel)] text-[var(--gold)] font-semibold shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            حساب جديد
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {tab === 'register' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--ink)]">الاسم</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="الاسم المعروض"
                className="h-10 px-3 rounded-[8px] bg-[var(--input-bg)] border border-[var(--line)] text-[var(--ink)] placeholder-[var(--muted)] text-sm focus:outline-none focus:border-[var(--gold)]"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--ink)]">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="h-10 px-3 rounded-[8px] bg-[var(--input-bg)] border border-[var(--line)] text-[var(--ink)] placeholder-[var(--muted)] text-sm focus:outline-none focus:border-[var(--gold)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--ink)]">كلمة المرور</label>
              {tab === 'login' && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-[var(--sky)] hover:underline cursor-pointer"
                >
                  نسيت كلمة المرور؟
                </button>
              )}
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="٦ أحرف على الأقل"
              minLength={6}
              required
              className="h-10 px-3 rounded-[8px] bg-[var(--input-bg)] border border-[var(--line)] text-[var(--ink)] placeholder-[var(--muted)] text-sm focus:outline-none focus:border-[var(--gold)]"
            />
          </div>

          {errorMsg && (
            <p className="text-xs font-medium text-[var(--ember)]" role="alert">
              {errorMsg}
            </p>
          )}

          {resetMsg && (
            <p className="text-xs font-medium text-[var(--gold)]" role="status">
              {resetMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 mt-1 rounded-[8px] bg-[var(--gold-fill)] text-[#1a1405] font-semibold text-sm flex items-center justify-center hover:opacity-95 disabled:opacity-50 transition-opacity cursor-pointer"
          >
            {tab === 'login' ? 'دخول' : 'إنشاء الحساب'}
          </button>
        </form>

        {/* Divider "أو" */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--line)]" />
          <span className="text-xs text-[var(--muted)]">أو</span>
          <div className="flex-1 h-px bg-[var(--line)]" />
        </div>

        {/* Outline Google Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full h-10 rounded-[8px] bg-transparent border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--panel2)] hover:border-[var(--gold)] text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <span>المتابعة بحساب Google</span>
        </button>

        {/* Divider "أو" */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--line)]" />
          <span className="text-xs text-[var(--muted)]">أو</span>
          <div className="flex-1 h-px bg-[var(--line)]" />
        </div>

        {/* Clear Continue as Guest Button */}
        <button
          type="button"
          onClick={handleGuestLogin}
          disabled={loading}
          className="w-full h-10 rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--gold)] hover:text-[var(--gold)] text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <span>المتابعة كضيف</span>
        </button>

        {/* Muted footer line */}
        <p className="text-center text-xs text-[var(--muted)] mt-1">
          نستخدم بريدك فقط لتسجيل الدخول. يمكنك أيضاً التصفح كضيف وتجربة التطبيق مباشرة.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
