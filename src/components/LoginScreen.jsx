import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { Droplet, Eye, EyeOff, Fingerprint, Loader2, Lock, Mail } from 'lucide-react';
import { auth } from '../firebase.js';
import {
  enableBiometricFor,
  getBiometricUid,
  isBiometricAvailable,
  promptBiometric
} from '../lib/biometric.js';

function authErrorMessage(error) {
  switch (error && error.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    case 'auth/invalid-email':
      return 'صيغة البريد الإلكتروني غير صحيحة.';
    case 'auth/email-already-in-use':
      return 'هذا البريد مسجّل مسبقاً. جرّب تسجيل الدخول.';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة. استخدم 6 أحرف على الأقل.';
    case 'auth/too-many-requests':
      return 'محاولات كثيرة. انتظر قليلاً ثم حاول مجدداً.';
    case 'auth/user-disabled':
      return 'تم تعطيل هذا الحساب.';
    case 'auth/network-request-failed':
      return 'لا يوجد اتصال بالإنترنت. أول تسجيل دخول يحتاج إلى اتصال.';
    default:
      return 'حدث خطأ غير متوقع. حاول مرة أخرى.';
  }
}

/**
 * الخصائص:
 *  - lockedUser: إن وُجد، فالجلسة محفوظة والتطبيق مقفل بانتظار البصمة
 *  - onUnlocked: تُستدعى عند نجاح الدخول (كلمة مرور أو بصمة)
 *  - onSignOut: تسجيل الخروج واستخدام حساب آخر
 */
