// Background push handler for WrapSheet price-drop alerts.
// This file must be served as a real static file at the site root (not
// rewritten to index.html) — Firebase Hosting serves static files before
// applying the SPA rewrite, so no firebase.json change is needed.
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyABbYoWx3fXC_TTZgTQ8ft6oPTLJbKOfzE",
  authDomain: "ourwrapsheet.firebaseapp.com",
  projectId: "ourwrapsheet",
  storageBucket: "ourwrapsheet.firebasestorage.app",
  messagingSenderId: "303534069062",
  appId: "1:303534069062:web:57490b46b75099df830147"
});

var messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  var data = payload.data || {};
  var title = (payload.notification && payload.notification.title) || "WrapSheet";
  var body = (payload.notification && payload.notification.body) || "";
  self.registration.showNotification(title, {
    body: body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: data,
    tag: data.boardId ? ("price-drop-" + data.boardId) : undefined
  });
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if ("focus" in list[i]) { list[i].navigate(url); return list[i].focus(); }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
