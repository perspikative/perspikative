import {
    getAuth,
    onAuthStateChanged,
    updateProfile,
    signOut,
    deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const auth = getAuth();

// -----------------------------------------------------------------------
// Config : liste des avatars disponibles dans la galerie de la modale.
// Adapte ce nombre si tu ajoutes/retires des fichiers dans /pics/assets/pfp/
// -----------------------------------------------------------------------
const AVATAR_COUNT = 8;
const AVATAR_PATH = (n) => `/pics/assets/pfp/${n}.webp`;
const DEFAULT_AVATAR = AVATAR_PATH(1);

const MOIS_FR = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre"
];

// -----------------------------------------------------------------------
// Usernames réservés — garde cette liste synchronisée avec les règles
// Firestore (voir security rules) qui font aussi cette vérification côté
// serveur pour ne jamais dépendre uniquement du client.
// -----------------------------------------------------------------------
const RESERVED_USERNAMES = new Set([
    "login", "profile", "account", "admin", "search", "rechercher",
    "portfolio", "creations", "illustrations", "projets", "commu",
    "actus", "about", "beta", "help", "help-center", "contact", "api",
    "404", "tartineske", "mentions-legales",
    "politique-de-confidentialite", "terms-of-service", "position-ia",
    "brand-guidelines", "art-challenge", "www", "assets", "static",
    "settings", "explore", "home", "index"
]);

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

// -----------------------------------------------------------------------
// Références DOM — profil (colonne gauche)
// -----------------------------------------------------------------------
const profilePic = document.getElementById("profilePic");
const displayName = document.getElementById("displayName");
const email = document.getElementById("email");
const profileBio = document.getElementById("profileBio");
const profileSince = document.getElementById("profileSince");
const profileUsername = document.getElementById("profileUsername");

const btnEditProfile = document.getElementById("btnEditProfile");
const editOverlay = document.getElementById("editOverlay");
const editClose = document.getElementById("editClose");
const editCancelBtn = document.getElementById("editCancelBtn");
const editSaveBtn = document.getElementById("editSaveBtn");
const editStatus = document.getElementById("editStatus");
const editNameInput = document.getElementById("editNameInput");
const editUsernameInput = document.getElementById("editUsernameInput");
const editUsernameStatus = document.getElementById("editUsernameStatus");
const editBioInput = document.getElementById("editBioInput");
const bioCharCount = document.getElementById("bioCharCount");
const btnLogout = document.getElementById("btnLogout");
const accountEmail = document.getElementById("accountEmail");
const accountId = document.getElementById("accountId");
const btnDeleteAccount = document.getElementById("btnDeleteAccount");

// -----------------------------------------------------------------------
// Références DOM — onglet Confidentialité
// -----------------------------------------------------------------------
const publicUrlValue = document.getElementById("publicUrlValue");
const btnViewPublicProfile = document.getElementById("btnViewPublicProfile");
const visibilityForm = document.getElementById("visibilityForm");
const visibilityStatus = document.getElementById("visibilityStatus");

// -----------------------------------------------------------------------
// Références DOM — lightbox photo de profil (coverflow)
// -----------------------------------------------------------------------
const btnOpenAvatarLightbox = document.getElementById("btnOpenAvatarLightbox");
const profilePicWrapper = btnOpenAvatarLightbox; // même élément, alias par clarté
const avatarLightbox = document.getElementById("avatarLightbox");
const avatarLightboxClose = document.getElementById("avatarLightboxClose");
const avatarCoverflowTrack = document.getElementById("avatarCoverflowTrack");
const avatarArrowLeft = document.getElementById("avatarArrowLeft");
const avatarArrowRight = document.getElementById("avatarArrowRight");
const avatarLightboxSave = document.getElementById("avatarLightboxSave");

let currentUser = null;
let selectedAvatar = DEFAULT_AVATAR;
let currentUsername = null; // valeur normalisée actuellement enregistrée
let currentUsernameDisplay = null; // casse d'affichage actuellement enregistrée
let usernameCheckToken = 0; // pour ignorer les réponses de vérif obsolètes

// -----------------------------------------------------------------------
// Onglets Compte / Confidentialité / Sécurité
// -----------------------------------------------------------------------
const tabButtons = document.querySelectorAll(".profile-tab-btn");
const tabPanels = document.querySelectorAll(".profile-tab-content");

tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        const target = btn.dataset.tab;

        tabButtons.forEach((b) => {
            b.classList.toggle("active", b === btn);
            b.setAttribute("aria-selected", b === btn ? "true" : "false");
        });

        tabPanels.forEach((panel) => {
            panel.classList.toggle("active", panel.dataset.tabPanel === target);
        });
    });
});

// -----------------------------------------------------------------------
// Utilitaires Firestore (via window.__prspkDb / window.__prspkFire,
// exposés par firebase-init.js)
// -----------------------------------------------------------------------
function getFire() {
    return {
        db: window.__prspkDb,
        fns: window.__prspkFire
    };
}

async function fetchUserDoc(uid) {
    const { db, fns } = getFire();
    if (!db || !fns) return null;
    const ref = fns.doc(db, "users", uid);
    const snap = await fns.getDoc(ref);
    return snap.exists() ? snap.data() : null;
}

async function saveUserDoc(uid, data) {
    const { db, fns } = getFire();
    if (!db || !fns) return;
    const ref = fns.doc(db, "users", uid);
    await fns.setDoc(ref, data, { merge: true });
}

