import { Capacitor } from '@capacitor/core';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';

const STORAGE_KEY = 'diabetes_care_biometric_uid';

export function isNative() {
  return Capacitor.isNativePlatform();
}

// هل الجهاز يدعم البصمة (أو بيانات حيوية أخرى) ومفعّلة فيه؟
export async function isBiometricAvailable() {
  if (!isNative()) return false;
  try {
    const info = await BiometricAuth.checkBiometry();
    return Boolean(info && info.isAvailable);
  } catch (e) {
    return false;
  }
}

// معرّف المستخدم الذي فعّل البصمة على هذا الجهاز (أو null)
export function getBiometricUid() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    return null;
  }
}

export function enableBiometricFor(uid) {
  try {
    localStorage.setItem(STORAGE_KEY, uid);
  } catch (e) {
    /* تجاهل */
  }
}

export function disableBiometric() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    /* تجاهل */
  }
}

// عرض نافذة البصمة. تعيد { ok: true } أو { ok: false, message }
export async function promptBiometric() {
  try {
    await BiometricAuth.authenticate({
      reason: 'تحقق من هويتك للدخول إلى بياناتك الصحية',
      cancelTitle: 'إلغاء',
      allowDeviceCredential: false,
      androidTitle: 'مرافق السكري',
      androidSubtitle: 'ضع إصبعك على المستشعر للدخول',
      androidConfirmationRequired: false
    });
    return { ok: true };
  } catch (e) {
    const code = e && e.code;
    let message = 'تعذّر التحقق بالبصمة. حاول مرة أخرى.';
    if (code === 'userCancel') message = 'تم إلغاء التحقق.';
    else if (code === 'biometryLockout')
      message = 'تم قفل البصمة مؤقتاً بسبب محاولات فاشلة. انتظر قليلاً ثم حاول مجدداً.';
    else if (code === 'biometryNotEnrolled')
      message = 'لا توجد بصمة مسجلة على هذا الجهاز. أضف بصمتك من إعدادات الهاتف.';
    else if (code === 'biometryNotAvailable')
      message = 'البصمة غير متاحة على هذا الجهاز.';
    else if (code === 'authenticationFailed') message = 'لم تتطابق البصمة. حاول مرة أخرى.';
    return { ok: false, message };
  }
}
