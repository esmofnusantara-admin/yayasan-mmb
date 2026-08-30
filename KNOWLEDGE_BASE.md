# 🤖 AI AGENT EXECUTION & TECHNICAL KNOWLEDGE BASE
# REPOSITORY: YAYASAN-MMB (EXECUTIVE SYSTEM MANAGEMENT / ESM)

> **IMPORTANT FOR AI AGENTS:**
> Read this document BEFORE executing any task in this codebase. This document is optimized for AI agents to understand the architecture, file locations, business invariants, API contracts, and deployment workflows without guessing or asking unnecessary questions.

---

## 1. 🎯 SYSTEM OVERVIEW & ENVIRONMENT

* **Project Name:** Yayasan MMB (Murid Muda Bermisi) - Executive System Management (ESM)
* **Architecture:** Monorepo with React 18 SPA Frontend (Vite) + Centralized Express REST Backend (`server.ts` bundled with `esbuild` to `dist/server.cjs`) + SQLite Database (`better-sqlite3`).
* **Production Host (Biznet VPS):** `103.93.134.220`
* **SSH User:** `Muridmudabermisi2026`
* **Server Root Directory:** `~/yayasan-mmb`
* **Process Manager:** PM2 (`pm2 status`, `pm2 restart yayasan-mmb`, `pm2 logs yayasan-mmb`)
* **Git Remote:** `https://github.com/esmofnusantara-admin/yayasan-mmb.git` (`origin/main`)
* **Standard Automated Deployment Command:**
  ```bash
  ssh Muridmudabermisi2026@103.93.134.220 "cd ~/yayasan-mmb && git pull origin main && npm run build && pm2 restart yayasan-mmb"
  ```

---

## 2. 🗺️ CRITICAL CODEBASE MAP & FILE LOCATIONS

```
yayasan-mmb/
├── server.ts                    # Backend entrypoint (Express + SQLite)
├── server/
│   ├── routes/                  # Modular route controllers
│   │   ├── auth.routes.ts       # Auth, JWT, session verify, password change
│   │   ├── data.routes.ts       # Generic REST CRUD for 26 collections
│   │   ├── finance.routes.ts    # Balance calculation, transaction sync
│   │   ├── system.routes.ts     # Structures, profile settings
│   │   ├── activities.routes.ts # Activity & sub-collection handlers
│   │   └── partners.routes.ts   # Partner CRM, donations
│   └── services/
│       └── seed.service.ts      # Initial system seed & migrations
├── src/
│   ├── App.tsx                  # Root state, Hash Router, SWR on-demand data fetcher, RBAC
│   ├── types.ts                 # ALL TypeScript models and interfaces
│   ├── data/
│   │   └── initialData.ts       # Initial mock/seed structures
│   ├── utils/
│   │   ├── cutoff.ts            # Cut-off period calculation engine & cycle formulas
│   │   └── export.ts            # PDF & Excel exporters (jsPDF, autoTable, html2canvas)
│   └── components/              # 14 Tab Views (Lazy-Loaded)
│       ├── DashboardTab.tsx     # Metrics, quick stats, reminders
│       ├── MembersTab.tsx       # Member registry, notes, prayers, follow-ups
│       ├── SmallGroupsTab.tsx   # KTB cell groups, meetings, materials
│       ├── FinanceTab.tsx       # Main cash journal, income/expense entries
│       ├── ActivitiesTab.tsx    # Event planning, budget, rundowns, preps
│       ├── PartnersTab.tsx      # Donor CRM, commitments, donations
│       ├── StaffTab.tsx         # Staff directory & personal info
│       ├── StaffTasksTab.tsx    # Staff tasks/work programs, meetings
│       ├── PayrollTab.tsx       # Salary formulations, collective payroll approvals
│       ├── LettersTab.tsx       # Inward/outward letters, legal docs
│       ├── ReportsTab.tsx       # Financial & operational cycle reports, exports
│       ├── ApprovalsTab.tsx     # Executive agenda resolution center
│       ├── SystemTab.tsx        # Org tree, profile, cutoff date, audit logs
│       └── StaffMeTab.tsx       # Self-service profile & salary slip
```

---

## 3. 🧭 ROUTING & CODE-SPLITTING SPECIFICATION

The application uses **Client-Side URL Hash Routing** to persist active views across browser refreshes (`F5`) and support direct deep-linking and browser Back/Forward navigation.