// -----------------------------------------------------------------------
// Profil public minimal (username + usernameDisplay + photoURL uniquement,
// JAMAIS displayName), lisible par tout le monde même si le profil complet
// (users/{uid}) est privé. C'est ce document que script-comments.js et
// public-profile.js consultent pour garder pseudo/@/photo à jour, quel que
// soit isPublic.
// -----------------------------------------------------------------------
async function syncPublicProfile(uid, { photoURL, username, usernameDisplay } = {}) {
    const { db, fns } = getFire();
    if (!db || !fns) return;
    const data = {};
    if (photoURL !== undefined) data.photoURL = photoURL;
    if (username !== undefined) data.username = username;
    if (usernameDisplay !== undefined) data.usernameDisplay = usernameDisplay;
    if (Object.keys(data).length === 0) return;
    const ref = fns.doc(db, "publicProfiles", uid);
    await fns.setDoc(ref, data, { merge: true });
}

// -----------------------------------------------------------------------
// Username : normalisation, validation, vérification d'unicité
// -----------------------------------------------------------------------
function normalizeUsername(raw) {
    return (raw || "").trim().toLowerCase();
}

function validateUsernameFormat(normalized) {
    if (!normalized) return "Choisis un nom d'utilisateur.";
    if (!USERNAME_REGEX.test(normalized)) {
        return "3 à 20 caractères : lettres minuscules, chiffres et _ uniquement, sans espace.";
    }
    if (RESERVED_USERNAMES.has(normalized)) {
        return "Ce nom d'utilisateur est réservé, choisis-en un autre.";
    }
    return null;
}

// Vérifie que le username n'est pas déjà pris par un AUTRE utilisateur.
// Lit directement usernames/{normalized} : c'est ce document qui fait
// foi pour l'unicité (son ID EST le username). Une lecture simple suffit
// ici pour un feedback instantané ; la garantie réelle contre les races
// vient de la transaction dans saveUsername() plus bas, appliquée à
// l'écriture, pas à cette vérification "live" qui sert juste d'UX.
async function isUsernameTaken(normalized, ownUid) {
    const { db, fns } = getFire();
    if (!db || !fns) return false;

    const ref = fns.doc(db, "usernames", normalized);
    const snap = await fns.getDoc(ref);

    if (!snap.exists()) return false;
    return snap.data().uid !== ownUid;
}

// -----------------------------------------------------------------------
// Réservation atomique du username : dans une seule transaction Firestore,
// on vérifie que le nouveau pseudo est libre, on le réserve, on libère
// l'ancien (s'il y en avait un), et on met à jour users/{uid}. Tout ou
// rien : si un autre utilisateur a pris le pseudo entre-temps, la
// transaction échoue proprement et rien n'est écrit.
// -----------------------------------------------------------------------
async function saveUsername(uid, oldUsername, newUsername, newUsernameDisplay) {
    const { db, fns } = getFire();
    if (!db || !fns) throw new Error("Firebase non initialisé");

    const newRef = fns.doc(db, "usernames", newUsername);
    const userRef = fns.doc(db, "users", uid);
    const oldRef = oldUsername ? fns.doc(db, "usernames", oldUsername) : null;

    await fns.runTransaction(db, async (tx) => {
        const newSnap = await tx.get(newRef);

        if (newSnap.exists() && newSnap.data().uid !== uid) {
            throw new Error("USERNAME_TAKEN");
        }

        // set(..., {merge:false}) implicite : si newSnap n'existe pas encore,
        // Firestore traite ceci comme une vraie création (règle "create").
        // S'il existe déjà et nous appartient (renouvellement), c'est un
        // "update" — autorisé nulle part explicitement dans les règles
        // usernames/{username} (allow update: if false), donc on ne réécrit
        // le doc que s'il n'existe pas encore, pour rester dans le chemin
        // "create" à chaque fois.
        if (!newSnap.exists()) {
            tx.set(newRef, { uid });
        }

        if (oldRef && oldUsername !== newUsername) {
            tx.delete(oldRef);
        }
        tx.set(userRef, {
            username: newUsername,
            usernameDisplay: newUsernameDisplay
        }, { merge: true });
    });
}

// -----------------------------------------------------------------------
// Formatage de la date d'inscription : "Perspikativeur depuis mars 2026"
// -----------------------------------------------------------------------
function formatSince(date) {
    const mois = MOIS_FR[date.getMonth()];
    const annee = date.getFullYear();
    return `Perspikativeur depuis ${mois} ${annee}`;
}

// -----------------------------------------------------------------------
// Helper : écrit du texte dans la partie ".real-text" d'un élément qui
// contient aussi un skeleton de chargement superposé (voir CSS), sans
// jamais toucher au skeleton lui-même (il est retiré via .is-loaded,
// séparément — voir markLoaded()).
// -----------------------------------------------------------------------
function setRealText(el, text) {
    if (!el) return;
    const target = el.querySelector(".real-text");
    if (target) {
        target.textContent = text;
    } else {
        // Élément sans skeleton (pas concerné par ce système) : fallback
        // sur l'ancien comportement direct.
        el.textContent = text;
    }
}

function getRealText(el) {
    if (!el) return "";
    const target = el.querySelector(".real-text");
    return target ? target.textContent : el.textContent;
}

// Déclenche le fade-in : masque le skeleton, affiche le texte réel déjà
// posé par setRealText(). À appeler une seule fois les données définitives
// disponibles pour cet élément (pas de flash / pas de retour au skeleton
// après coup).
function markLoaded(el) {
    if (el) el.classList.add("is-loaded");
}

// -----------------------------------------------------------------------
// Rendu de la bio (avec état vide stylé)
// -----------------------------------------------------------------------
function renderBio(bio) {
    const trimmed = (bio || "").trim();
    if (trimmed) {
        setRealText(profileBio, trimmed);
        profileBio.classList.remove("is-empty");
    } else {
        setRealText(profileBio, "Aucune bio pour l'instant.");
        profileBio.classList.add("is-empty");
    }
    markLoaded(profileBio);
}

