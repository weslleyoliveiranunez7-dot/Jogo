// ===================== Firebase (Fase 2b: contas + ranking) =====================
// Usamos os SDKs direto do CDN (versão modular), assim não precisa de build/npm
// pra rodar num GitHub Pages simples.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase, ref, get, set, update, query, orderByChild, limitToLast, increment, onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyD9qzSooEmAfbPIXO2jd98eF3E3ASX5ksY",
  authDomain: "meu-joguinho-a1f03.firebaseapp.com",
  databaseURL: "https://meu-joguinho-a1f03-default-rtdb.firebaseio.com",
  projectId: "meu-joguinho-a1f03",
  storageBucket: "meu-joguinho-a1f03.firebasestorage.app",
  messagingSenderId: "1082000190964",
  appId: "1:1082000190964:web:0443e4e32e807d7133dda1"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

export { db, auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, ref, get, set, update, query, orderByChild, limitToLast, increment, onDisconnect };
