import { Router } from 'express';
import { dbDriver, cleanObjectForFirestore } from '../db/driver';
import { syncTransactionSubcollections } from '../services/transaction-sync.service';

const router = Router();

// Atomic Finance Syncer Server-Side Wrapper
router.post('/sync', async (req, res) => {
  const { tx, operatorName, operatorRole, currentBalanceBeforeTx } = req.body;
  try {
    const isDeletedAction = tx.status === 'Rejected' || tx.deleted === true;
    const isIncome = (tx.type || 'Income').toLowerCase() === 'income';
    const delta = isDeletedAction ? 0 : (isIncome ? tx.amount : -tx.amount);
    const newBalance = isDeletedAction ? currentBalanceBeforeTx : (currentBalanceBeforeTx + delta);

    // Map and enrich the transaction payload to the requested simplified schema
    const enrichedTx = {
      // Requested simplified schema
      id: tx.id,
      transaction_code: tx.transaction_code || tx.id,
      type: isIncome ? 'Income' : 'Expense',
      source: tx.source || 'manual',
      category_id: tx.category_id || tx.category || 'Lain-lain',
      amount: Number(tx.amount),
      description: tx.description || '',
      transaction_date: tx.transaction_date || tx.date || new Date().toISOString().split('T')[0],
      created_by: tx.created_by || operatorName,
      reference_id: tx.reference_id || null,
      reference_type: tx.reference_type || null,
      created_at: tx.created_at || new Date().toISOString(),
      updated_at: tx.updated_at || new Date().toISOString(),
      deleted_at: isDeletedAction ? new Date().toISOString() : null,

      // Frontend backwards compatibility keys to prevent any viewer breakage
      date: tx.date || tx.transaction_date || new Date().toISOString().split('T')[0],
      category: tx.category || tx.category_id || 'Lain-lain',
      sourceOrRecipient: tx.sourceOrRecipient || tx.reference_id || operatorName,
      status: isDeletedAction ? 'Rejected' : 'Approved',
      deleted: isDeletedAction
    };

    // 1. Write the Transaction record (will map to financial_transactions under the hood)
    await dbDriver.setDoc('transactions', tx.id, cleanObjectForFirestore(enrichedTx));

    // Propagate write to specific sub-tables (incomes, expenses, detail_pengeluaran, fundraising, payroll_payments) as requested by user
    try {
      await syncTransactionSubcollections(enrichedTx, isDeletedAction, operatorRole, operatorName);
    } catch (subWriteErr) {
      console.warn('Propagation to sub-collections failed:', subWriteErr);
    }

    // 2. Set/update the 'kas' snapshot document (backward-suited total)
    await dbDriver.setDoc('kas', 'main', cleanObjectForFirestore({
      id: 'main',
      balance: newBalance,
      lastUpdated: new Date().toISOString(),
      updatedBy: operatorName
    }));

    // 3. Append detailed chronological trace log to the 'kas' collection as requested
    const kasId = `KAS-LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const kasLogRow = {
      id: kasId,
      transaction_id: tx.id,
      type: isIncome ? 'income' : 'expense',
      amount: Number(tx.amount),
      source: tx.source || 'manual',
      category: tx.category || tx.category_id || 'Lain-lain',
      description: tx.description || '',
      balanceBefore: currentBalanceBeforeTx,
      balanceAfter: newBalance,
      updatedBy: operatorName,
      timestamp: new Date().toISOString(),
      action: isDeletedAction ? 'DELETE' : (tx.isEdit ? 'EDIT' : 'CREATE')
    };
    await dbDriver.setDoc('kas', kasId, cleanObjectForFirestore(kasLogRow));

    // 4. Write real audit entry log
    const auditId = `AUD-FIN-${Date.now()}`;
    const actionText = isDeletedAction 
      ? `[Sistem Atomik Keuangan] Penghapusan Transaksi ${tx.id} (${tx.type}) senilai Rp ${tx.amount.toLocaleString('id-ID')} tersimpan. Sisa kas: Rp ${newBalance.toLocaleString('id-ID')}`
      : `[Sistem Atomik Keuangan] Entry Transaksi ${tx.id} (${tx.type}) senilai Rp ${tx.amount.toLocaleString('id-ID')} tersimpan. Sisa kas: Rp ${newBalance.toLocaleString('id-ID')}`;
    
    await dbDriver.setDoc('audits', auditId, cleanObjectForFirestore({
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

    res.json({ success: true, newBalance });
  } catch (error: any) {
    console.error('Error syncing finance data server API:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
