import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase.js';

// أوقات القياس
export const PERIODS = [
  { id: 'fasting', label: 'صائم' },
  { id: 'after_meal', label: 'بعد الأكل' },
  { id: 'random', label: 'عشوائي' },
  { id: 'bedtime', label: 'قبل النوم' }
];

export function periodLabel(id) {
  const found = PERIODS.find((p) => p.id === id);
  return found ? found.label : 'غير محدد';
}

// أصناف Tailwind مكتوبة كاملة (حرفياً) كي لا تُحذف أثناء البناء
export const TONES = {
  low: {
    panel: 'bg-red-50 border-red-300',
    solid: 'bg-red-600',
    text: 'text-red-700',
    edge: 'border-r-red-600',
    chip: 'bg-red-100 text-red-800'
  },
  normal: {
    panel: 'bg-emerald-50 border-emerald-300',
    solid: 'bg-emerald-600',
    text: 'text-emerald-700',
    edge: 'border-r-emerald-600',
    chip: 'bg-emerald-100 text-emerald-800'
  },
  high: {
    panel: 'bg-amber-50 border-amber-300',
    solid: 'bg-amber-500',
    text: 'text-amber-700',
    edge: 'border-r-amber-500',
    chip: 'bg-amber-100 text-amber-800'
  },
  severe: {
    panel: 'bg-red-50 border-red-300',
    solid: 'bg-red-600',
    text: 'text-red-700',
    edge: 'border-r-red-600',
    chip: 'bg-red-100 text-red-800'
  },
  none: {
    panel: 'bg-white border-line',
    solid: 'bg-slate-400',
    text: 'text-ink',
    edge: 'border-r-slate-300',
    chip: 'bg-slate-100 text-slate-700'
  }
};

/**
 * تحليل القراءة (mg/dL):
 *  - أقل من 70      : هبوط (أحمر) + قاعدة 15-15
 *  - من 70 إلى 130  : طبيعي (أخضر)
 *  - من 131 إلى 180 : مرتفع قليلاً (أصفر)
 *  - أكثر من 180    : ارتفاع شديد (أحمر)
 * ملاحظة: هذه الحدود قابلة للتعديل هنا، وينبغي أن يضبطها الطبيب لكل مريض.
 */
export function analyzeGlucose(rawValue) {
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value <= 0) {
    return { level: 'none', tone: TONES.none, label: '', message: '', steps: [] };
  }

  if (value < 70) {
    const critical = value < 54;
    return {
      level: 'low',
      tone: TONES.low,
      label: critical ? 'هبوط شديد في السكر' : 'هبوط في السكر',
      message: critical
        ? 'القراءة أقل من 54 وهي خطيرة. عالج الهبوط فوراً.'
        : 'مستوى السكر منخفض. طبّق قاعدة 15-15 الآن.',
      steps: [
        'تناول 15 غراماً من سكر سريع الامتصاص: نصف كوب عصير، أو 3 إلى 4 أقراص غلوكوز، أو ملعقة كبيرة من السكر أو العسل.',
        'انتظر 15 دقيقة ثم أعد قياس السكر.',
        'إذا بقيت القراءة أقل من 70 كرّر الخطوتين السابقتين.',
        'بعد أن تتجاوز 70 تناول وجبة خفيفة إن كان موعد الوجبة بعيداً.',
        'إذا ظهر تشوش أو إغماء أو لم تتحسن القراءة فاطلب الإسعاف فوراً ولا تُعطِ المريض شيئاً بالفم وهو فاقد للوعي.'
      ]
    };
  }

  if (value <= 130) {
    return {
      level: 'normal',
      tone: TONES.normal,
      label: 'ضمن المعدل الطبيعي',
      message: 'قراءة جيدة. استمر على خطتك.',
      steps: []
    };
  }

  if (value <= 180) {
    return {
      level: 'high',
      tone: TONES.high,
      label: 'مرتفع قليلاً',
      message: 'القراءة أعلى من المعتاد. راقب وجباتك ونشاطك وأعد القياس لاحقاً.',
      steps: []
    };
  }

  const dka = value > 250;
  return {
    level: 'severe',
    tone: TONES.severe,
    label: 'ارتفاع شديد',
    message: 'مستوى السكر مرتفع جداً. اتبع خطة طبيبك وتواصل معه.',
    steps: [
      'اشرب الماء وتجنّب السكريات والنشويات الآن.',
      'اتبع تعليمات طبيبك بخصوص جرعة التصحيح من الأنسولين إن وُجدت.',
      'أعد القياس بعد ساعتين تقريباً.',
      ...(dka
        ? [
            'إذا استمرت القراءة فوق 250 مع غثيان أو قيء أو ألم بالبطن أو تنفس سريع أو نعاس شديد فاطلب مساعدة طبية فوراً (قد يكون حماضاً كيتونياً).'
          ]
        : [])
    ]
  };
}

/**
 * حفظ قراءة في المسار: users/{userId}/glucose_readings
 * ملاحظة مهمة: مع تفعيل العمل دون اتصال، لا يكتمل وعد addDoc إلا بعد تأكيد الخادم،
 * لذلك يعيد هذا التابع الوعد كما هو والمكوّن يقرر كيف ينتظره.
 */
export function saveGlucoseReading(userId, { value, period, notes }) {
  const col = collection(db, 'users', userId, 'glucose_readings');
  return addDoc(col, {
    value: Number(value),
    unit: 'mg/dL',
    period,
    notes: notes ? String(notes).trim() : '',
    measuredAt: Timestamp.now(), // وقت القياس على الجهاز (يعمل دون اتصال ويُستخدم للترتيب)
    createdAt: serverTimestamp() // وقت وصول السجل إلى الخادم
  });
}
