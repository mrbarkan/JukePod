// The one Firebase app instance, shared by the modules that sign in, read
// and write. Only loaded on demand.
import { initializeApp } from "firebase/app";
import { firebaseConfig } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);
