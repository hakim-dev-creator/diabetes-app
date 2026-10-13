import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Activity, Droplet, Loader2, LogOut, PlusCircle, WifiOff } from 'lucide-react';
import { auth } from './firebase.js';
import { disableBiometric, getBiometricUid, isNative } from './lib/biometric.js';
import LoginScreen from './components/LoginScreen.jsx';
import Dashboard from './components/Dashboard.jsx';
import GlucoseInputForm from './components/GlucoseInputForm.jsx';
import UpdatePrompt from './components/UpdatePrompt.jsx';

function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState('dashboard'); // dashboard | add
  const firstResolve = useRef(true);
  const online = useOnline();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (current) => {
      setUser(current);

      if (firstResolve.current) {
        firstResolve.current = false;
        // عند فتح التطبيق بجلسة محفوظة: نقفله فقط إذا فعّل المستخدم البصمة (وعلى الأندرويد)
        const needsLock = current && isNative() && getBiometricUid() === current.uid;
        if (current && !needsLock) setUnlocked(true);
      }

      if (!current) setUnlocked(false);
      setReady(true);
    });
    return unsubscribe;
  }, []);

  const handleSignOut = useCallback(async () => {
    disableBiometric();
    setUnlocked(false);
    setTab('dashboard');
    await signOut(auth);
  }, []);

  const handleUnlocked = useCallback(() => setUnlocked(true), []);

  // التحديث عبر عامل الخدمة مخصّص للنسخة الويب فقط؛ داخل APK يأتي التحديث بنسخة جديدة
  const updatePrompt = !isNative() ? <UpdatePrompt /> : null;

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center" aria-busy="true">
        <Loader2 size={36} className="animate-spin text-deep" aria-label="جارٍ التحميل" />
      </main>
    );
  }

  if (!user || !unlocked) {
    const locked = user && getBiometricUid() === user.uid && isNative() ? user : null;
    return (
      <>
        <LoginScreen lockedUser={locked} onUnlocked={handleUnlocked} onSignOut={handleSignOut} />
        {updatePrompt}
      </>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="safe-top sticky top-0 z-20 bg-deep text-white shadow-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Droplet size={24} aria-hidden="true" />
            <h1 className="text-lg font-extrabold">مرافق السكري</h1>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="تسجيل الخروج"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <LogOut size={18} aria-hidden="true" />
            خروج
          </button>
        </div>
        {!online && (
          <div
            role="status"
            className="flex items-center justify-center gap-2 bg-amber-400 px-4 py-1.5 text-sm font-bold text-amber-950"
          >
            <WifiOff size={16} aria-hidden="true" />
            لا يوجد اتصال، ستُزامَن بياناتك عند عودته
          </div>
        )}
      </header>

      <main className="flex-1 px-4 pb-28 pt-5">
        {tab === 'dashboard' ? (
          <Dashboard user={user} onAddReading={() => setTab('add')} />
        ) : (
          <GlucoseInputForm user={user} onSaved={() => {}} />
        )}
      </main>

      <nav
        aria-label="التنقل الرئيسي"
        className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white"
      >
        <div className="mx-auto grid max-w-md grid-cols-2">
          <TabButton
            active={tab === 'dashboard'}
            onClick={() => setTab('dashboard')}
            icon={<Activity size={24} aria-hidden="true" />}
            label="قراءاتي"
          />
          <TabButton
            active={tab === 'add'}
            onClick={() => setTab('add')}
            icon={<PlusCircle size={24} aria-hidden="true" />}
            label="قياس جديد"
          />
        </div>
      </nav>

      {updatePrompt}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center gap-1 py-3 text-sm font-bold focus:outline-none focus-visible:bg-mist ${
        active ? 'text-deep' : 'text-slate-500'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