### Routing Table in `src/App.tsx`:
| URL Hash | Tab Key | Component | Required Data Collections |
| :--- | :--- | :--- | :--- |
| `/#/dashboard` | `dashboard` | `DashboardTab` | `members`, `transactions`, `partners`, `small_groups`, `approvals`, `audits`, `staff` |
| `/#/members` | `members` | `MembersTab` | `members`, `small_groups`, `member_notes`, `prayer_requests`, `follow_ups` |
| `/#/small-groups` | `small_groups` | `SmallGroupsTab` | `small_groups`, `meeting_logs`, `materials`, `members` |
| `/#/finance` | `finance` | `FinanceTab` | `transactions`, `categories` |
| `/#/kegiatan` | `kegiatan` | `ActivitiesTab` | `activities`, `activity_transactions`, `activity_rundowns`, `activity_preparations`, `transactions` |
| `/#/partners` | `partners` | `PartnersTab` | `partners`, `donations` |
| `/#/staff` | `staff` | `StaffTab` | `staff` |
| `/#/staff-tasks` | `staff_tasks` | `StaffTasksTab` | `staff_tasks`, `staff_meetings`, `staff` |
| `/#/payroll` | `payroll` | `PayrollTab` | `staff`, `transactions`, `salaries` |
| `/#/letters` | `letters` | `LettersTab` | `inward_letters`, `outward_letters`, `documents` |
| `/#/reports` | `reports` | `ReportsTab` | `members`, `transactions`, `partners`, `small_groups`, `meeting_logs`, `staff`, `salaries`, `donations` |
| `/#/approvals` | `approvals` | `ApprovalsTab` | `approvals` |
| `/#/system` | `system` | `SystemTab` | `audits` |
| `/#/staff-profile`| `staff_profile`| `StaffMeTab` | `staff`, `salaries` |

### Rules for Navigation Code:
1. **Never use `setActiveTab('key')` directly.** Always call `navigateTab(tabKey)` in `App.tsx` to ensure `window.location.hash` and history sync correctly.
2. **Every Tab Component MUST be lazy-loaded:**
   ```typescript
   const ReportsTab = lazy(() => import('./components/ReportsTab'));
   ```
3. **Keep initial JS bundle `< 350 kB`**. Heavy vendor libs (`jspdf`, `html2canvas`) must only be imported inside utility functions or dynamic components.

---

## 4. ⚡ DATA FETCHING: TAB-AWARE STALE-WHILE-REVALIDATE (SWR)

### Mechanism:
1. `loadDataForTab(activeTab, force)` in `src/App.tsx`:
   * **Boot Core:** Always ensures `profiles`, `structures`, and `approvals` (for badge counters) are present.
   * **Tab-Specific:** Only queries the collections specified in `TAB_REQUIRED_COLLECTIONS[activeTab]`.
2. **Revalidation Trigger:**
   * On Tab Switch: `useEffect(() => { loadDataForTab(activeTab, true); }, [activeTab])` fetches fresh data in the background while UI renders cached state instantly (0ms latency).
   * Background Interval: Refreshes the active tab's collections every 20 seconds.
3. **CRUD Mutations:**
   * Every mutation handler (e.g. `handleAddMember`, `handleUpdateTransaction`) sends the REST request to the server, writes an audit log via `logAudit()`, and immediately calls `loadCollection(colName, ...)` to update state.

---

## 5. 💰 FINANCIAL CUT-OFF RULES & FORMULAS (`src/utils/cutoff.ts`)

> ⚠️ **CRITICAL INVARIANT:** Never filter transactions by calendar month (`2026-06-01` to `2026-06-30`) for institutional financial reporting. Yayasan MMB uses **Cut-off Cycle Periods**.

