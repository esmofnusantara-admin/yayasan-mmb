import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const mapCollection = (name: string) => name;

export const dbDriver = {
  async getDocs(collectionName: string): Promise<any[]> {
    const mappedCollection = mapCollection(collectionName);
    const colRef = collection(db, mappedCollection);
    const snap = await getDocs(colRef);
    const items: any[] = [];
    snap.forEach(d => {
      items.push(d.data());
    });
    return items;
  },

  async getDoc(collectionName: string, docId: string): Promise<any | null> {
    const mappedCollection = mapCollection(collectionName);
    const docRef = doc(db, mappedCollection, docId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() || null : null;
  },

  async setDoc(collectionName: string, docId: string, data: any): Promise<void> {
    const mappedCollection = mapCollection(collectionName);
    const docRef = doc(db, mappedCollection, docId);
    await setDoc(docRef, data);
  },

  async updateDoc(collectionName: string, docId: string, data: any): Promise<void> {
    const mappedCollection = mapCollection(collectionName);
    const docRef = doc(db, mappedCollection, docId);
    await updateDoc(docRef, data);
  },

  async deleteDoc(collectionName: string, docId: string): Promise<void> {
    const mappedCollection = mapCollection(collectionName);
    const docRef = doc(db, mappedCollection, docId);
    await deleteDoc(docRef);
  }
};

// Helper to sanitize payload for Firestore/JSON storage
export function cleanObjectForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanObjectForFirestore(item));
  }
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = cleanObjectForFirestore(val);
      }
    });
    return cleaned;
  }
  return obj;
}
