import { dbDriver } from '../db/driver';
import { cleanObjectForFirestore } from '../services/transaction-sync.service';

export interface AuditOptions {
  userName: string;
  userRole: string;
  action: string;
  module: string;
  beforeValue?: string;
  afterValue?: string;
}

export async function writeAuditLog(opts: AuditOptions): Promise<void> {
  try {
    const id = `AUD-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    const log = cleanObjectForFirestore({
      id,
      userName: opts.userName,
      userRole: opts.userRole,
      action: opts.action,
      module: opts.module,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      beforeValue: opts.beforeValue || '',
      afterValue: opts.afterValue || '',
      createdBy: opts.userName,
      createdAt: new Date().toISOString(),
      deleted: false,
    });
    await dbDriver.setDoc('audits', id, log);
  } catch (err) {
    console.warn('[AuditUtil] Failed to write audit log:', err);
  }
}

/** Shorthand helper untuk user dari req.user */
export function auditFromReq(req: any): Pick<AuditOptions, 'userName' | 'userRole'> {
  return {
    userName: req.user?.name || req.user?.email || `${req.user?.role || 'Unknown'} Operator`,
    userRole: req.user?.role || 'Unknown',
  };
}
