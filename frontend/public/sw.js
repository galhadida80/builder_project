var API_CACHE_NAME = 'builderops-api-v1';
var STATIC_CACHE_NAME = 'builderops-static-v1';

var STATIC_ASSETS = [
  '/',
  '/index.html',
];

var API_CACHE_PATTERNS = [
  /\/api\/v1\/projects\/[^/]+\/equipment/,
  /\/api\/v1\/projects\/[^/]+\/materials/,
  /\/api\/v1\/projects\/[^/]+\/inspections/,
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) {
            return key !== API_CACHE_NAME && key !== STATIC_CACHE_NAME;
          })
          .map(function(key) {
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

function isApiCacheable(url) {
  return API_CACHE_PATTERNS.some(function(pattern) {
    return pattern.test(url);
  });
}

function isStaticAsset(url) {
  var path = new URL(url).pathname;
  return (
    path.endsWith('.js') ||
    path.endsWith('.css') ||
    path.endsWith('.png') ||
    path.endsWith('.jpg') ||
    path.endsWith('.svg') ||
    path.endsWith('.woff2')
  );
}

self.addEventListener('fetch', function(event) {
  var request = event.request;

  if (request.method !== 'GET') return;

  if (isApiCacheable(request.url)) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE_NAME));
    return;
  }

  if (isStaticAsset(request.url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
    return;
  }
});

function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then(function(cache) {
    return cache.match(request).then(function(cachedResponse) {
      var fetchPromise = fetch(request)
        .then(function(networkResponse) {
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(function() {
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    });
  });
}

function cacheFirst(request, cacheName) {
  return caches.open(cacheName).then(function(cache) {
    return cache.match(request).then(function(cachedResponse) {
      if (cachedResponse) return cachedResponse;

      return fetch(request)
        .then(function(networkResponse) {
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(function() {
          return new Response('Offline', { status: 503 });
        });
    });
  });
}

// Push notification support
self.addEventListener('push', function(event) {
  var data = { title: 'BuilderOps', body: 'You have a new notification', url: '/' };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch (e) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].url.includes(self.location.origin) && 'focus' in clientList[i]) {
          clientList[i].navigate(url);
          return clientList[i].focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
