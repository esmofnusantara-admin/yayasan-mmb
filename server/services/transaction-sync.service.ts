import { dbDriver, cleanObjectForFirestore } from '../db/driver';

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
      return;
    }

    const isIncome = (tx.type || '').toLowerCase() === 'income';
    const txSource = (tx.source || '').toLowerCase();

    // Prepare payload
    const payload = {
      ...tx,
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
        category: payload.category || payload.category_id || 'Lain-lain',
        description: payload.description || '',
        recipient: payload.sourceOrRecipient || payload.reference_id || 'Internal',
        date: payload.date || payload.transaction_date || new Date().toISOString().split('T')[0],
        created_by: payload.created_by || payload.updatedBy || payload.createdBy || 'System',
        source: payload.source || 'manual',
        timestamp: payload.created_at || new Date().toISOString(),
        deleted: isDeleted,
        deletedAt: isDeleted ? new Date().toISOString() : null
      };
      await dbDriver.setDoc('detail_pengeluaran', txId, cleanObjectForFirestore(detailPayload));
      await dbDriver.setDoc('detail_expenses', txId, cleanObjectForFirestore(detailPayload));
    }

    // 2. Map to fundraising or payroll_payments if applicable
    if (txSource === 'donation') {
      await dbDriver.setDoc('fundraising', txId, cleaned);
    } else if (txSource === 'payroll') {
      await dbDriver.setDoc('payroll_payments', txId, cleaned);
    }
  } catch (err) {
    console.warn(`[syncTransactionSubcollections] Failed for ${tx.id || 'unknown'}:`, err);
  }
}