function renderUsername(usernameDisplay) {
    if (!profileUsername) return;
    if (usernameDisplay) {
        setRealText(profileUsername, `@${usernameDisplay}`);
        profileUsername.classList.remove("is-empty");
    } else {
        setRealText(profileUsername, "");
        profileUsername.classList.add("is-empty");
    }
    markLoaded(profileUsername);
}

function renderPublicUrl(usernameDisplay) {
    if (!publicUrlValue) return;
    if (usernameDisplay) {
        const url = `perspikative.com/@${usernameDisplay}`;
        publicUrlValue.textContent = url;
        if (btnViewPublicProfile) {
            btnViewPublicProfile.href = `/@${usernameDisplay}`;
            btnViewPublicProfile.classList.remove("is-disabled");
        }
    } else {
        publicUrlValue.textContent = "Choisis d'abord un nom d'utilisateur";
        if (btnViewPublicProfile) {
            btnViewPublicProfile.removeAttribute("href");
            btnViewPublicProfile.classList.add("is-disabled");
        }
    }
}

function setVisibilityUI(isPublic) {
    if (!visibilityForm) return;
    const radios = visibilityForm.querySelectorAll('input[name="visibility"]');
    radios.forEach((radio) => {
        radio.checked = (radio.value === "public") === isPublic;
    });
}

// -----------------------------------------------------------------------
// Auth state : chargement du profil
// -----------------------------------------------------------------------
onAuthStateChanged(auth, async (user) => {

    if (!user) {
        window.location.href = "/login";
        return;
    }

    currentUser = user;

    // Tout ce qui vient de Firebase Auth est déjà disponible localement
    // (pas de round-trip réseau) : on l'affiche immédiatement, avant même
    // de lancer les lectures Firestore ci-dessous. Chaque élément est
    // vérifié avant écriture : onAuthStateChanged peut se déclencher avant
    // que tous les éléments du DOM soient garantis disponibles selon le
    // navigateur/l'ordre de chargement, et un accès direct sur un élément
    // absent plantait tout le reste du callback (bug déjà rencontré).
    setRealText(displayName, user.displayName || "Utilisateur");
    markLoaded(displayName);
    if (email)        email.textContent = user.email || "";
    setRealText(accountEmail, user.email || "—");
    markLoaded(accountEmail);
    setRealText(accountId, user.uid);
    markLoaded(accountId);

    // Les deux lectures Firestore ci-dessous (publicProfiles et users) sont
    // indépendantes l'une de l'autre : on les lance en parallèle avec
    // Promise.all plutôt qu'en série avec deux await successifs. Ça réduit
    // le temps d'attente total à celui de la plus lente des deux requêtes,
    // au lieu de la somme des deux.
    const { db, fns } = getFire();

    const publicProfilePromise = (db && fns)
        ? fns.getDoc(fns.doc(db, "publicProfiles", user.uid)).catch((err) => {
            console.error("Erreur de chargement du profil public :", err);
            return null;
        })
        : Promise.resolve(null);

    const userDocPromise = fetchUserDoc(user.uid).catch((err) => {
        console.error("Erreur de chargement du profil Firestore :", err);
        return null;
    });

    const [publicSnap, userDoc] = await Promise.all([publicProfilePromise, userDocPromise]);

    // Photo de profil : lue depuis publicProfiles/{uid}.photoURL (Firestore),
    // seule source de vérité pour la photo dans tout le projet (voir aussi
    // public-profile.js). On n'écrit jamais l'avatar par défaut ici si le
    // champ est déjà absent/vide : ça laisse la porte ouverte à une photo
    // personnalisée posée à la main dans Firestore (cas du compte admin),
    // sans qu'un simple chargement de page vienne l'écraser.
    const storedPhoto = publicSnap && publicSnap.exists() ? publicSnap.data().photoURL : null;
    const currentPhoto = storedPhoto || DEFAULT_AVATAR;
    if (profilePic) {
        profilePic.src = currentPhoto;
        profilePic.classList.add("is-loaded");
    }
    selectedAvatar = currentPhoto;

    // Date d'inscription : on se base sur Firestore si un doc existe déjà,
    // sinon sur la date de création du compte Firebase Auth (metadata),
    // et on la sauvegarde dans Firestore pour qu'elle reste stable.
    let bio = "";
    let createdAt = null;
    let usernameDisplay = null;
    let isPublic = false;

    try {
        if (userDoc && userDoc.bio !== undefined) {
            bio = userDoc.bio;
        }

        if (userDoc && userDoc.username) {
            currentUsername = userDoc.username;
            usernameDisplay = userDoc.usernameDisplay || userDoc.username;
            currentUsernameDisplay = usernameDisplay;

            // Rattrapage : les comptes créés avant l'ajout du username à
            // publicProfiles n'ont jamais synchronisé ce champ côté public.
            // On le fait une fois ici, silencieusement, pour que les
            // commentaires existants pointent vers /@{username}.
            syncPublicProfile(user.uid, {
                username: currentUsername,
                usernameDisplay
            }).catch(function (err) {
                console.error("Erreur de synchro username publicProfiles :", err);
            });
        }

        if (userDoc && typeof userDoc.isPublic === "boolean") {
            isPublic = userDoc.isPublic;
        }

        if (userDoc && userDoc.createdAt && userDoc.createdAt.toDate) {
            createdAt = userDoc.createdAt.toDate();
        } else {
            // Pas encore de date stockée : on la fixe une bonne fois pour toutes
            createdAt = user.metadata && user.metadata.creationTime
                ? new Date(user.metadata.creationTime)
                : new Date();

            if (fns) {
                await saveUserDoc(user.uid, {
                    createdAt: fns.serverTimestamp()
                });
            }
        }
    } catch (err) {
        console.error("Erreur de traitement du profil Firestore :", err);
        createdAt = user.metadata && user.metadata.creationTime
            ? new Date(user.metadata.creationTime)
            : new Date();
    }

    renderBio(bio);
    renderUsername(currentUsername);
    renderPublicUrl(currentUsername);
    setVisibilityUI(isPublic);
    if (profileSince) profileSince.textContent = formatSince(createdAt);
});

