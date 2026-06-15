import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import path from 'path';
import fs from 'fs';

// Read Firebase config safely from JSON file
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));

// Initialize Firebase client SDK server-side (uses API Key, authorized by security rules)
export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
