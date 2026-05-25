import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDuanwA4vvAvszCB4qr75d9XufMEq_KE68",
  authDomain: "stado-e7897.firebaseapp.com",
  projectId: "stado-e7897",
  storageBucket: "stado-e7897.firebasestorage.app",
  messagingSenderId: "419064605606",
  appId: "1:419064605606:web:2bc8402f6570e889d5fd67"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