// -----------------------------------------------------------------------
// Modale d'édition
// -----------------------------------------------------------------------
function openEditModal() {
    if (!currentUser) return;

    // "Nom affiché" (editNameInput) pilote usernameDisplay dans Firestore —
    // totalement indépendant du "Nom d'utilisateur" (editUsernameInput, le
    // @). On pré-remplit donc avec currentUsernameDisplay, pas avec le
    // displayName Firebase Auth.
    editNameInput.value = currentUsernameDisplay || currentUser.displayName || "";
    editUsernameInput.value = currentUsername || "";
    editUsernameStatus.textContent = "";
    editUsernameStatus.classList.remove("is-error", "is-ok");
    editBioInput.value = profileBio.classList.contains("is-empty") ? "" : getRealText(profileBio);
    bioCharCount.textContent = String(editBioInput.value.length);
    editStatus.textContent = "";
    editStatus.classList.remove("is-error");

    editOverlay.classList.add("active");
    document.body.classList.add("menu-open");
}

function closeEditModal() {
    editOverlay.classList.remove("active");
    document.body.classList.remove("menu-open");
}

btnEditProfile.addEventListener("click", openEditModal);
editClose.addEventListener("click", closeEditModal);
editCancelBtn.addEventListener("click", closeEditModal);

editOverlay.addEventListener("click", (e) => {
    if (e.target === editOverlay) closeEditModal();
});

editBioInput.addEventListener("input", () => {
    bioCharCount.textContent = String(editBioInput.value.length);
});

// -----------------------------------------------------------------------
// Vérification live du username pendant la saisie (debounce simple)
// -----------------------------------------------------------------------
let usernameDebounceTimer = null;

if (editUsernameInput) {
    editUsernameInput.addEventListener("input", () => {
        const raw = editUsernameInput.value;
        const normalized = normalizeUsername(raw);

        clearTimeout(usernameDebounceTimer);

        const formatError = validateUsernameFormat(normalized);
        if (formatError) {
            editUsernameStatus.textContent = formatError;
            editUsernameStatus.classList.add("is-error");
            editUsernameStatus.classList.remove("is-ok");
            return;
        }

        if (normalized === currentUsername) {
            editUsernameStatus.textContent = "C'est déjà ton nom d'utilisateur actuel.";
            editUsernameStatus.classList.remove("is-error");
            editUsernameStatus.classList.add("is-ok");
            return;
        }

        editUsernameStatus.textContent = "Vérification…";
        editUsernameStatus.classList.remove("is-error", "is-ok");

        const token = ++usernameCheckToken;
        usernameDebounceTimer = setTimeout(async () => {
            try {
                const taken = await isUsernameTaken(normalized, currentUser ? currentUser.uid : null);
                if (token !== usernameCheckToken) return; // réponse obsolète

                if (taken) {
                    editUsernameStatus.textContent = "Ce nom d'utilisateur est déjà pris.";
                    editUsernameStatus.classList.add("is-error");
                    editUsernameStatus.classList.remove("is-ok");
                } else {
                    editUsernameStatus.textContent = "Disponible ✓";
                    editUsernameStatus.classList.add("is-ok");
                    editUsernameStatus.classList.remove("is-error");
                }
            } catch (err) {
                console.error("Erreur de vérification du username :", err);
                if (token !== usernameCheckToken) return;
                editUsernameStatus.textContent = "Impossible de vérifier pour l'instant.";
                editUsernameStatus.classList.add("is-error");
            }
        }, 450);
    });
}

