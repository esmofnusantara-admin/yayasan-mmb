/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
        emailVerified: null
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function cleanObjectForFirestore<T>(obj: T): any {
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
      const val = (obj as any)[key];
      if (val !== undefined) {
        cleaned[key] = cleanObjectForFirestore(val);
      }
    });
    return cleaned;
  }
  return obj;
}

export async function syncFinanceData(
  tx: {
    id: string;
    date: string;
    category: string;
    description: string;
    amount: number;
    type: 'Income' | 'Expense';
    sourceOrRecipient: string;
    status: string;
    approvedBy?: string;
  },
  operatorName: string,
  operatorRole: string,
  currentBalanceBeforeTx: number
) {
  const isApproved = tx.status === 'Approved';
  const delta = isApproved ? (tx.type === 'Income' ? tx.amount : -tx.amount) : 0;
  const newBalance = currentBalanceBeforeTx + delta;

  // 1. Write the Transaction record
  await setDoc(doc(db, 'transactions', tx.id), cleanObjectForFirestore({
    ...tx,
    createdBy: operatorName,
    createdAt: new Date().toISOString(),
    deleted: false
  }));

  // 2. Set/update the 'kas' snapshot document
  await setDoc(doc(db, 'kas', 'main'), cleanObjectForFirestore({
    id: 'main',
    balance: newBalance,
    lastUpdated: new Date().toISOString(),
    updatedBy: operatorName
  }));

  // 3. Write a secure audit log trailing entry
  const auditId = `AUD-FIN-${Date.now()}`;
  const actionText = `[Sistem Atomik Keuangan] Entry Transaksi ${tx.id} (${tx.type}) senilai Rp ${tx.amount.toLocaleString('id-ID')} tersimpan (${tx.status}). Estimasi sisa saldo kas: Rp ${newBalance.toLocaleString('id-ID')}`;
  
  await setDoc(doc(db, 'audits', auditId), cleanObjectForFirestore({
    id: auditId,
    userName: operatorName,
    userRole: operatorRole,
    action: actionText,
    module: 'Keuangan & Jurnal',
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    beforeValue: `Rp ${currentBalanceBeforeTx.toLocaleString('id-ID')}`,
    afterValue: `Rp ${newBalance.toLocaleString('id-ID')}`,
    createdBy: operatorName,
    createdAt: new Date().toISOString(),
    deleted: false
  }));
}