### Mathematical Formula for Target Period $M$ ($1 \le M \le 12$) in Year $Y$:
* $\text{CutoffDay} = \text{profile.cutoffDay} \parallel 15$
* $\text{Start Date} = \text{Date}(Y, M-2, \text{CutoffDay} + 1)$ (i.e. day after previous month's cutoff)
* $\text{End Date} = \text{Date}(Y, M-1, \text{CutoffDay})$ (i.e. cutoff day of target month)
* **Example (Cut-off = 15):**
  * **Target September 2026:** `2026-08-16` to `2026-09-15`
  * **Target October 2026:** `2026-09-16` to `2026-10-15`
  * **Target January 2026:** `2025-12-16` to `2026-01-15`

### Helper Functions in `src/utils/cutoff.ts`:
* `getCutoffDay(profile?: InstitutionalProfile): number`
* `getCutoffPeriodRange(targetMonth: number, targetYear: number, cutoffDay?: number): { startDate: string; endDate: string; label: string; periodMonth: number; periodYear: number }`
* `getCurrentActiveCycle(cutoffDay?: number, refDate?: Date)`
* `getAvailableCycles(cutoffDay?: number, year?: number)`

### Ledger & Approval Filter Invariant (`isApprovedTx`):
* Valid transactions contributing to general ledgers, cash balance, and reports MUST satisfy:
  ```typescript
  export const isApprovedTx = (t: { deleted?: boolean; status?: string }): boolean => {
    if (t.deleted) return false;
    if (t.status === undefined || t.status === null || t.status === '') return true;
    const st = String(t.status).trim().toLowerCase();
    return st === 'approved';
  };
  ```

---

## 6. 🔐 ROLE-BASED ACCESS CONTROL (RBAC)

Evaluated via `hasFeatureAccess(feature: string)` in `src/App.tsx`:
* **Roles:** `'Super Admin'`, `'Ketua Yayasan'`, `'Pembina Yayasan'`, `'Pengawas Yayasan'`, `'Bendahara'`, `'Sekretaris'`, `'Koordinator Wilayah'`, `'Staff'`, `'Volunteer'`.
* **Super Admin / Ketua Yayasan:** Full access to all 14 tabs.
* **Bendahara:** Full financial tabs (`finance`, `partners`, `payroll`, `reports`, `approvals`), cannot edit institutional system settings.
* **Sekretaris:** Document & staff tabs (`letters`, `staff`, `system`, `reports`), cannot approve payroll or cash outlays.
* **Staff & Volunteer:** Strictly blocked from `finance`, `reports`, `staff`, `payroll`, `approvals`, `system`. Allowed `dashboard`, `members`, `small_groups`, `kegiatan`, `staff_tasks`, and `staff_profile`.

---

## 7. 🛠️ PLAYBOOK FOR AI AGENTS (HOW TO EXECUTE TASKS)

### Task 1: Adding a New Tab / Module
1. Create `src/components/NewTab.tsx`.
2. Add type definitions to `src/types.ts`.
3. In `src/App.tsx`:
   - Import with `const NewTab = lazy(() => import('./components/NewTab'));`
   - Register hash mapping in `TAB_TO_HASH` and `HASH_TO_TAB`.
   - Add database collection dependencies in `TAB_REQUIRED_COLLECTIONS`.
   - Add feature flag in `hasFeatureAccess` default map.
   - Add navigation button in sidebar using `onClick={() => navigateTab('new_tab')}`.
   - Add conditional render block inside `<Suspense>` container: `{activeTab === 'new_tab' && <NewTab ... />}`.

### Task 2: Modifying Database Collection or Adding Fields
1. Update interface in `src/types.ts`.
2. Ensure generic CRUD in `server/routes/data.routes.ts` supports the collection name (generic route `/api/data/:collection` already supports any collection with soft delete).
3. Update relevant tab component form and table columns.
4. When writing mutation handlers in `App.tsx`, always:
   - Attach `id`, `createdAt`, `createdBy`, `deleted: false`.
   - Execute `POST` / `PUT` / `DELETE` to `/api/data/:collection/:id`.
   - Log via `await logAudit('Deskripsi aksi', 'NamaModul')`.
   - Refresh collection state: `await loadCollection('collection_name', INITIAL_DATA, setter)`.

### Task 3: Modifying Financial Calculations or Reports
1. Import `getCutoffPeriodRange` and `isApprovedTx` from `src/utils/cutoff.ts`.
2. Filter transactions: `transactions.filter(t => isApprovedTx(t) && t.date >= startDate && t.date <= endDate)`.
3. If modifying PDF export, update `src/utils/export.ts` ensuring font sizes and table column widths match existing layouts.

### Task 4: Testing & Deployment Verification
Before finishing any turn:
1. Run `npm run lint` (`tsc --noEmit`). **MUST exit with code 0**.
2. Run `npm run build`. **MUST generate clean Vite and esbuild bundles without errors**.
3. Push to `origin/main` via `git push origin main`.
4. Deploy to Biznet:
   ```bash
   ssh Muridmudabermisi2026@103.93.134.220 "cd ~/yayasan-mmb && git pull origin main && npm run build && pm2 restart yayasan-mmb"
   ```
5. Confirm PM2 status is `online`.
