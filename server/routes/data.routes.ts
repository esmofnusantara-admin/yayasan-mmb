import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { dbDriver } from '../db/driver';
import { authenticateToken, checkCollectionPermission } from './auth.routes';
import { cleanObjectForFirestore, syncTransactionSubcollections } from '../services/transaction-sync.service';
import { sendStaffTaskNotificationEmail } from '../services/mail.service';

const router = Router();

// GET collection elements
router.get('/:colName', authenticateToken, checkCollectionPermission, async (req: any, res: Response) => {
  const { colName } = req.params;
  const includeDeleted = req.query.includeDeleted === 'true';
  try {
    let dataItems = await dbDriver.getDocs(colName);

    if (colName === 'staff') {
      const role = req.user?.role;
      const features = req.user?.features || [];
      const hasReportsAccess = Array.isArray(features) && features.includes('reports');
      const hasStaffTasksAccess = Array.isArray(features) && features.includes('staff_tasks');
      const isPrivileged = role === 'Super Admin' || role === 'Ketua Yayasan' || role === 'Bendahara' || hasReportsAccess || hasStaffTasksAccess;

      if (!isPrivileged) {
        const userEmail = req.user?.email?.toLowerCase().trim();
        const userName = req.user?.name?.toLowerCase().trim();
        dataItems = dataItems.filter(item => {
          if (item.deleted) return false;
          const staffEmail = item.email?.toLowerCase().trim();
          const staffName = item.name?.toLowerCase().trim();
          const staffPhone = item.phone?.trim();
          return (staffEmail && staffEmail === userEmail) || 
                 (staffName && staffName === userName) ||
                 (staffPhone && (staffPhone === userEmail || userEmail?.startsWith(staffPhone)));
        });
      }
    }

    if (colName === 'salaries') {
      const role = req.user?.role;
      const features = req.user?.features || [];
      const hasReportsAccess = Array.isArray(features) && features.includes('reports');
      const isPrivileged = role === 'Super Admin' || role === 'Ketua Yayasan' || role === 'Bendahara' || hasReportsAccess;

      if (!isPrivileged) {
        const userEmail = req.user?.email?.toLowerCase().trim();
        const userName = req.user?.name?.toLowerCase().trim();
        
        // Find matching staff first to find the NIK (search both staff and pengurus, excluding deleted)
        const allStaffDocs = await dbDriver.getDocs('staff');
        const allPengurusDocs = await dbDriver.getDocs('pengurus');
        const activeStaff = [...allStaffDocs, ...allPengurusDocs].filter(item => !item.deleted);

        const matchedStaffs = activeStaff.filter(item => {
          const staffEmail = item.email?.toLowerCase().trim();
          const staffName = item.name?.toLowerCase().trim();
          const staffPhone = item.phone?.trim();
          return (staffEmail && staffEmail === userEmail) || 
                 (staffName && staffName === userName) ||
                 (staffPhone && (staffPhone === userEmail || userEmail?.startsWith(staffPhone)));
        });

        const matchedNiks = matchedStaffs.map(s => s.nik).filter(Boolean);

        if (matchedNiks.length > 0) {
          const matchedSalaries = dataItems.filter(item => matchedNiks.includes(item.id));
          if (matchedSalaries.length > 0) {
            dataItems = matchedSalaries;
          } else {
            // Synthesize default salary configuration from matchedStaffs properties
            const matchedStaff = matchedStaffs[0];
            const defaultComponents: any[] = [];
            if (matchedStaff.allowancePosition) defaultComponents.push({ id: 'allowancePosition', name: 'Tunjangan Jabatan', type: 'allowance', amount: Number(matchedStaff.allowancePosition) });
            if (matchedStaff.allowanceHousing) defaultComponents.push({ id: 'allowanceHousing', name: 'Tunjangan Perumahan', type: 'allowance', amount: Number(matchedStaff.allowanceHousing) });
            if (matchedStaff.allowanceTransport) defaultComponents.push({ id: 'allowanceTransport', name: 'Tunjangan Transport', type: 'allowance', amount: Number(matchedStaff.allowanceTransport) });
            if (matchedStaff.allowanceComm) defaultComponents.push({ id: 'allowanceComm', name: 'Tunjangan Komunikasi', type: 'allowance', amount: Number(matchedStaff.allowanceComm) });
            if (matchedStaff.bpjsAllowance) defaultComponents.push({ id: 'bpjsAllowance', name: 'Premi BPJS Allowance', type: 'allowance', amount: Number(matchedStaff.bpjsAllowance) });
            if (matchedStaff.bonus) defaultComponents.push({ id: 'bonus', name: 'Bonus / Insentif', type: 'allowance', amount: Number(matchedStaff.bonus) });
            if (matchedStaff.thr) defaultComponents.push({ id: 'thr', name: 'Tunjangan Hari Raya (THR)', type: 'allowance', amount: Number(matchedStaff.thr) });
            if (matchedStaff.taxDeduction) defaultComponents.push({ id: 'taxDeduction', name: 'Pajak PPH21 Bruto', type: 'deduction', amount: Number(matchedStaff.taxDeduction) });
            if (matchedStaff.bpjsDeduction) defaultComponents.push({ id: 'bpjsDeduction', name: 'Iuran BPJS Karyawan', type: 'deduction', amount: Number(matchedStaff.bpjsDeduction) });
            if (matchedStaff.kasbonDeduction) defaultComponents.push({ id: 'kasbonDeduction', name: 'Kasbon / Angsuran', type: 'deduction', amount: Number(matchedStaff.kasbonDeduction) });
            if (matchedStaff.otherDeduction) defaultComponents.push({ id: 'otherDeduction', name: 'Potongan Lain-lain', type: 'deduction', amount: Number(matchedStaff.otherDeduction) });
            if (Array.isArray(matchedStaff.customFields)) {
              matchedStaff.customFields.forEach((cf: any) => {
                if (cf.amount > 0) defaultComponents.push({ id: cf.id || `cf-${Date.now()}`, name: cf.name, type: cf.type, amount: Number(cf.amount) });
              });
            }

            dataItems = [{
              id: matchedStaff.nik,
              salaryBase: matchedStaff.salaryBase || 0,
              components: defaultComponents
            }];
          }
        } else {
          dataItems = [];
        }
      }
    }

    if (colName === 'ministry_relations') {
      const mockIds = new Set(['REL-01', 'REL-02', 'REL-03', 'REL-04', 'REL-05', 'REL-06']);
      dataItems = dataItems.filter(item => !mockIds.has(item.id));
    }

    const items = dataItems.filter(item => includeDeleted || !item.deleted);
    res.json(items);
  } catch (error: any) {
    console.error(`Error fetching collection ${colName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// POST create/set document
router.post('/:colName/:id', authenticateToken, checkCollectionPermission, async (req: Request, res: Response) => {
  const { colName, id } = req.params;
  const payload = req.body;
  try {
    if (colName === 'ministry_relations') {
      const mockIds = new Set(['REL-01', 'REL-02', 'REL-03', 'REL-04', 'REL-05', 'REL-06']);
      if (mockIds.has(id)) {
        res.json({ success: true, message: 'Mock data ignored' });
        return;
      }
    }

    const cleaned = cleanObjectForFirestore(payload);
    if (colName === 'staff') {
      const existing = await dbDriver.getDoc(colName, id);
      if (existing) {
        await dbDriver.setDoc(colName, id, { ...existing, ...cleaned });
        res.json({ success: true });
        return;
      }
    }
    await dbDriver.setDoc(colName, id, cleaned);

    if (colName === 'staff_tasks' || colName === 'foundation_tasks') {
      const user = (req as any).user;
      sendStaffTaskNotificationEmail(cleaned, undefined, user?.name).catch(err => {
        console.error(`[DataRoutes] Background ${colName} email notification failed:`, err);
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error(`Error writing document ${colName}/${id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// PUT update document
router.put('/:colName/:id', authenticateToken, checkCollectionPermission, async (req: Request, res: Response) => {
  const { colName, id } = req.params;
  const payload = req.body;
  try {
    const cleaned = cleanObjectForFirestore(payload);
    await dbDriver.updateDoc(colName, id, cleaned);

    if (colName === 'transactions') {
      try {
        await syncTransactionSubcollections(cleaned, false);
      } catch (subUpdateErr) {
        console.warn(`[PUT ENDPOINT] Propagation of update failed for sub-collections:`, subUpdateErr);
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error(`Error updating document ${colName}/${id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE soft-delete document setting deleted: true (with deep merging to satisfy security schemas)
router.delete('/:colName/:id', authenticateToken, checkCollectionPermission, async (req: any, res: Response) => {
  const { colName, id } = req.params;
  const userRole = req.user.role;
  const isSuperAdmin = userRole === 'Super Admin' || userRole === 'Ketua Yayasan';

  console.log(`[DELETE ENDPOINT] Attempting delete for ${colName}/${id} by ${userRole} (isSuperAdmin: ${isSuperAdmin})`);

  try {
    if (colName === 'donations' || colName === 'transactions' || colName === 'documents') {
      console.log(`[DELETE ENDPOINT] Performing HARD database delete of ${colName}/${id}`);
      await dbDriver.deleteDoc(colName, id);
      
      if (colName === 'transactions') {
        try {
          await syncTransactionSubcollections({ id }, true, String(userRole || 'System'), isSuperAdmin ? 'Super Admin' : 'System');
        } catch (subErr) {
          console.warn(`[DELETE ENDPOINT] Propagation of hard-delete failed for sub-collections:`, subErr);
        }
      } else if (colName === 'documents') {
        try {
          const filePath = path.join(process.cwd(), 'uploads', id);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[DOCUMENTS DELETE] Successfully deleted physical file uploads/${id}`);
          }
        } catch (err) {
          console.warn(`[DOCUMENTS DELETE] Failed to delete physical file uploads/${id}:`, err);
        }
      }
      res.json({ success: true });
      return;
    }

    const existingData = await dbDriver.getDoc(colName, id);

    if (existingData) {
      const updatedPayload = {
         ...existingData,
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: isSuperAdmin ? 'Super Admin' : (userRole || 'System')
      };
      
      const cleaned = cleanObjectForFirestore(updatedPayload);
      console.log(`[DELETE ENDPOINT] Soft-deleting existing document ${colName}/${id}`);
      await dbDriver.setDoc(colName, id, cleaned);

      if (colName === 'transactions') {
        try {
          await syncTransactionSubcollections(existingData, true, String(userRole || 'System'), isSuperAdmin ? 'Super Admin' : 'System');
        } catch (subErr) {
          console.warn(`[DELETE ENDPOINT] Propagation of soft-delete failed for sub-collections:`, subErr);
        }
      }
    } else {
      const newPayload = {
        id: id,
        nik: colName === 'staff' ? id : undefined,
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: isSuperAdmin ? 'Super Admin' : (userRole || 'System')
      };
      const cleaned = cleanObjectForFirestore(newPayload);
      console.log(`[DELETE ENDPOINT] Document not found, writing deleted placeholder for ${colName}/${id}`);
      await dbDriver.setDoc(colName, id, cleaned);
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error(`[DELETE ENDPOINT] Soft-delete failed for ${colName}/${id}: ${error.message}. Doing fallback hard delete...`);
    try {
      await dbDriver.deleteDoc(colName, id);
      res.json({ success: true });
    } catch (fallbackError: any) {
      console.error(`[DELETE ENDPOINT] Critical fallback hard-delete failed for ${colName}/${id}: ${fallbackError.message}`);
      res.status(500).json({ error: `Soft-delete failed: ${error.message}. Hard-delete failed: ${fallbackError.message}` });
    }
  }
});

export const dataRouter = router;
export default dataRouter;
