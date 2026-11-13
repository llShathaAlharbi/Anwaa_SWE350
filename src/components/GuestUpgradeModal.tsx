import React, { useState } from 'react';
import {
  EmailAuthProvider,
  linkWithCredential,
  linkWithPopup,
  updateProfile,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { X } from 'lucide-react';
import { auth, db, googleProvider } from '../firebase';
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

export const GuestUpgradeModal: React.FC = () => {
  const { isUpgradeModalOpen, closeUpgradeModal, refreshUser, favorites } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isUpgradeModalOpen) return null;

  const mapLinkError = (code?: string): string => {
    switch (code) {
      case 'auth/credential-already-in-use':
      case 'auth/email-already-in-use':
        return 'هذا الحساب مسجّل بالفعل مسبقاً، استخدم بريداً آخر أو سجّل دخولك به.';
      case 'auth/weak-password':
        return 'كلمة المرور قصيرة، استخدم ٦ أحرف على الأقل.';
      case 'auth/invalid-email':
        return 'صيغة البريد الإلكتروني غير صحيحة.';
      case 'auth/popup-closed-by-user':
        return 'تم إغلاق نافذة الدخول قبل إتمام الربط.';
      default:
        return 'تعذّر إنشاء الحساب وربطه، حاول مرة أخرى.';
    }
  };

  const handleEmailUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('يرجى إدخال بريد إلكتروني صحيح.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('كلمة المرور قصيرة، استخدم ٦ أحرف على الأقل.');
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.isAnonymous) {
        // Link anonymous account to email/password credential
        const credential = EmailAuthProvider.credential(trimmedEmail, password);
        const result = await withTimeout(linkWithCredential(currentUser, credential), 15000);
        if (name.trim()) {
          await updateProfile(result.user, { displayName: name.trim() });
        }
      } else {
        // Fallback: create fresh account and transfer favorites
        const cred = await withTimeout(
          createUserWithEmailAndPassword(auth, trimmedEmail, password),
          15000
        );
        if (name.trim() && cred.user) {
          await updateProfile(cred.user, { displayName: name.trim() });
        }
        if (cred.user && favorites.length > 0) {
          await setDoc(doc(db, 'users', cred.user.uid), {
            uid: cred.user.uid,
            favorites,
            updatedAt: serverTimestamp(),
          });
        }
      }

      await refreshUser();
      setSuccessMsg('تم إنشاء حسابك وربط مفضلاتك بنجاح!');
      setTimeout(() => {
        closeUpgradeModal();
      }, 1200);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('استغرقت العملية')) {
        setErrorMsg(err.message);
      } else {
        const code = (err as { code?: string })?.code;
        setErrorMsg(mapLinkError(code));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleUpgrade = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await withTimeout(linkWithPopup(currentUser, googleProvider), 15000);
      } else {
        const cred = await withTimeout(signInWithPopup(auth, googleProvider), 15000);
        if (cred.user && favorites.length > 0) {
          await setDoc(doc(db, 'users', cred.user.uid), {
            uid: cred.user.uid,
            favorites,
            updatedAt: serverTimestamp(),
          });
        }
      }

      await refreshUser();
      setSuccessMsg('تم ربط حسابك بـ Google بنجاح!');
      setTimeout(() => {
        closeUpgradeModal();
      }, 1200);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('استغرقت العملية')) {
        setErrorMsg(err.message);
      } else {
        const code = (err as { code?: string })?.code;
        setErrorMsg(mapLinkError(code));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[var(--tour-backdrop)] flex items-center justify-center p-4"
      dir="rtl"
      lang="ar"
      onClick={closeUpgradeModal}
    >
      <div
        className="w-full max-w-[420px] bg-[var(--panel)] border border-[var(--line)] rounded-[10px] p-6 shadow-2xl flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <div>
            <h2
              className="text-xl font-bold text-[var(--gold)]"
              style={{ fontFamily: "'Amiri', serif" }}
            >
              إنشاء حساب دائم
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              سيتم حفظ جميع نجومك ومفضلاتك الحالية في حسابك الجديد
            </p>
          </div>
          <button
            type="button"
            onClick={closeUpgradeModal}
            className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--panel2)] transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-[8px] bg-[var(--ember)]/15 border border-[var(--ember)] text-xs text-[var(--ember)] font-medium">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-2.5 rounded-[8px] bg-[var(--gold)]/15 border border-[var(--gold)] text-xs text-[var(--gold)] font-medium">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleEmailUpgrade} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--ink)]">الاسم المعروض (اختياري)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسمك"
              className="h-10 px-3 rounded-[8px] bg-[var(--input-bg)] border border-[var(--line)] text-[var(--ink)] placeholder-[var(--muted)] text-sm focus:outline-none focus:border-[var(--gold)]"
            />
          </div>

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
            <label className="text-xs font-medium text-[var(--ink)]">كلمة المرور</label>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 mt-1 rounded-[8px] bg-[var(--gold-fill)] text-[#1a1405] font-semibold text-sm flex items-center justify-center hover:opacity-95 disabled:opacity-50 transition-opacity cursor-pointer"
          >
            {loading ? 'جارٍ الإنشاء والربط…' : 'إنشاء الحساب وحفظ البيانات'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-[var(--line)]" />
          <span className="text-xs text-[var(--muted)]">أو</span>
          <div className="flex-1 h-px bg-[var(--line)]" />
        </div>

        <button
          type="button"
          onClick={handleGoogleUpgrade}
          disabled={loading}
          className="w-full h-10 rounded-[8px] bg-transparent border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--panel2)] hover:border-[var(--gold)] text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <span>الربط بحساب Google</span>
        </button>
      </div>
    </div>
  );
};