editSaveBtn.addEventListener("click", async () => {
    if (!currentUser) return;

    const newName = editNameInput.value.trim(); // "Nom affiché" -> usernameDisplay
    const newBio = editBioInput.value.trim();
    const rawUsername = editUsernameInput ? editUsernameInput.value : ""; // "Nom d'utilisateur" -> username (le @)
    const normalizedUsername = normalizeUsername(rawUsername);

    if (!newName) {
        editStatus.textContent = "Le nom ne peut pas être vide.";
        editStatus.classList.add("is-error");
        return;
    }

    const formatError = validateUsernameFormat(normalizedUsername);
    if (formatError) {
        editStatus.textContent = formatError;
        editStatus.classList.add("is-error");
        return;
    }

    editSaveBtn.disabled = true;
    editStatus.classList.remove("is-error");
    editStatus.textContent = "Enregistrement…";

    try {
        // Les deux champs sont désormais totalement indépendants :
        // - "Nom affiché" (newName)        -> usernameDisplay
        // - "Nom d'utilisateur" (rawUsername) -> username (le @, normalisé)
        var usernameChanged = normalizedUsername !== currentUsername;
        var displayChanged  = newName !== (currentUsernameDisplay || "");

        // Réservation atomique du username (si changé). C'est cette étape,
        // et non une simple vérification préalable, qui garantit qu'on ne
        // peut jamais voler un pseudo pris entre-temps par quelqu'un d'autre.
        // Le usernameDisplay qu'on lui passe est celui du champ "Nom
        // affiché" (newName), pas la casse du champ username : le username
        // n'a pas de "casse d'affichage" propre, seul son @ existe.
        if (usernameChanged) {
            try {
                await saveUsername(
                    currentUser.uid,
                    currentUsername,
                    normalizedUsername,
                    newName
                );
            } catch (err) {
                if (err.message === "USERNAME_TAKEN") {
                    editStatus.textContent = "Ce nom d'utilisateur vient d'être pris, choisis-en un autre.";
                    editStatus.classList.add("is-error");
                    editSaveBtn.disabled = false;
                    return;
                }
                throw err;
            }
        } else if (displayChanged) {
            // Le username n'a pas changé, mais le "Nom affiché" oui.
            // saveUsername() n'est pas appelé dans ce cas (rien à
            // réserver/libérer côté usernames/{username}), donc on met
            // juste à jour usernameDisplay sur users/{uid} nous-mêmes.
            await saveUserDoc(currentUser.uid, { usernameDisplay: newName });
        }

        // Mise à jour du profil Firebase Auth (le displayName Firebase Auth
        // suit lui aussi "Nom affiché", pour rester cohérent avec Google/les
        // autres surfaces qui lisent auth.currentUser.displayName).
        await updateProfile(currentUser, {
            displayName: newName
        });

        // Mise à jour Firestore (bio uniquement ici : usernameDisplay et
        // username ont déjà été écrits sur users/{uid} ci-dessus).
        await saveUserDoc(currentUser.uid, { bio: newBio });

        // Profil public minimal (username + usernameDisplay + photoURL
        // uniquement, JAMAIS displayName). C'est ce document, toujours
        // lisible même si le profil complet (users/{uid}) est privé, qui
        // fait foi partout où l'uid apparaît publiquement (commentaires,
        // page /@username). On le repropage à CHAQUE sauvegarde du profil
        // (pas seulement si quelque chose a changé), pour rattraper au
        // passage tout désync éventuel avec users/{uid} et usernames/{...}.
        await syncPublicProfile(currentUser.uid, {
            username: normalizedUsername,
            usernameDisplay: newName
        });

        // Rafraîchissement de l'affichage
        setRealText(displayName, newName);
        renderBio(newBio);
        currentUsername = normalizedUsername;
        currentUsernameDisplay = newName;
        renderUsername(rawUsername.trim());
        renderPublicUrl(rawUsername.trim());

        editStatus.textContent = "Profil mis à jour ✓";
        setTimeout(closeEditModal, 700);
    } catch (err) {
        console.error("Erreur lors de l'enregistrement du profil :", err);
        editStatus.textContent = "Une erreur est survenue, réessaie.";
        editStatus.classList.add("is-error");
    } finally {
        editSaveBtn.disabled = false;
    }
});

// -----------------------------------------------------------------------
// Onglet Confidentialité : Public / Privé
// -----------------------------------------------------------------------
if (visibilityForm) {
    visibilityForm.addEventListener("change", async (e) => {
        const radio = e.target;
        if (!radio || radio.name !== "visibility") return;
        if (!currentUser) return;

        const wantsPublic = radio.value === "public";

        if (wantsPublic && !currentUsername) {
            visibilityStatus.textContent = "Choisis d'abord un nom d'utilisateur dans l'onglet Compte avant de passer en public.";
            visibilityStatus.classList.add("is-error");
            // On annule visuellement la sélection
            setVisibilityUI(false);
            return;
        }

        visibilityStatus.classList.remove("is-error");
        visibilityStatus.textContent = "Enregistrement…";

        try {
            await saveUserDoc(currentUser.uid, { isPublic: wantsPublic });
            visibilityStatus.textContent = wantsPublic
                ? "Ton profil est maintenant public ✓"
                : "Ton profil est maintenant privé ✓";
            setTimeout(() => { visibilityStatus.textContent = ""; }, 2500);
        } catch (err) {
            console.error("Erreur lors de la mise à jour de la visibilité :", err);
            visibilityStatus.textContent = "Une erreur est survenue, réessaie.";
            visibilityStatus.classList.add("is-error");
            setVisibilityUI(!wantsPublic);
        }
    });
}

// -----------------------------------------------------------------------
// Lightbox photo de profil (coverflow 3D — boucle infinie)
//
// Principe : on construit AVATAR_COUNT boutons <button class="avatar-
// coverflow-item"> positionnés en absolu au centre de la piste. Chaque
// avatar a une position "monde" continue (itemWorldPos[i]), c'est-à-dire
// son propre cran sur un axe non borné (ex: -1, 0, 1, 2...). Contrairement
// à un calcul de "distance la plus courte" refait à chaque frame (qui ferait
// sauter un avatar d'un bord à l'autre en pleine anim), la position monde
// n'est recalée de ±AVATAR_COUNT QUE quand l'avatar est actuellement caché
// (hors champ visible) — jamais pendant qu'on le voit se déplacer. C'est ce
// qui rend la boucle infinie fluide et "propre" visuellement.
//
// Le bouton Enregistrer ne s'active que si l'avatar centré diffère de celui
// déjà sauvegardé.
// -----------------------------------------------------------------------
let coverflowItems = [];      // éléments <button> du carousel, dans l'ordre 1..AVATAR_COUNT
let itemWorldPos = [];        // position monde actuelle de chaque item (même longueur que coverflowItems)
let coverflowIndex = 0;       // position actuelle du centre (NON bornée : peut être négative ou > AVATAR_COUNT)
let savedAvatarIndex = 0;     // index réel (0..AVATAR_COUNT-1) de l'avatar enregistré
let coverflowBuilt = false;
let isNavigating = false;     // anti double-déclenchement (ex: double-clic, event dupliqué)

