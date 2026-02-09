'use client';

import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app, db } from './config';

let messaging: Messaging | null = null;

function getMessagingInstance(): Messaging | null {
  if (typeof window === 'undefined') return null;
  if (!('Notification' in window)) return null;
  if (!messaging) {
    messaging = getMessaging(app);
  }
  return messaging;
}

/**
 * Register the FCM service worker and pass Firebase config to it.
 */
async function registerFcmServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
    scope: '/firebase-cloud-messaging-push-scope',
  });

  // Pass Firebase config to the background SW
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  if (registration.active) {
    registration.active.postMessage({ type: 'FIREBASE_CONFIG', config });
  } else {
    registration.addEventListener('activate', () => {
      registration.active?.postMessage({ type: 'FIREBASE_CONFIG', config });
    });
  }

  return registration;
}

/**
 * Request notification permission and obtain FCM token.
 * Only call after user interaction (never auto-prompt on load).
 * Stores the token in Firestore under the user's document.
 */
export async function requestNotificationPermission(userId: string): Promise<string | null> {
  const msg = getMessagingInstance();
  if (!msg) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const swRegistration = await registerFcmServiceWorker();
  if (!swRegistration) return null;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn('FCM VAPID key not configured. Set NEXT_PUBLIC_FIREBASE_VAPID_KEY in .env.local');
    return null;
  }

  const token = await getToken(msg, {
    vapidKey,
    serviceWorkerRegistration: swRegistration,
  });

  if (token) {
    // Store FCM token per user/device in Firestore
    const tokenRef = doc(db, 'users', userId, 'fcmTokens', token);
    await setDoc(tokenRef, {
      token,
      createdAt: serverTimestamp(),
      userAgent: navigator.userAgent,
    });
  }

  return token;
}

/**
 * Listen for foreground FCM messages.
 * Returns an unsubscribe function.
 */
export function onForegroundMessage(
  callback: (payload: { title?: string; body?: string; data?: Record<string, string> }) => void
): (() => void) | null {
  const msg = getMessagingInstance();
  if (!msg) return null;

  return onMessage(msg, (payload) => {
    callback({
      title: payload.notification?.title,
      body: payload.notification?.body,
      data: payload.data,
    });
  });
}
