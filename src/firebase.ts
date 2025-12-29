import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Senin Proje Ayarların
const firebaseConfig = {
  apiKey: "AIzaSyDELbE1PwhowUDRzjro63slZgh9NUgp_xw",
  authDomain: "letterchatv1.firebaseapp.com",
  projectId: "letterchatv1",
  storageBucket: "letterchatv1.firebasestorage.app",
  messagingSenderId: "294068242272",
  appId: "1:294068242272:web:8d2e90b3a0f7b8a9b18005",
  measurementId: "G-Y8PRGJTGGX"
};

// Firebase uygulamasını başlat
const app = initializeApp(firebaseConfig);

// Kimlik Doğrulama (Auth) ve Veritabanı (DB) servislerini dışarı açıyoruz
// Uygulamanın geri kalanı bunları kullanacak.
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);