export default function LoginScreen({ lockedUser, onUnlocked, onSignOut }) {
  const [mode, setMode] = useState('login'); // login | register | reset
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [bioAvailable, setBioAvailable] = useState(false);
  const [offerBioFor, setOfferBioFor] = useState(null); // مستخدم سجّل دخوله ويُعرض عليه تفعيل البصمة
  const autoPrompted = useRef(false);

  const handleBiometric = useCallback(async () => {
    setError('');
    setBusy(true);
    const result = await promptBiometric();
    setBusy(false);
    if (result.ok) {
      onUnlocked();
    } else {
      setError(result.message);
    }
  }, [onUnlocked]);

  useEffect(() => {
    let alive = true;
    isBiometricAvailable().then((ok) => {
      if (alive) setBioAvailable(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  // عند القفل: اعرض نافذة البصمة تلقائياً مرة واحدة
  useEffect(() => {
    if (lockedUser && bioAvailable && !autoPrompted.current) {
      autoPrompted.current = true;
      handleBiometric();
    }
  }, [lockedUser, bioAvailable, handleBiometric]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setInfo('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('أدخل البريد الإلكتروني.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'reset') {
        await sendPasswordResetEmail(auth, cleanEmail);
        setInfo('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك.');
        setMode('login');
        return;
      }

      if (!password) {
        setError('أدخل كلمة المرور.');
        return;
      }

      const credential =
        mode === 'register'
          ? await createUserWithEmailAndPassword(auth, cleanEmail, password)
          : await signInWithEmailAndPassword(auth, cleanEmail, password);

      // اعرض تفعيل البصمة إن كانت متاحة ولم تُفعّل لهذا الحساب
      if (bioAvailable && getBiometricUid() !== credential.user.uid) {
        setOfferBioFor(credential.user);
      } else {
        onUnlocked();
      }
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmEnableBiometric = async () => {
    setError('');
    setBusy(true);
    const result = await promptBiometric();
    setBusy(false);
    if (result.ok) {
      enableBiometricFor(offerBioFor.uid);
      onUnlocked();
    } else {
      setError(result.message);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-line bg-white py-3.5 pr-11 pl-4 text-base text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-deep focus:border-deep';

  // ———————— شاشة عرض تفعيل البصمة بعد أول دخول ————————
  if (offerBioFor) {
    return (
      <Shell>
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-deep text-white">
            <Fingerprint size={40} aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-extrabold">تفعيل الدخول بالبصمة؟</h2>
          <p className="mt-3 text-slate-600 leading-relaxed">
            ستدخل في المرات القادمة ببصمتك فقط دون كتابة كلمة المرور. تبقى بياناتك الصحية محمية
            على هذا الجهاز.
          </p>
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        <button
          type="button"
          disabled={busy}
          onClick={confirmEnableBiometric}
          className="mt-6 w-full rounded-xl bg-deep py-3.5 font-bold text-white disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-deep"
        >
          {busy ? 'جارٍ التحقق...' : 'تفعيل البصمة'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onUnlocked}
          className="mt-3 w-full rounded-xl border border-line bg-white py-3.5 font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-deep"
        >
          ليس الآن
        </button>
      </Shell>
    );
  }

  // ———————— شاشة القفل (جلسة محفوظة + بصمة مفعّلة) ————————
  if (lockedUser) {
    return (
      <Shell>
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-deep text-white">
            <Lock size={36} aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-extrabold">التطبيق مقفل</h2>
          <p className="mt-3 text-slate-600 leading-relaxed">
            تحقق من هويتك لعرض بياناتك الصحية.
          </p>
          {lockedUser.email && (
            <p className="num mt-2 text-sm text-slate-500" dir="ltr">
              {lockedUser.email}
            </p>
          )}
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        <button
          type="button"
          disabled={busy || !bioAvailable}
          onClick={handleBiometric}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-deep py-3.5 font-bold text-white disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-deep"
        >
          {busy ? <Loader2 size={20} className="animate-spin" /> : <Fingerprint size={22} />}
          الدخول بالبصمة
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-3 w-full rounded-xl border border-line bg-white py-3.5 font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-deep"
        >
          تسجيل الدخول بحساب آخر
        </button>
      </Shell>
    );
  }

  // ———————— الشاشة الرئيسية: بريد وكلمة مرور ————————
  const titles = {
    login: 'تسجيل الدخول',
    register: 'إنشاء حساب جديد',
    reset: 'استعادة كلمة المرور'
  };

  return (
    <Shell>
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-deep text-white">
          <Droplet size={32} aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-extrabold">مرافق السكري</h1>
        <p className="mt-2 text-slate-600">{titles[mode]}</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="relative">
          <label htmlFor="email" className="sr-only">
            البريد الإلكتروني
          </label>
          <Mail
            size={20}
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${inputClass} text-left`}
          />
        </div>

        {mode !== 'reset' && (
          <div className="relative">
            <label htmlFor="password" className="sr-only">
              كلمة المرور
            </label>
            <Lock
              size={20}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              dir="ltr"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} text-left`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-deep"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        )}

        {error && <Notice tone="error">{error}</Notice>}
        {info && <Notice tone="info">{info}</Notice>}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-deep py-3.5 text-base font-bold text-white disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-deep"
        >
          {busy && <Loader2 size={20} className="animate-spin" />}
          {mode === 'login' && 'دخول'}
          {mode === 'register' && 'إنشاء الحساب'}
          {mode === 'reset' && 'إرسال رابط الاستعادة'}
        </button>
      </form>

      <div className="mt-5 flex flex-col items-center gap-3 text-sm">
        {mode === 'login' && (
          <>
            <button
              type="button"
              onClick={() => {
                setMode('reset');
                setError('');
                setInfo('');
              }}
              className="text-deep underline underline-offset-4"
            >
              نسيت كلمة المرور؟
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
                setInfo('');
              }}
              className="text-deep underline underline-offset-4"
            >
              ليس لديك حساب؟ أنشئ حساباً
            </button>
          </>
        )}
        {mode !== 'login' && (
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setInfo('');
            }}
            className="text-deep underline underline-offset-4"
          >
            العودة إلى تسجيل الدخول
          </button>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <main className="min-h-screen safe-top safe-bottom flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-lg ring-1 ring-line">
        {children}
      </div>
    </main>
  );
}

function Notice({ tone, children }) {
  const styles =
    tone === 'error'
      ? 'bg-red-50 text-red-800 border-red-200'
      : 'bg-emerald-50 text-emerald-800 border-emerald-200';
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`mt-4 rounded-xl border px-4 py-3 text-sm leading-relaxed ${styles}`}>
      {children}
    </p>
  );
}
