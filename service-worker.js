// Service Worker خفيف لـ Disney - لتثبيت PWA فقط
const CACHE_NAME = 'disney-flower-luxury-v5.0';
const LOGO_ASSETS = [
  './Assets/disny.png',
  './Assets/disny-192.png',
  './Assets/disny-512.png',
];

// Install - فقط تسجيل (بدون cache ثقيل)
self.addEventListener('install', (event) => {
  console.log('[SW] تثبيت Service Worker خفيف');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(LOGO_ASSETS))
  );
  self.skipWaiting();
});

// Activate - حذف أي cache قديم
self.addEventListener('activate', (event) => {
  console.log('[SW] تفعيل Service Worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] حذف cache قديم:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - دائماً من الشبكة (Network First) - بدون cache للصفحات
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  const isLogoRequest = ['/Assets/disny.png', '/Assets/disny-192.png', '/Assets/disny-512.png'].some(path => requestUrl.pathname.endsWith(path));

  if (isLogoRequest) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request);
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => response)
      .catch(() => {
        // فقط في حالة عدم وجود إنترنت
        return new Response('يجب الاتصال بالإنترنت', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});

// 🔔 التعامل مع الضغط على الإشعارات
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] 🔔 تم الضغط على الإشعار:', event.action);
  
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // إذا كان الموقع مفتوح، التركيز عليه
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          // الانتقال لقسم العروض
          if (event.action === 'view' || !event.action) {
            client.postMessage({
              type: 'NAVIGATE_TO_FLASH_DEALS'
            });
          }
          return client.focus();
        }
      }
      
      // إذا لم يكن مفتوح، فتح نافذة جديدة
      if (clients.openWindow) {
        const url = event.action === 'view' || !event.action 
          ? self.registration.scope + 'offers.html'
          : self.registration.scope;
        return clients.openWindow(url);
      }
    })
  );
});
