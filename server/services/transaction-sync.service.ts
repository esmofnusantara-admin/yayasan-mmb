import { dbDriver } from '../db/driver';

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

// System-wide automated trace propagation helper for transactions, incomes, expenses, detail_pengeluaran, fundraising, and payroll_payments
export async function syncTransactionSubcollections(tx: any, isDeleted = false, deleterRole = '', deleterName = '') {
  try {
    const txId = tx.id;
    if (!txId) return;

    if (isDeleted) {
      const subCols = ['incomes', 'expenses', 'detail_pengeluaran', 'detail_expenses', 'fundraising', 'payroll_payments'];
      for (const col of subCols) {
        try {
          await dbDriver.deleteDoc(col, txId);
        } catch (e) {}
      }

      // Cascade revert: if transaction references a donation, remove/mark donation as well
      if (tx.reference_type === 'donation' && tx.reference_id) {
        try {
          await dbDriver.deleteDoc('donations', tx.reference_id);
        } catch (e) {}
      }

      // Cascade revert: if transaction is activity allocation, recalculate activity wallet
      if (tx.reference_type === 'activity_allocation' && tx.reference_id) {
        try {
          const act = await dbDriver.getDoc('activities', tx.reference_id);
          if (act) {
            const allActTxs = (await dbDriver.getDocs('activity_transactions')).filter((at: any) => !at.deleted && at.activityId === tx.reference_id);
            const recomputedWallet = allActTxs.reduce((sum: number, t: any) => {
              const type = t.type as string;
              if (type === 'In' || type === 'Transfer_From_Main') return sum + Number(t.amount);
              if (type === 'Out' || type === 'Transfer_To_Main') return sum - Number(t.amount);
              return sum;
            }, 0);
            await dbDriver.updateDoc('activities', tx.reference_id, { budgetWalletBalance: recomputedWallet, updatedAt: new Date().toISOString() });
          }
        } catch (e) {}
      }

      return;
    }

    const isIncome = (tx.type || '').toLowerCase() === 'income';
    const rawCategory = tx.category || tx.category_id || 'Lain-lain';
    const isPayrollCategory = rawCategory === 'Penggajian Staff' || rawCategory === 'Payroll Staff & BPJS' || (tx.source || '').toLowerCase() === 'payroll';
    const isDonationSource = (tx.source || '').toLowerCase() === 'donation' || tx.reference_type === 'donation' || rawCategory === 'Donasi Kemitraan';

    const standardizedCategory = isPayrollCategory ? 'Penggajian Staff' : isDonationSource ? 'Donasi Kemitraan' : rawCategory;
    const resolvedSource = isDonationSource ? 'donation' : isPayrollCategory ? 'payroll' : (tx.source || 'manual');

    // Prepare payload
    const payload = {
      ...tx,
      category: standardizedCategory,
      category_id: standardizedCategory,
      source: resolvedSource,
      deleted: isDeleted,
      deletedAt: isDeleted ? new Date().toISOString() : null,
      deleted_at: isDeleted ? new Date().toISOString() : null,
      deletedBy: isDeleted ? (deleterRole || 'System') : null
    };

    const cleaned = cleanObjectForFirestore(payload);

    // 1. Map to incomes / expenses regardless of source, so we have exact copies
    if (isIncome) {
      await dbDriver.setDoc('incomes', txId, cleaned);
      // Clean up from expenses if it was edited from expense to income
      try {
        await dbDriver.deleteDoc('expenses', txId);
        await dbDriver.deleteDoc('detail_pengeluaran', txId);
        await dbDriver.deleteDoc('detail_expenses', txId);
      } catch (e) {}
    } else {
      await dbDriver.setDoc('expenses', txId, cleaned);
      // Clean up from incomes
      try {
        await dbDriver.deleteDoc('incomes', txId);
      } catch (e) {}

      // Write detail_pengeluaran & detail_expenses
      const detailPayload = {
        id: txId,
        transaction_id: txId,
        amount: Number(payload.amount || 0),
        category: standardizedCategory,
        description: payload.description || '',
        recipient: payload.sourceOrRecipient || payload.reference_id || 'Internal',
        date: payload.date || payload.transaction_date || new Date().toISOString().split('T')[0],
        created_by: payload.created_by || payload.updatedBy || payload.createdBy || 'System',
        source: resolvedSource,
        timestamp: payload.created_at || new Date().toISOString(),
        deleted: isDeleted,
        deletedAt: isDeleted ? new Date().toISOString() : null
      };
      await dbDriver.setDoc('detail_pengeluaran', txId, cleanObjectForFirestore(detailPayload));
      await dbDriver.setDoc('detail_expenses', txId, cleanObjectForFirestore(detailPayload));
    }

    // 2. Map to fundraising or payroll_payments if applicable
    if (resolvedSource === 'donation') {
      await dbDriver.setDoc('fundraising', txId, cleaned);
    } else if (resolvedSource === 'payroll') {
      await dbDriver.setDoc('payroll_payments', txId, cleaned);
    }
  } catch (err) {
    console.warn(`[syncTransactionSubcollections] Failed for ${tx.id || 'unknown'}:`, err);
  }
}
