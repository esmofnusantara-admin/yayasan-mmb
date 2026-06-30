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
    if (!docId || typeof docId !== 'string') {
      console.warn(`[dbDriver.getDoc] Invalid or missing docId: "${docId}" in collection "${collectionName}"`);
      return null;
    }
    const mappedCollection = mapCollection(collectionName);
    const docRef = doc(db, mappedCollection, docId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() || null : null;
  },

  async setDoc(collectionName: string, docId: string, data: any): Promise<void> {
    if (!docId || typeof docId !== 'string') {
      console.error(`[dbDriver.setDoc] Invalid or missing docId: "${docId}" in collection "${collectionName}"`);
      return;
    }
    const mappedCollection = mapCollection(collectionName);
    const docRef = doc(db, mappedCollection, docId);
    await setDoc(docRef, data);
  },

  async updateDoc(collectionName: string, docId: string, data: any): Promise<void> {
    if (!docId || typeof docId !== 'string') {
      console.error(`[dbDriver.updateDoc] Invalid or missing docId: "${docId}" in collection "${collectionName}"`);
      return;
    }
    const mappedCollection = mapCollection(collectionName);
    const docRef = doc(db, mappedCollection, docId);
    await updateDoc(docRef, data);
  },

  async deleteDoc(collectionName: string, docId: string): Promise<void> {
    if (!docId || typeof docId !== 'string') {
      console.error(`[dbDriver.deleteDoc] Invalid or missing docId: "${docId}" in collection "${collectionName}"`);
      return;
    }
    const mappedCollection = mapCollection(collectionName);
    const docRef = doc(db, mappedCollection, docId);
    await deleteDoc(docRef);
  }
};
export default dbDriver;
