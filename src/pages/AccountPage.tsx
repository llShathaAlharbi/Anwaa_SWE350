import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  updateProfile,
  verifyBeforeUpdateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { ArrowRight, User, Mail, Lock, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { auth } from '../firebase';
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

export const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useApp();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const isGoogleUser =
    Boolean(auth.currentUser?.providerData?.some((p) => p.providerId === 'google.com'));

  // Edit Username
  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setNameSuccess(null);

    const trimmed = displayName.trim();
    if (!trimmed) {
      setNameError('يرجى إدخال اسم مستخدم صالح.');
      return;
    }

    setNameLoading(true);
    try {
      if (auth.currentUser) {
        await withTimeout(updateProfile(auth.currentUser, { displayName: trimmed }), 15000);
        await refreshUser();
        setNameSuccess('تم حفظ اسم المستخدم بنجاح.');
      } else {
        setNameSuccess('تم حفظ اسم المستخدم.');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('استغرقت العملية')) {
        setNameError(err.message);
      } else {
        setNameError('تعذّر تحديث الاسم، حاول مرة أخرى.');
      }
    } finally {
      setNameLoading(false);
    }
  };

  // Change Email (verifyBeforeUpdateEmail)
  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);

    const trimmed = newEmail.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setEmailError('يرجى إدخال بريد إلكتروني صحيح.');
      return;
    }

    if (trimmed.toLowerCase() === user?.email?.toLowerCase()) {
      setEmailError('البريد المدخل مطابق لبريدك الحالي.');
      return;
    }

    setEmailLoading(true);
    try {
      if (auth.currentUser) {
        await withTimeout(verifyBeforeUpdateEmail(auth.currentUser, trimmed), 15000);
        setEmailSuccess('أرسلنا رابط التحقق إلى بريدك الجديد. يرجى تأكيد الرابط لإتمام التحديث.');
        setNewEmail('');
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/requires-recent-login') {
        setEmailError('يتطلب هذا الإجراء تسجيل الدخول حديثاً. يرجى تسجيل الدخول مجدداً ثم إعادة المحاولة.');
      } else if (code === 'auth/email-already-in-use') {
        setEmailError('هذا البريد مسجّل بالفعل مسبقاً بحساب آخر.');
      } else if (code === 'auth/invalid-email') {
        setEmailError('صيغة البريد الإلكتروني غير صحيحة.');
      } else if (err instanceof Error && err.message.includes('استغرقت العملية')) {
        setEmailError(err.message);
      } else {
        setEmailError('تعذّر إرسال رابط التحديث، حاول مرة أخرى.');
      }
    } finally {
      setEmailLoading(false);
    }
  };

  // Change Password (reauthenticate then updatePassword)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('كلمة المرور الجديدة قصيرة، استخدم ٦ أحرف على الأقل.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('كلمتا المرور غير متطابقتين.');
      return;
    }

    if (!currentPassword) {
      setPasswordError('يرجى إدخال كلمة المرور الحالية.');
      return;
    }

    setPasswordLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.email) {
        // Reauthenticate with current password first
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await withTimeout(reauthenticateWithCredential(currentUser, credential), 15000);
        // Update to new password
        await withTimeout(updatePassword(currentUser, newPassword), 15000);

        setPasswordSuccess('تم تغيير كلمة المرور بنجاح.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError('تعذّر التحقق من الحساب، يرجى إعادة تسجيل الدخول.');
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/requires-recent-login') {
        setPasswordError('يتطلب هذا الإجراء تسجيل الدخول حديثاً. يرجى تسجيل الدخول مجدداً ثم إعادة المحاولة.');
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setPasswordError('كلمة المرور الحالية غير صحيحة.');
      } else if (code === 'auth/weak-password') {
        setPasswordError('كلمة المرور الجديدة قصيرة، استخدم ٦ أحرف على الأقل.');
      } else if (err instanceof Error && err.message.includes('استغرقت العملية')) {
        setPasswordError(err.message);
      } else {
        setPasswordError('تعذّر تغيير كلمة المرور، تأكد من صحة كلمة المرور الحالية.');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6" dir="rtl" lang="ar">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between border-b border-[var(--sky-line)] pb-4">
        <div>
          <h1
            className="text-3xl font-bold text-[var(--sky-gold)] leading-tight"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            إدارة الحساب
          </h1>
          <p className="text-sm text-[var(--sky-muted)] mt-0.5">
            تعديل بيانات حسابك وكلمة المرور والبريد الإلكتروني
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="h-9 px-3.5 rounded-[8px] bg-[var(--panel)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--gold)] hover:text-[var(--gold)] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة للتطبيق</span>
        </button>
      </div>

      {/* Account Info Summary Card */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[10px] p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[var(--panel2)] border border-[var(--line)] flex items-center justify-center text-[var(--gold)]">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="text-base font-bold text-[var(--ink)]">{user?.displayName || 'مستخدم'}</div>
            <div className="text-xs text-[var(--muted)] flex items-center gap-1 mt-0.5">
              <Mail className="w-3.5 h-3.5" />
              <span>{user?.email || 'حساب بدون بريد'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isGoogleUser ? (
            <span className="px-3 py-1 rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] text-xs font-medium text-[var(--gold)] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>مرتبط بـ Google</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] text-xs font-medium text-[var(--sky)] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>حساب بريد وكلمة مرور</span>
            </span>
          )}
        </div>
      </div>

      {/* Section 1: Edit Username */}
      <section className="bg-[var(--panel)] border border-[var(--line)] rounded-[10px] p-6 shadow-lg space-y-4">
        <div className="border-b border-[var(--line)] pb-3">
          <h2
            className="text-xl font-bold text-[var(--gold)]"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            تعديل اسم المستخدم
          </h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            الاسم الذي يظهر لك وللآخرين داخل التطبيق
          </p>
        </div>

        {nameSuccess && (
          <div className="p-3 rounded-[8px] bg-[var(--gold)]/15 border border-[var(--gold)] text-xs text-[var(--gold)] font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{nameSuccess}</span>
          </div>
        )}

        {nameError && (
          <div className="p-3 rounded-[8px] bg-[var(--ember)]/15 border border-[var(--ember)] text-xs text-[var(--ember)] font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{nameError}</span>
          </div>
        )}

        <form onSubmit={handleUpdateName} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--ink)]">الاسم المعروض</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="اسمك المعروض"
              required
              className="h-10 px-3 rounded-[8px] bg-[var(--input-bg)] border border-[var(--line)] text-[var(--ink)] placeholder-[var(--muted)] text-sm focus:outline-none focus:border-[var(--gold)]"
            />
          </div>

          <button
            type="submit"
            disabled={nameLoading}
            className="h-10 px-5 rounded-[8px] bg-[var(--gold-fill)] text-[#1a1405] font-semibold text-sm hover:opacity-95 disabled:opacity-50 transition-opacity cursor-pointer shrink-0"
          >
            {nameLoading ? 'جارٍ الحفظ…' : 'احفظ الاسم'}
          </button>
        </form>
      </section>

      {/* Google User Note OR Sections 2 & 3 */}
      {isGoogleUser ? (
        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[10px] p-6 shadow-lg">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[var(--gold)] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--ink)] mb-1">
                حساب Google الموثق
              </h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                حسابك مرتبط بـ Google، ولا يمكن تغيير البريد أو كلمة المرور من هنا. يمكنك إدارة أمان حسابك مباشرة من إعدادات حساب Google الخاص بك.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Section 2: Change Email */}
          <section className="bg-[var(--panel)] border border-[var(--line)] rounded-[10px] p-6 shadow-lg space-y-4">
            <div className="border-b border-[var(--line)] pb-3">
              <h2
                className="text-xl font-bold text-[var(--gold)]"
                style={{ fontFamily: "'Amiri', serif" }}
              >
                تغيير البريد الإلكتروني
              </h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                سنرسل رابط تحقق إلى البريد الجديد قبل اعتماده لحماية حسابك
              </p>
            </div>

            {emailSuccess && (
              <div className="p-3 rounded-[8px] bg-[var(--gold)]/15 border border-[var(--gold)] text-xs text-[var(--gold)] font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{emailSuccess}</span>
              </div>
            )}

            {emailError && (
              <div className="p-3 rounded-[8px] bg-[var(--ember)]/15 border border-[var(--ember)] text-xs text-[var(--ember)] font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{emailError}</span>
              </div>
            )}

            <form onSubmit={handleChangeEmail} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--ink)]">البريد الإلكتروني الجديد</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new-email@example.com"
                  required
                  className="h-10 px-3 rounded-[8px] bg-[var(--input-bg)] border border-[var(--line)] text-[var(--ink)] placeholder-[var(--muted)] text-sm focus:outline-none focus:border-[var(--gold)]"
                />
              </div>

              <button
                type="submit"
                disabled={emailLoading}
                className="h-10 px-5 rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--gold)] hover:text-[var(--gold)] font-semibold text-sm hover:opacity-95 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
              >
                {emailLoading ? 'جارٍ الإرسال…' : 'أرسل رابط التحقق'}
              </button>
            </form>
          </section>

          {/* Section 3: Change Password */}
          <section className="bg-[var(--panel)] border border-[var(--line)] rounded-[10px] p-6 shadow-lg space-y-4">
            <div className="border-b border-[var(--line)] pb-3">
              <h2
                className="text-xl font-bold text-[var(--gold)]"
                style={{ fontFamily: "'Amiri', serif" }}
              >
                تغيير كلمة المرور
              </h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                يلزم إدخال كلمة المرور الحالية للتأكد من هويتك
              </p>
            </div>

            {passwordSuccess && (
              <div className="p-3 rounded-[8px] bg-[var(--gold)]/15 border border-[var(--gold)] text-xs text-[var(--gold)] font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 rounded-[8px] bg-[var(--ember)]/15 border border-[var(--ember)] text-xs text-[var(--ember)] font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="flex flex-col gap-3.5 max-w-lg">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--ink)]">كلمة المرور الحالية</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="كلمة المرور الحالية"
                  required
                  className="h-10 px-3 rounded-[8px] bg-[var(--input-bg)] border border-[var(--line)] text-[var(--ink)] placeholder-[var(--muted)] text-sm focus:outline-none focus:border-[var(--gold)]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--ink)]">كلمة المرور الجديدة</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="٦ أحرف على الأقل"
                  minLength={6}
                  required
                  className="h-10 px-3 rounded-[8px] bg-[var(--input-bg)] border border-[var(--line)] text-[var(--ink)] placeholder-[var(--muted)] text-sm focus:outline-none focus:border-[var(--gold)]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--ink)]">تأكيد كلمة المرور الجديدة</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور الجديدة"
                  minLength={6}
                  required
                  className="h-10 px-3 rounded-[8px] bg-[var(--input-bg)] border border-[var(--line)] text-[var(--ink)] placeholder-[var(--muted)] text-sm focus:outline-none focus:border-[var(--gold)]"
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="h-10 mt-1 rounded-[8px] bg-[var(--gold-fill)] text-[#1a1405] font-semibold text-sm hover:opacity-95 disabled:opacity-50 transition-opacity cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>{passwordLoading ? 'جارٍ التحديث…' : 'غيّر كلمة المرور'}</span>
              </button>
            </form>
          </section>
        </>
      )}
    </div>
  );
};

export default AccountPage;
