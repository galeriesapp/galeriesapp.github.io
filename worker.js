importScripts('/bower_components/cache-polyfill/dist/serviceworker-cache-polyfill.js');

// The SW will be shutdown when not in use to save memory,
// be aware that any global state is likely to disappear

var DEFAULT_CACHE = 'gallery-app-static2';
var ARTBARCELONA_CACHE = 'gallery-artbarcelona-static2';

console.log('SW startup', DEFAULT_CACHE);

self.addEventListener('install', function(event) {
  // pre cache a load of stuff:
  event.waitUntil(
    caches.open(DEFAULT_CACHE).then(function(cache) {
      return cache.addAll([
        '/scripts/app.js',
        '/elements/elements.critical.vulcanized.html',
        '/all.json'
      ]);
    })
  )
});

// Remove any cache that isn't on the whitelist
// This is a good way to clean up left over caches
// when a new Service Worker is installed
self.addEventListener('activate', function(event) {
  var cacheWhitelist = [DEFAULT_CACHE, ARTBARCELONA_CACHE];

  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// During a fetch, check to see if the requested
// resource is already cached, if so, return it.
// If the requested resource comes from Amazon S3,
// dynamically cache it.
self.addEventListener('fetch', function(event) {
  console.log('fetching', event.request.url);
  var requestURL = new URL(event.request.url);

  if (requestURL.hostname == 'artbarcelona.es') {
    console.log('fetching from artbarcelona');
    event.respondWith(artBarcelonaResponse(event.request));
  } else {
    console.log('fetching generic asset');
    event.respondWith(
      caches.match(event.request).then(function(response) {
        return response || fetch(event.request);
      })
    );
  }
});

function artBarcelonaResponse(request) {
  return caches.match(request).then(function(response) {
    if (response) {
      console.log('found match in artBarcelona cache');
      return response;
    }

    return fetch(request).then(function(response) {
      caches.open(ARTBARCELONA_CACHE).then(function(cache) {
        cache.put(request, response).then(function() {
          console.log('yey img cache');
        }, function() {
          console.log('nay img cache');
        });
      });

      return response.clone();
    });
  });
}
