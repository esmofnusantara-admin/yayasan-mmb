import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { dbDriver } from '../db/driver';
import { authenticateToken, checkCollectionPermission } from './auth.routes';
import { cleanObjectForFirestore, syncTransactionSubcollections } from '../services/transaction-sync.service';

const router = Router();

// GET collection elements
router.get('/:colName', authenticateToken, checkCollectionPermission, async (req: any, res: Response) => {
  const { colName } = req.params;
  const includeDeleted = req.query.includeDeleted === 'true';
  try {
    let dataItems = await dbDriver.getDocs(colName);

    if (colName === 'structures') {
      const defaultNodes = [
        { id: 'ketua', title: 'Ketua Dewan Pembina', name: 'Fernandes Manihuruk', sub: 'Pembuat Keputusan/Ketua', order: 10, deleted: false },
        { id: 'sekretaris', title: 'Sekretaris Eksekutif', name: 'Yusuf Raja Tamba', sub: 'Administrasi & Legalitas Lembaga', order: 20, deleted: false },
        { id: 'bendahara', title: 'Bendahara Umum', name: 'Angelina Meilia Putri Manalu', sub: 'Jurnal Kas, Transaksi & Audit', order: 30, deleted: false },
      ];

      for (const def of defaultNodes) {
        const existingIdx = dataItems.findIndex(item => item.id === def.id);
        if (existingIdx > -1) {
          const item = dataItems[existingIdx];
          const needsRepair = !item.name;
          
          if (needsRepair) {
            item.name = def.name;
            item.deleted = false;
            await dbDriver.setDoc('structures', def.id, item);
          }
        } else {
          dataItems.push(def);
          await dbDriver.setDoc('structures', def.id, def);
        }
      }
    }

    if (colName === 'staff') {
      const role = req.user?.role;
      const features = req.user?.features || [];
      const hasReportsAccess = Array.isArray(features) && features.includes('reports');
      const isPrivileged = role === 'Super Admin' || role === 'Ketua Yayasan' || role === 'Bendahara' || hasReportsAccess;

      if (!isPrivileged) {
        const userEmail = req.user?.email?.toLowerCase().trim();
        const userName = req.user?.name?.toLowerCase().trim();
        dataItems = dataItems.filter(item => {
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
        
        // Find matching staff first to find the NIK
        const allStaff = await dbDriver.getDocs('staff');
        const matchedStaff = allStaff.find(item => {
          const staffEmail = item.email?.toLowerCase().trim();
          const staffName = item.name?.toLowerCase().trim();
          const staffPhone = item.phone?.trim();
          return (staffEmail && staffEmail === userEmail) || 
                 (staffName && staffName === userName) ||
                 (staffPhone && (staffPhone === userEmail || userEmail?.startsWith(staffPhone)));
        });

        if (matchedStaff) {
          dataItems = dataItems.filter(item => item.id === matchedStaff.nik);
        } else {
          dataItems = [];
        }
      }
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
    const cleaned = cleanObjectForFirestore(payload);
    await dbDriver.setDoc(colName, id, cleaned);
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
