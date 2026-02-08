// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC7R0y_hS7lXHkwh70ebrvRtOCi5QsN72A",
  authDomain: "ijarpro-4d396.firebaseapp.com",
  projectId: "ijarpro-4d396",
  storageBucket: "ijarpro-4d396.firebasestorage.app",
  messagingSenderId: "660644665174",
  appId: "1:660644665174:web:121d6859371057cb8368f7",
  measurementId: "G-C271WKK2MZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);


