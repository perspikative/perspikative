import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";
import { app, db } from "/js/firebase.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const messaging = getMessaging(app);

export async function initNotifications(uid) {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return;

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
    scope: '/firebase-cloud-messaging-push-scope'
  });

  const token = await getToken(messaging, {
    vapidKey: "BEhIiUtyee4YlwJWrDQa4MOMCmDUWSr1pWa3yf1GCm88o-SG43MjIUUzcwVPbqaj80HqJyiCkEJvuLNxKoB35C8",
    serviceWorkerRegistration: registration
  });

  if (token && uid) {
    await setDoc(doc(db, "publicProfiles", uid), { fcmToken: token }, { merge: true });
  }

  onMessage(messaging, (payload) => {
    // notif pendant que l'onglet est ouvert
    console.log("Message reçu au premier plan :", payload);
  });
}