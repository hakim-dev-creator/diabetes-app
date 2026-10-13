import { getApp, getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, indexedDBLocalPersistence, initializeAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';

// قيم الإعداد تأتي من متغيرات البيئة (ملف .env محلياً، أو GitHub Secrets أثناء البناء)
const firebaseConfig = {
  apiKey: "AIzaSyC-syoIHeUFDmZaBlrnHHKyOwaPVUynF8s",
  authDomain: "diabete-213.firebaseapp.com",
  projectId: "diabete-213",
  storageBucket: "diabete-213.firebasestorage.app",
  messagingSenderId: "915763403125",
  appId: "1:915763403125:web:c4668a1c9373c9fb9adb3c"
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error(
    'إعدادات فايرباز ناقصة: تأكد من ضبط متغيرات VITE_FIREBASE_* (ملف .env أو GitHub Secrets).'
  );
}

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// المصادقة: الجلسة تُحفظ في الجهاز (IndexedDB) فتبقى فعّالة حتى دون اتصال
let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence]
  });
} catch (e) {
  // تم إنشاؤها مسبقاً (إعادة تحميل سريعة أثناء التطوير)
  authInstance = getAuth(app);
}
export const auth = authInstance;

// فايرستور: ذاكرة محلية دائمة للعمل دون اتصال (القراءات تُحفظ في الجهاز وتُزامَن لاحقاً)
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (e) {
  dbInstance = getFirestore(app);
}
export const db = dbInstance;
