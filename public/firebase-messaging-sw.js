// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCQ5qBEmXMyKkudaGiiZHMSMArCwprhPpg",
  authDomain: "prangon-official.firebaseapp.com",
  databaseURL: "https://prangon-official-default-rtdb.firebaseio.com",
  projectId: "prangon-official",
  storageBucket: "prangon-official.firebasestorage.app",
  messagingSenderId: "183437633568",
  appId: "1:183437633568:web:37e46cf2b26bc71fa87445",
  measurementId: "G-67ZDVDMFNY"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'Prangon';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    tag: payload.data?.type || 'default',
    data: payload.data,
    vibrate: [200, 100, 200],
    actions: getNotificationActions(payload.data?.type),
    requireInteraction: payload.data?.type === 'incoming_call',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Get actions based on notification type
function getNotificationActions(type) {
  switch (type) {
    case 'incoming_call':
      return [
        { action: 'answer', title: 'Answer', icon: '/icons/phone.png' },
        { action: 'decline', title: 'Decline', icon: '/icons/phone-off.png' }
      ];
    case 'message':
      return [
        { action: 'reply', title: 'Reply' },
        { action: 'view', title: 'View' }
      ];
    default:
      return [{ action: 'view', title: 'View' }];
  }
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/';

  // Determine URL based on notification type
  switch (data.type) {
    case 'message':
      targetUrl = `/messages?friend=${data.senderId}`;
      break;
    case 'incoming_call':
    case 'missed_call':
      targetUrl = `/messages?friend=${data.callerId}`;
      break;
    case 'friend_request':
      targetUrl = '/friends';
      break;
    case 'like':
    case 'comment':
      targetUrl = data.postId ? `/post/${data.postId}` : '/notifications';
      break;
    default:
      targetUrl = data.action_url || '/notifications';
  }

  // Handle action clicks
  if (event.action === 'answer' && data.type === 'incoming_call') {
    targetUrl = `/messages?friend=${data.callerId}&answer=true`;
  } else if (event.action === 'decline' && data.type === 'incoming_call') {
    // Just close notification, don't navigate
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICK', data, targetUrl });
          return;
        }
      }
      // Open new window
      return clients.openWindow(targetUrl);
    })
  );
});

// Handle push events directly
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event);
  
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[SW] Push payload:', payload);
    } catch (e) {
      console.log('[SW] Push data (text):', event.data.text());
    }
  }
});
