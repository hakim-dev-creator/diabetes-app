import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CloudOff, Loader2 } from 'lucide-react';
import { PERIODS, analyzeGlucose, saveGlucoseReading } from '../lib/glucose.js';

const MIN_VALUE = 10;
const MAX_VALUE = 1000;

export default function GlucoseInputForm({ user, onSaved }) {
  const [value, setValue] = useState('');
  const [period, setPeriod] = useState('fasting');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null); // { pending: boolean }

  const analysis = useMemo(() => analyzeGlucose(value), [value]);
  const hasValue = analysis.level !== 'none';
  const tone = analysis.tone;

  const handleValueChange = (event) => {
    // أرقام وفاصلة عشرية فقط
    const cleaned = event.target.value.replace(/[^0-9.]/g, '');
    setValue(cleaned);
    setSuccess(null);
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess(null);

    const number = Number(value);
    if (!Number.isFinite(number) || number < MIN_VALUE || number > MAX_VALUE) {
      setError(`أدخل قيمة صحيحة بين ${MIN_VALUE} و ${MAX_VALUE} mg/dL.`);
      return;
    }

    setSaving(true);
    try {
      const writePromise = saveGlucoseReading(user.uid, { value: number, period, notes });

      // دون اتصال: لا يكتمل الوعد إلا بعد وصول الخادم، فننتظر 4 ثوانٍ فقط
      // وإن لم يكتمل نعتبر القراءة محفوظة محلياً وبانتظار المزامنة
      const outcome = await Promise.race([
        writePromise.then(() => 'synced'),
        new Promise((resolve) => setTimeout(() => resolve('pending'), 4000))
      ]);

      setSuccess({ pending: outcome === 'pending' });
      setValue('');
      setNotes('');
      if (onSaved) onSaved();

      // إن فشلت الكتابة لاحقاً (مثلاً رفض القواعد) نُعلم المستخدم
      writePromise.catch((e) => {
        console.error(e);
        setSuccess(null);
        setError('تعذّرت مزامنة القراءة مع الخادم. تحقق من الصلاحيات أو أعد المحاولة.');
      });
    } catch (e) {
      console.error(e);
      setError('تعذّر حفظ القراءة. حاول مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* لوحة القراءة: يتغير لونها حسب مستوى السكر */}
      <section
        aria-live="polite"
        className={`rounded-3xl border-2 p-5 transition-colors duration-300 ${tone.panel}`}
      >
        <label htmlFor="glucose" className="block text-sm font-bold text-slate-600">
          مستوى السكر في الدم
        </label>
        <div className="mt-2 flex items-end justify-center gap-2">
          <input
            id="glucose"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="000"
            value={value}
            onChange={handleValueChange}
            className={`num w-40 bg-transparent text-center text-6xl font-extrabold placeholder:text-slate-300 focus:outline-none ${tone.text}`}
          />
          <span className="num mb-3 text-lg font-bold text-slate-500">mg/dL</span>
        </div>

        {hasValue && (
          <div className="mt-3 text-center">
            <span className={`inline-block rounded-full px-4 py-1.5 text-sm font-bold ${tone.chip}`}>
              {analysis.label}
            </span>
            <p className={`mt-3 text-base font-bold leading-relaxed ${tone.text}`}>
              {analysis.message}
            </p>
          </div>
        )}
      </section>

      {/* تنبيه قاعدة 15-15 وخطوات الطوارئ */}
      {hasValue && analysis.steps.length > 0 && (
        <section
          role="alert"
          className={`rounded-2xl border-2 p-4 ${tone.panel}`}
        >
          <h2 className={`flex items-center gap-2 text-lg font-extrabold ${tone.text}`}>
            <AlertTriangle size={22} aria-hidden="true" />
            {analysis.level === 'low' ? 'قاعدة 15-15 للهبوط' : 'ماذا تفعل الآن'}
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pr-5 text-sm leading-relaxed text-ink">
            {analysis.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-slate-500">
            إرشادات عامة وليست بديلاً عن توجيهات طبيبك.
          </p>
        </section>
      )}

      {/* وقت القياس */}
      <fieldset>
        <legend className="mb-2 text-sm font-bold text-slate-600">وقت القياس</legend>
        <div className="grid grid-cols-2 gap-2">
          {PERIODS.map((p) => {
            const active = period === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                onClick={() => setPeriod(p.id)}
                className={`rounded-xl border-2 py-3 text-base font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-deep focus-visible:ring-offset-2 ${
                  active
                    ? 'border-deep bg-deep text-white'
                    : 'border-line bg-white text-ink'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* ملاحظات */}
      <div>
        <label htmlFor="notes" className="mb-2 block text-sm font-bold text-slate-600">
          ملاحظات (اختياري)
        </label>
        <textarea
          id="notes"
          rows={2}
          maxLength={300}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="مثال: بعد مجهود رياضي، أو وجبة غنية بالنشويات"
          className="w-full rounded-xl border border-line bg-white p-3 text-base focus:outline-none focus:ring-2 focus:ring-deep"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {success.pending ? (
            <CloudOff size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          )}
          <span>
            {success.pending
              ? 'تم حفظ القراءة على جهازك وستُزامَن تلقائياً عند عودة الاتصال.'
              : 'تم حفظ القراءة بنجاح.'}
          </span>
        </p>
      )}

      <button
        type="submit"
        disabled={saving || !hasValue}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-deep py-4 text-lg font-extrabold text-white disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-deep"
      >
        {saving && <Loader2 size={22} className="animate-spin" />}
        حفظ القراءة
      </button>
    </form>
  );
}