// Modulo toujours positif (contrairement à % en JS qui peut être négatif)
function mod(n, m) {
    return ((n % m) + m) % m;
}

function avatarIndexFromPath(path) {
    // Le photoURL stocké peut être une URL absolue (Firebase) ou relative ;
    // on compare juste sur le nom de fichier pour rester robuste.
    for (let i = 0; i < AVATAR_COUNT; i++) {
        if (path && path.endsWith(`/${i + 1}.webp`)) return i;
    }
    return 0; // avatar 1 par défaut si non reconnu
}

function buildCoverflow() {
    if (coverflowBuilt) return;
    avatarCoverflowTrack.innerHTML = "";
    coverflowItems = [];

    for (let i = 0; i < AVATAR_COUNT; i++) {
        const path = AVATAR_PATH(i + 1);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "avatar-coverflow-item";
        btn.dataset.index = String(i);
        btn.setAttribute("aria-label", `Choisir l'avatar ${i + 1}`);

        const img = document.createElement("img");
        img.src = path;
        img.alt = `Avatar ${i + 1}`;
        img.loading = "lazy";
        btn.appendChild(img);

        const check = document.createElement("span");
        check.className = "avatar-coverflow-check";
        check.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#06231d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        btn.appendChild(check);

        btn.addEventListener("click", () => {
            // Un clic sur un avatar satellite le recentre en utilisant SA
            // position monde actuelle (pas un recalcul de plus court chemin),
            // pour rester cohérent avec ce qui est affiché à l'écran.
            goToCoverflowIndex(itemWorldPos[i]);
        });

        avatarCoverflowTrack.appendChild(btn);
        coverflowItems.push(btn);
    }

    // Position monde initiale : simplement l'index naturel de chaque avatar
    itemWorldPos = coverflowItems.map((_, i) => i);

    coverflowBuilt = true;
}

// Calcule et applique le transform de chaque avatar selon sa position monde
// persistante. Uniquement translateX + scale : pas de rotation 3D, pour que
// chaque avatar reste un cercle parfait, jamais écrasé en ellipse — juste
// plus petit et plus transparent en s'éloignant du centre.
function positionCoverflow() {
    const isMobile = window.innerWidth <= 700;
    const spacing = isMobile ? 92 : 150;      // écart horizontal entre avatars
    const scaleStep = isMobile ? 0.16 : 0.14; // réduction de taille par cran
    const maxVisible = isMobile ? 2 : 3;      // nb de crans visibles de chaque côté

    coverflowItems.forEach((item, i) => {
        // Avant de positionner, on recale la position monde de ±AVATAR_COUNT
        // si besoin — mais UNIQUEMENT si l'item est actuellement hors du
        // champ visible (distance > maxVisible + 1 marge de sécurité), donc
        // jamais pendant qu'on le voit à l'écran : aucun saut visuel.
        while (itemWorldPos[i] - coverflowIndex > AVATAR_COUNT / 2) {
            if (Math.abs(itemWorldPos[i] - AVATAR_COUNT - coverflowIndex) < Math.abs(itemWorldPos[i] - coverflowIndex)) {
                itemWorldPos[i] -= AVATAR_COUNT;
            } else {
                break;
            }
        }
        while (coverflowIndex - itemWorldPos[i] > AVATAR_COUNT / 2) {
            if (Math.abs(itemWorldPos[i] + AVATAR_COUNT - coverflowIndex) < Math.abs(itemWorldPos[i] - coverflowIndex)) {
                itemWorldPos[i] += AVATAR_COUNT;
            } else {
                break;
            }
        }

        const distance = itemWorldPos[i] - coverflowIndex;
        const abs = Math.abs(distance);

        item.classList.toggle("is-active", distance === 0);

        if (abs > maxVisible) {
            item.style.opacity = "0";
            item.style.pointerEvents = "none";
            item.style.zIndex = "0";
            item.style.transform = `translate(-50%, -50%) translateX(${distance * spacing}px) scale(0.4)`;
            return;
        }

        const scale = 1 - abs * scaleStep;
        const translateX = distance * spacing;
        const opacity = 1 - abs * 0.28;

        item.style.opacity = String(Math.max(opacity, 0.15));
        item.style.pointerEvents = "auto";
        item.style.zIndex = String(100 - abs);
        item.style.transform =
            `translate(-50%, -50%) translateX(${translateX}px) scale(${scale})`;
    });

    // Le bouton Enregistrer ne s'active que si l'avatar réel actuellement
    // centré diffère de l'avatar réellement enregistré sur le compte.
    const activeReal = mod(coverflowIndex, AVATAR_COUNT);
    const hasChanged = activeReal !== savedAvatarIndex;
    avatarLightboxSave.disabled = !hasChanged;
}

function goToCoverflowIndex(index) {
    // Anti double-déclenchement : un clic sur une flèche pendant que la
    // transition précédente joue encore ne doit pas faire avancer de 2 crans
    // d'un coup. On laisse la transition CSS (0.45s) se terminer avant
    // d'accepter la prochaine navigation.
    if (isNavigating) return;

    coverflowIndex = index;
    positionCoverflow();

    isNavigating = true;
    setTimeout(() => { isNavigating = false; }, 460);
}

// -----------------------------------------------------------------------
// Ouverture / fermeture animées : la photo de la carte profil "s'envole"
// vers le centre en s'agrandissant (on masque juste la vraie <img> pendant
// que la lightbox affiche son propre carousel), puis revient à sa place à
// la fermeture. Le rendu de vol utilise une image clonée animée en CSS
// pour un rendu fluide indépendant du reste de la mise en page.
// -----------------------------------------------------------------------
let flyingAvatarEl = null;

