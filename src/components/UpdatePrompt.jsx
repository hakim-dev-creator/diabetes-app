import { RefreshCw, WifiOff, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const CHECK_EVERY_MS = 60 * 60 * 1000; // فحص وجود تحديث كل ساعة

export default function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (registration) {
        setInterval(() => {
          registration.update().catch(() => {});
        }, CHECK_EVERY_MS);
      }
    },
    onRegisterError(error) {
      console.error('تعذّر تسجيل عامل الخدمة:', error);
    }
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 safe-bottom pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-md rounded-2xl bg-ink text-white shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {needRefresh ? (
              <RefreshCw size={22} aria-hidden="true" />
            ) : (
              <WifiOff size={22} aria-hidden="true" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-bold text-base">
              {needRefresh ? 'يتوفر إصدار جديد من التطبيق' : 'التطبيق جاهز للعمل دون اتصال'}
            </p>
            <p className="text-sm text-white/75 mt-1 leading-relaxed">
              {needRefresh
                ? 'اضغط تحديث الآن لتحصل على آخر التحسينات. بياناتك محفوظة ولن تتأثر.'
                : 'يمكنك تسجيل القراءات حتى عند انقطاع الإنترنت وستتم مزامنتها لاحقاً.'}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="إغلاق"
            className="shrink-0 p-1 rounded-lg text-white/70 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          {needRefresh && (
            <button
              type="button"
              onClick={() => updateServiceWorker(true)}
              className="flex-1 rounded-xl bg-white text-ink font-bold py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              تحديث الآن
            </button>
          )}
          <button
            type="button"
            onClick={close}
            className="flex-1 rounded-xl border border-white/30 text-white py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {needRefresh ? 'لاحقاً' : 'حسناً'}
          </button>
        </div>
      </div>
    </div>
  );
}
