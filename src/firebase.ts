// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAEyKPI90JsGIHKytTkqJshYr4E5rqXyeM",
  authDomain: "inexperience-653ac.firebaseapp.com",
  projectId: "inexperience-653ac",
  storageBucket: "inexperience-653ac.firebasestorage.app",
  messagingSenderId: "1058730293435",
  appId: "1:1058730293435:web:2a217a8d576f2dcf69519e",
  measurementId: "G-239ZH9W88Y"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app); // Banco de Dados (Firestore)
export const auth = getAuth(app); // Autenticação