import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { CloudOff, Droplet } from 'lucide-react';
import { db } from '../firebase.js';
import { analyzeGlucose, periodLabel } from '../lib/glucose.js';

const dateFormatter = new Intl.DateTimeFormat('ar-DZ', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit'
});

function formatDate(date) {
  if (!date) return 'الآن';
  try {
    return dateFormatter.format(date);
  } catch (e) {
    return date.toLocaleString();
  }
}

export default function Dashboard({ user, onAddReading }) {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    const q = query(
      collection(db, 'users', user.uid, 'glucose_readings'),
      orderBy('measuredAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const items = snapshot.docs.map((doc) => {
          const data = doc.data({ serverTimestamps: 'estimate' });
          return {
            id: doc.id,
            value: data.value,
            period: data.period,
            notes: data.notes || '',
            date: data.measuredAt && data.measuredAt.toDate ? data.measuredAt.toDate() : null,
            pending: doc.metadata.hasPendingWrites
          };
        });
        setReadings(items);
        setLoading(false);
      },
      (e) => {
        console.error(e);
        setError('تعذّر تحميل القراءات. تحقق من الاتصال ومن قواعد الأمان.');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user.uid]);

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="جارٍ التحميل">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-white ring-1 ring-line" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
        {error}
      </p>
    );
  }

  if (readings.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center ring-1 ring-line">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-mist text-deep">
          <Droplet size={30} aria-hidden="true" />
        </div>
        <h2 className="text-xl font-extrabold">لا توجد قراءات بعد</h2>
        <p className="mt-2 text-slate-600">سجّل أول قراءة لتظهر هنا مع تحليلها.</p>
        <button
          type="button"
          onClick={onAddReading}
          className="mt-5 rounded-xl bg-deep px-6 py-3 font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-deep"
        >
          تسجيل قراءة
        </button>
      </div>
    );
  }

  const latest = readings[0];
  const latestAnalysis = analyzeGlucose(latest.value);

  return (
    <div className="space-y-4">
      {/* آخر قراءة */}
      <section className={`rounded-3xl border-2 p-5 ${latestAnalysis.tone.panel}`}>
        <p className="text-sm font-bold text-slate-600">آخر قراءة</p>
        <div className="mt-1 flex items-end gap-2">
          <span className={`num text-6xl font-extrabold ${latestAnalysis.tone.text}`}>
            {latest.value}
          </span>
          <span className="num mb-2 font-bold text-slate-500">mg/dL</span>
        </div>
        <span
          className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-bold ${latestAnalysis.tone.chip}`}
        >
          {latestAnalysis.label}
        </span>
      </section>

      <h2 className="px-1 text-lg font-extrabold">آخر 5 قراءات</h2>

      <ul className="space-y-3">
        {readings.map((reading) => {
          const analysis = analyzeGlucose(reading.value);
          return (
            <li
              key={reading.id}
              className={`flex items-center justify-between gap-3 rounded-2xl border-r-8 bg-white p-4 shadow-sm ring-1 ring-line ${analysis.tone.edge}`}
            >
              <div className="min-w-0">
                <p className="text-base font-bold">{periodLabel(reading.period)}</p>
                <p className="mt-0.5 text-sm text-slate-500">{formatDate(reading.date)}</p>
                {reading.notes && (
                  <p className="mt-1 truncate text-sm text-slate-600">{reading.notes}</p>
                )}
                {reading.pending && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-bold text-amber-700">
                    <CloudOff size={14} aria-hidden="true" />
                    بانتظار المزامنة
                  </p>
                )}
              </div>
              <div className="shrink-0 text-center">
                <p className={`num text-3xl font-extrabold ${analysis.tone.text}`}>
                  {reading.value}
                </p>
                <p className="num text-xs text-slate-500">mg/dL</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