function flyAvatarToCenter() {
    const rect = profilePic.getBoundingClientRect();
    const clone = profilePic.cloneNode(true);
    clone.removeAttribute("id");
    clone.style.position = "fixed";
    clone.style.top = `${rect.top}px`;
    clone.style.left = `${rect.left}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.margin = "0";
    clone.style.borderRadius = "50%";
    clone.style.zIndex = "10021";
    clone.style.transition = "all 0.45s cubic-bezier(0.22, 1, 0.36, 1)";
    clone.style.pointerEvents = "none";
    clone.style.boxShadow = "0 18px 46px rgba(0,0,0,0.4)";
    document.body.appendChild(clone);
    flyingAvatarEl = clone;

    const targetSize = window.innerWidth <= 700 ? 130 : 190;
    // On vise le centre réel de la piste du coverflow, pas le centre de la
    // fenêtre : la lightbox est centrée verticalement en flexbox avec le
    // bouton "Enregistrer" en dessous, donc la piste (et les pdp) sont
    // décalées plus haut que le milieu exact de l'écran.
    const trackRect = avatarCoverflowTrack.getBoundingClientRect();
    const targetCenterX = trackRect.left + trackRect.width / 2;
    const targetCenterY = trackRect.top + trackRect.height / 2;

    // Force un reflow avant d'appliquer l'état final pour garantir la transition
    void clone.offsetWidth;

    requestAnimationFrame(() => {
        clone.style.top = `${targetCenterY - targetSize / 2}px`;
        clone.style.left = `${targetCenterX - targetSize / 2}px`;
        clone.style.width = `${targetSize}px`;
        clone.style.height = `${targetSize}px`;
    });

    setTimeout(() => {
        if (clone.parentNode) clone.parentNode.removeChild(clone);
        flyingAvatarEl = null;
    }, 480);
}

function flyAvatarBackToCard() {
    const rect = profilePic.getBoundingClientRect();
    const clone = profilePic.cloneNode(true);
    // On part de la position centrale (taille lightbox) vers l'emplacement réel
    const startSize = window.innerWidth <= 700 ? 130 : 190;
    // Même logique que flyAvatarToCenter : le point de départ doit être le
    // centre réel de la piste du coverflow, pas le centre de la fenêtre.
    const trackRect = avatarCoverflowTrack.getBoundingClientRect();
    const startCenterX = trackRect.left + trackRect.width / 2;
    const startCenterY = trackRect.top + trackRect.height / 2;

    clone.removeAttribute("id");
    clone.style.position = "fixed";
    clone.style.top = `${startCenterY - startSize / 2}px`;
    clone.style.left = `${startCenterX - startSize / 2}px`;
    clone.style.width = `${startSize}px`;
    clone.style.height = `${startSize}px`;
    clone.style.margin = "0";
    clone.style.borderRadius = "50%";
    clone.style.zIndex = "10021";
    clone.style.transition = "all 0.45s cubic-bezier(0.22, 1, 0.36, 1)";
    clone.style.pointerEvents = "none";
    clone.style.boxShadow = "0 18px 46px rgba(0,0,0,0.4)";
    document.body.appendChild(clone);

    void clone.offsetWidth;

    requestAnimationFrame(() => {
        clone.style.top = `${rect.top}px`;
        clone.style.left = `${rect.left}px`;
        clone.style.width = `${rect.width}px`;
        clone.style.height = `${rect.height}px`;
    });

    setTimeout(() => {
        if (clone.parentNode) clone.parentNode.removeChild(clone);
        profilePicWrapper.classList.remove("is-lightbox-active");
    }, 480);
}

function openAvatarLightbox() {
    if (!currentUser) return;

    buildCoverflow();

    // selectedAvatar reflète la photo Firestore (publicProfiles/{uid}), la
    // même source que celle affichée sur la carte profil — on ne relit
    // plus currentUser.photoURL (Auth) ici, pour rester cohérent.
    const currentPhoto = selectedAvatar || DEFAULT_AVATAR;
    savedAvatarIndex = avatarIndexFromPath(currentPhoto);
    coverflowIndex = savedAvatarIndex;

    // Repart d'une position monde "propre" à chaque ouverture (chaque avatar
    // à son cran naturel), pour éviter d'accumuler des décalages d'une
    // session de la lightbox à l'autre.
    itemWorldPos = coverflowItems.map((_, i) => i);

    positionCoverflow();

    profilePicWrapper.classList.add("is-lightbox-active");
    flyAvatarToCenter();

    avatarLightbox.classList.add("active");
    avatarLightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("menu-open");

    document.addEventListener("keydown", handleAvatarLightboxKeydown);
}

function closeAvatarLightbox() {
    avatarLightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("menu-open");
    document.removeEventListener("keydown", handleAvatarLightboxKeydown);

    flyAvatarBackToCard();

    // Le fond (backdrop + carousel) s'estompe pendant que l'avatar cloné vole
    // vers son emplacement réel, pour ne pas "couper" la photo en plein vol.
    avatarLightbox.classList.remove("active");
}

function handleAvatarLightboxKeydown(e) {
    if (e.key === "Escape") {
        closeAvatarLightbox();
    } else if (e.key === "ArrowLeft") {
        goToCoverflowIndex(coverflowIndex - 1);
    } else if (e.key === "ArrowRight") {
        goToCoverflowIndex(coverflowIndex + 1);
    }
}

if (btnOpenAvatarLightbox) {
    btnOpenAvatarLightbox.addEventListener("click", openAvatarLightbox);
}

if (avatarLightboxClose) {
    avatarLightboxClose.addEventListener("click", closeAvatarLightbox);
}

if (avatarArrowLeft) {
    avatarArrowLeft.addEventListener("click", () => goToCoverflowIndex(coverflowIndex - 1));
}

if (avatarArrowRight) {
    avatarArrowRight.addEventListener("click", () => goToCoverflowIndex(coverflowIndex + 1));
}

// Clic sur le fond (en dehors du carousel et du bouton) : ferme, comme les
// autres overlays du site (édition, report...).
if (avatarLightbox) {
    avatarLightbox.addEventListener("click", (e) => {
        if (e.target === avatarLightbox || e.target.classList.contains("avatar-lightbox-backdrop")) {
            closeAvatarLightbox();
        }
    });
}

// Navigation tactile (swipe) : indispensable sur mobile où les flèches sont
// masquées (cf. CSS), mais activée aussi sur desktop par confort.
(function setupCoverflowSwipe() {
    if (!avatarCoverflowTrack) return;
    let startX = 0;
    let startY = 0;
    let dragging = false;

    avatarCoverflowTrack.addEventListener("touchstart", (e) => {
        if (!e.touches || !e.touches[0]) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        dragging = true;
    }, { passive: true });

    avatarCoverflowTrack.addEventListener("touchend", (e) => {
        if (!dragging) return;
        dragging = false;
        const endTouch = e.changedTouches && e.changedTouches[0];
        if (!endTouch) return;

        const dx = endTouch.clientX - startX;
        const dy = endTouch.clientY - startY;

        // Ignore les swipes trop verticaux (l'utilisateur scrolle probablement)
        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;

        if (dx < 0) {
            goToCoverflowIndex(coverflowIndex + 1);
        } else {
            goToCoverflowIndex(coverflowIndex - 1);
        }
    }, { passive: true });
})();

// Recalcule les positions si la fenêtre change de taille (mobile <-> desktop)
window.addEventListener("resize", () => {
    if (avatarLightbox && avatarLightbox.classList.contains("active")) {
        positionCoverflow();
    }
});

avatarLightboxSave.addEventListener("click", async () => {
    if (!currentUser) return;

    const activeReal = mod(coverflowIndex, AVATAR_COUNT);
    if (activeReal === savedAvatarIndex) return;

    const newPhoto = AVATAR_PATH(activeReal + 1);

    avatarLightboxSave.disabled = true;
    avatarLightboxSave.classList.add("is-saving");
    const originalLabel = avatarLightboxSave.textContent;
    avatarLightboxSave.textContent = "Enregistrement…";

    try {
        await updateProfile(currentUser, { photoURL: newPhoto });

        // Profil public minimal (pour que les commentaires existants de cet
        // utilisateur affichent la nouvelle photo, même si son profil est privé).
        await syncPublicProfile(currentUser.uid, { photoURL: newPhoto });

        // Rafraîchissement de l'affichage : la photo de la carte profil (et
        // toute autre référence locale) reflète immédiatement le nouvel avatar.
        profilePic.src = newPhoto;
        selectedAvatar = newPhoto;
        savedAvatarIndex = activeReal;

        closeAvatarLightbox();
    } catch (err) {
        console.error("Erreur lors de l'enregistrement de la photo de profil :", err);
        alert("Une erreur est survenue, réessaie.");
        avatarLightboxSave.disabled = false;
    } finally {
        avatarLightboxSave.classList.remove("is-saving");
        avatarLightboxSave.textContent = originalLabel;
    }
});

// -----------------------------------------------------------------------
// Déconnexion
// -----------------------------------------------------------------------
btnLogout.addEventListener("click", async () => {
    btnLogout.disabled = true;
    try {
        await signOut(auth);
        window.location.href = "/";
    } catch (err) {
        console.error("Erreur lors de la déconnexion :", err);
        btnLogout.disabled = false;
    }
});

// -----------------------------------------------------------------------
// Suppression du compte
// -----------------------------------------------------------------------
btnDeleteAccount.addEventListener("click", async () => {
    if (!currentUser) return;

    const confirmed = window.confirm(
        "Es-tu sûr de vouloir supprimer définitivement ton compte Perspikative ? Cette action est irréversible."
    );
    if (!confirmed) return;

    btnDeleteAccount.disabled = true;

    try {
        // Nettoyage des données Firestore associées avant suppression du
        // compte Auth. Les trois suppressions doivent réussir : si l'une
        // échoue (règle Firestore, coupure réseau...), on bloque la
        // suppression du compte Auth plutôt que de laisser des restes
        // orphelins dans Firestore.
        const { db, fns } = getFire();
        if (db && fns) {
            // Libère le @ (usernames/{username}) s'il existait, pour qu'il
            // redevienne disponible pour quelqu'un d'autre.
            if (currentUsername) {
                await fns.deleteDoc(fns.doc(db, "usernames", currentUsername));
            }

            // Supprime le profil public minimal (username, usernameDisplay,
            // photoURL) — plus rien de visible publiquement pour cet uid.
            await fns.deleteDoc(fns.doc(db, "publicProfiles", currentUser.uid));

            // Supprime le profil complet (bio, isPublic, etc.).
            await fns.deleteDoc(fns.doc(db, "users", currentUser.uid));
        }

        await deleteUser(currentUser);
        window.location.href = "/";
    } catch (err) {
        console.error("Erreur lors de la suppression du compte :", err);

        if (err.code === "auth/requires-recent-login") {
            alert("Pour supprimer ton compte, reconnecte-toi d'abord (dernière connexion trop ancienne), puis réessaie.");
        } else {
            alert("Une erreur est survenue, réessaie plus tard.");
        }
    } finally {
        btnDeleteAccount.disabled = false;
    }
});
