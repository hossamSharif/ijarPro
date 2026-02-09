// Firebase Cloud Messaging background service worker
// This runs separately from the main Serwist service worker
//
// Note: Firebase config is passed via postMessage from the client.
// The SW waits for config before initializing FCM.

importScripts(
  'https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js'
);

let messagingInitialized = false;

self.addEventListener('message', (event) => {
  if (event.data?.type === 'FIREBASE_CONFIG' && !messagingInitialized) {
    firebase.initializeApp(event.data.config);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const notificationTitle = payload.notification?.title || 'إيجار برو';
      const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        dir: 'rtl',
        lang: 'ar',
        data: payload.data,
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });

    messagingInitialized = true;
  }
});
