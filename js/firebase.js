// ============================= FIREBASE - PERSPIKATIVE =============================
// Fichier unique : init app, Firestore, Auth (Google login/logout + One Tap), exports globaux.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getFirestore,
  collection,
  query,
  where,
  limit,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
  getRedirectResult,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";


const firebaseConfig = {
  apiKey: "AIzaSyBudMYu4rtSL7GrsX3OMtT8klbBX7h4iTE",
  authDomain: "auth.perspikative.com",
  projectId: "perspikative-app",
  storageBucket: "perspikative-app.firebasestorage.app",
  messagingSenderId: "411164951584",
  appId: "1:411164951584:web:d340b95c22d95668c86845"
};

// ID client Web OAuth (utilisé par Google One Tap)
const GOOGLE_CLIENT_ID = "411164951584-80iksi66b1095klelvm1jvocsjglvm09.apps.googleusercontent.com";


// =============================
// INIT APP
// =============================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


// =============================
// EXPORT GLOBAL (POUR TES SCRIPTS: comments, moderation, etc.)
// =============================
window.__prspkDb = db;
window.__prspkAuth = auth;

window.__prspkFire = {
  collection,
  query,
  where,
  limit,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  runTransaction
};


// =============================
// DETECTION MOBILE
// (popup Google est peu fiable sur mobile : Safari iOS bloque souvent les popups,
// certains navigateurs Android en WebView perdent le contexte JS pendant le popup.
// On bascule sur signInWithRedirect dans ces cas.)
// =============================
function isMobileBrowser() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}


// =============================
// AUTH (GOOGLE LOGIN)
// =============================
const provider = new GoogleAuthProvider();

window.prspkLogin = function () {
  if (isMobileBrowser()) {
    // Sur mobile on redirige : le retour est géré par getRedirectResult ci-dessous.
    signInWithRedirect(auth, provider).catch(console.error);
  } else {
    signInWithPopup(auth, provider).catch(console.error);
  }
};

window.prspkLogout = function () {
  signOut(auth);
};

// Si on revient d'une redirection mobile, on récupère le résultat explicitement.
// C'est souvent LA cause des "infos manquantes après connexion Google sur mobile" :
// sans ça, on compte uniquement sur onAuthStateChanged qui peut se déclencher
// avant que le token/redirect ne soit pleinement traité par le SDK.
getRedirectResult(auth).catch((err) => {
  console.error("Erreur getRedirectResult:", err);
});


// =============================
// USER GLOBAL + PROMESSE D'ATTENTE
// =============================
// Event existant, conservé pour compatibilité avec le code déjà en place.
// + une promesse globale que n'importe quel script chargé APRÈS peut await,
// au lieu de risquer de manquer l'event si l'auth est déjà résolue avant
// qu'il n'ait eu le temps d'ajouter son listener (source classique de bugs
// intermittents, surtout sur mobile où le timing réseau est plus lent).
let resolveAuthReady;
window.__prspkAuthReady = new Promise((resolve) => {
  resolveAuthReady = resolve;
});

onAuthStateChanged(auth, (user) => {
  window.__prspkUser = user;

  document.dispatchEvent(
    new CustomEvent("prspk:auth-ready", {
      detail: { user }
    })
  );

  if (resolveAuthReady) {
    resolveAuthReady(user);
    resolveAuthReady = null; // ne resolve qu'une fois, la promesse sert au premier chargement
  }
});


// =============================
// GOOGLE ONE TAP (page d'accueil uniquement)
// =============================
let oneTapStarted = false;

async function startOneTap() {
  if (oneTapStarted) return;

  // Uniquement sur la home (body.home) et si la lib Google est chargée
  if (!document.body || !document.body.classList.contains("home")) return;
  if (!window.google || !google.accounts || !google.accounts.id) return;

  oneTapStarted = true;

  // On attend de savoir si l'utilisateur est déjà connecté
  const user = await window.__prspkAuthReady;
  if (user) return;

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: async (response) => {
      try {
        const credential = GoogleAuthProvider.credential(response.credential);
        await signInWithCredential(auth, credential);
      } catch (err) {
        console.error("Erreur One Tap:", err);
      }
    },
    auto_select: false,
    cancel_on_tap_outside: true,
    use_fedcm_for_prompt: true,
    itp_support: true
  });

  // Laisse le loader du site finir (2,6 s) avant d'afficher le prompt
  setTimeout(() => {
    if (!auth.currentUser) {
      google.accounts.id.prompt();
    }
  }, 2800);
}

// Cas 1 : la lib Google se charge APRÈS ce module → elle appelle ce callback
window.onGoogleLibraryLoad = startOneTap;
// Cas 2 : la lib Google était DÉJÀ chargée avant ce module
startOneTap();


// =============================
// EXPORTS (pour les modules qui importent directement ce fichier)
// =============================
export { app, auth, db };
