import { pushApi } from '../services/api';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function isPushNotificationSupported(): Promise<boolean> {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!(await isPushNotificationSupported())) return null;
  const registration = await navigator.serviceWorker.ready;
  return await registration.pushManager.getSubscription();
}

export async function subscribeToPushNotifications(): Promise<{ success: boolean; message: string }> {
  if (!(await isPushNotificationSupported())) {
    return { success: false, message: 'Las notificaciones Web Push no son soportadas en este navegador o dispositivo.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { success: false, message: 'Permiso de notificaciones denegado por el usuario.' };
  }

  try {
    const { publicKey } = await pushApi.getPublicKey();
    if (!publicKey) {
      return { success: false, message: 'No se pudo obtener la clave pública VAPID del servidor.' };
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(publicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      return { success: false, message: 'La suscripción no contiene las credenciales necesarias.' };
    }

    await pushApi.suscribir({
      endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth,
    });

    return { success: true, message: '¡Notificaciones Web Push activadas con éxito en este dispositivo!' };
  } catch (error: any) {
    console.error('[WebPush] Error al suscribirse:', error);
    return {
      success: false,
      message: error?.response?.data?.message || error?.message || 'Error al suscribirse a las notificaciones.',
    };
  }
}
