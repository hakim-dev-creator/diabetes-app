# مرافق السكري

تطبيق عربي (RTL) لمتابعة مرض السكري: ريأكت + فايت + تيلويند + فايرباز + كاباسيتور، مع بناء ملف APK تلقائياً عبر جيت هاب أكشنز.

## 1) التثبيت (القسم الأول)

الملف `package.json` يحتوي كل الاعتمادات، فيكفي:

```bash
npm install
```

وإن أردت تثبيتها يدوياً في مشروع جديد:

```bash
npm create vite@latest diabetes-care-app -- --template react
cd diabetes-care-app
npm install firebase lucide-react react react-dom @capacitor/core @capacitor/android @aparajita/capacitor-biometric-auth@^8.0.2
npm install -D vite@^6 @vitejs/plugin-react@^4 tailwindcss@^3 postcss autoprefixer vite-plugin-pwa workbox-build workbox-window @capacitor/cli@^6
```

> تنبيه حول أسماء الحزم: الحزمتان `@vite-pwa/vite-plugin` و `@capacitor-community/biometric-auth` غير موجودتين في سجل npm (تحققت من ذلك).
> البدائل المستخدمة هنا: `vite-plugin-pwa` و `@aparajita/capacitor-biometric-auth` (الإصدار 8.x لأنه المتوافق مع كاباسيتور 6 وجافا 17).

## 2) إعدادات فايرباز

انسخ `.env.example` إلى `.env` وضع قيم مشروعك. ثم انسخ محتوى `firestore.rules` إلى:
فايرباز كونسول ← فايرستور ← القواعد (Rules) ← نشر.

## 3) التشغيل محلياً

```bash
npm run dev
npm run build
```

## 4) كاباسيتور (القسم الخامس)

```bash
npm run build
npx cap add android
npx cap sync android
```

بعد أي تعديل على الكود: `npm run cap:sync`

ثم أضف الصلاحيتين التاليتين في `android/app/src/main/AndroidManifest.xml` (يفعلها ملف جيت هاب أكشنز تلقائياً):

```xml
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.USE_FINGERPRINT" />
```

## 5) البناء التلقائي لملف APK (القسم السادس)

1. أنشئ مستودعاً على جيت هاب وارفع كل ملفات المشروع (ما عدا `node_modules` و `dist`).
2. من Settings ← Secrets and variables ← Actions أضف هذه الأسرار (Repository secrets):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
3. افتح تبويب Actions ← "Build Android APK" ← Run workflow (أو ادفع تعديلاً إلى فرع main).
4. بعد اكتمال البناء افتح التشغيل ونزّل الملف `diabetes-care-debug-apk` من قسم Artifacts، وفك الضغط لتحصل على `app-debug.apk`.

مجلد `android/` غير مطلوب في المستودع: الملف يُنشئه تلقائياً عبر `cap add android` إن لم يكن موجوداً.

## ملاحظات تصميمية

- **البصمة**: لا تُخزَّن كلمة المرور في الجهاز. بعد أول دخول بالبريد وكلمة المرور تُحفظ جلسة فايرباز في الجهاز، والبصمة تعمل كقفل يفتح هذه الجلسة. إذا انتهت الجلسة أو سجّلت الخروج فعليك الدخول بكلمة المرور مرة أخرى.
- **العمل دون اتصال**: القراءات تُحفظ في ذاكرة الجهاز وتُزامَن تلقائياً عند عودة الإنترنت. أول تسجيل دخول يحتاج إلى اتصال.
- **التحديث**: إشعار التحديث (`UpdatePrompt`) يعمل في نسخة الويب (PWA) فقط. داخل APK تكون الملفات مضمّنة، والتحديث يأتي بنسخة APK جديدة.
- **حدود التحليل**: أقل من 70 هبوط، 70–130 طبيعي، 131–180 مرتفع قليلاً، أكثر من 180 ارتفاع شديد. عدّلها من `src/lib/glucose.js` بحسب توجيه الطبيب. الإرشادات عامة وليست بديلاً عن الاستشارة الطبية.
- **حقول البيانات**: القراءة تُحفظ بالحقول `value, unit, period, notes, measuredAt, createdAt`. إن كان تطبيقك الحالي يستخدم أسماء أخرى فعدّلها في `src/lib/glucose.js` و `src/components/Dashboard.jsx`.
