# Implementation Plan: Firebase Sync Hardening, Transfer Modal & Stats Navigation

## Plain-Language Summary (What this does in everyday terms)

If you don't know code or IT jargon, here is a simple breakdown of what was going wrong and how we are fixing it for you:

1. **Why your devices and tabs weren't syncing**:
   - *The problem*: Every time you opened the app on a second device (or a new browser tab), the app checked only *that specific device's local memory*. Because you had never opened the app on that device before, it panicked and thought: *"Wait! This phone has 0 transactions, but the cloud has transactions! There is a conflict!"* It then threw up that scary popup modal asking you to choose between your device and the cloud. If you accidentally picked "Upload Local to Cloud", it actually wiped your cloud database clean!
   - *The fix*: The Google Cloud database will now always be the boss. When you log in on your phone, laptop, or tablet, it will instantly and smoothly download your data from the cloud without questioning you or popping up scary conflict boxes.

2. **Why data stopped saving after 1 hour (Silent Failures)**:
   - *The problem*: Google logins expire after 60 minutes for security. When that hour passed, the app tried to send new expenses to the cloud, but the cloud rejected them. The app never showed you an error, so you kept logging expenses thinking they were saved when they were actually failing silently!
   - *The fix*: We are turning on automatic background renewal so your login automatically refreshes before it expires. If your internet ever cuts out or the session truly expires, you will see a friendly banner at the top saying: *"Session expired — tap here to sign in and save your pending items"*, and your items will stay safely queued on your phone until you reconnect.

3. **Multi-Tab instant synchronization**:
   - *The problem*: Opening two tabs in your browser caused them to act independently because the multi-tab memory engine wasn't enabled.
   - *The fix*: We are enabling Firebase's official multi-tab manager. If you log a coffee in Tab 1, it will immediately show up in Tab 2 on your screen in real time without refreshing the page.

4. **Accurate "In Sync" status indicator**:
   - *The problem*: The app previously said "100% In Sync" the second the page loaded, even before it actually reached Google Cloud!
   - *The fix*: The app will now say "Connecting..." at startup, show "Unsynced changes" while a transaction is being saved, and only display "100% In Sync" once Google Cloud sends back an official confirmation that your data is safely recorded.

5. **Fixing the "Move Money" (Transfer) modal**:
   - *The problem*: The transfer modal was still defaulting in the background to old accounts ("Checking" and "Savings") that don't exist anymore, which scrambled the transaction history. It also let you press transfer even if you picked the same account or typed 0.
   - *The fix*: It will now always default to your actual accounts ("Bank" and "Cash"), prevent you from transferring to the exact same account, and disable the Confirm button until you enter a valid amount greater than €0.

6. **Historical Navigation in the Stats Tab**:
   - *The problem*: Currently, you can only look at the current month (e.g. November). There are no buttons to look at what you spent last month (October), two months ago (September), or last year.
   - *The fix*: We are adding `<` (previous) and `>` (next) arrow buttons right next to the period name (e.g., "October 2026", "November 2026"), plus a handy "Today" button. Clicking the arrows will immediately update all your donut charts, category percentages, and totals for that specific past month, week, day, or year.

7. **Clean text & Polish**:
   - Fixes grammar: says `"1 account connected"` instead of `"1 accounts connected"`.
   - In the Income tab, the account tag will clearly say `"RECEIVED IN: Bank"` instead of `"PAID: Bank"`.

---

## Technical Details (For Verification & Engineering Reference)

### 1. Stale-Closure Bug Fix (`src/context/LedgerContext.tsx`)
- Compute the new value synchronously outside the `setState` updater callback across all 14 state modification functions (`updateAccount`, `updateTransaction`, `updatePerson`, `updateGroup`, `updateCategoryGroupTarget`, `addCategoryItem`, `updateCategoryItem`, `deleteCategoryItem`, `addSubcategory`, `updateSubcategory`, `deleteSubcategory`, `reorderGroups`, `togglePinGroup`, `settleRepayment`).
- Pass the computed new object/array directly to `setState` and to Firestore (`setDoc`/`writeBatch`).

### 2. Silent Write Failures with Optimistic Revert
- Replace re-throwing in `handleFirestoreError` with logging and setting `syncError: string | null`.
- On write failure, roll back the optimistic UI state and display a visible error notification.

### 3. Accurate Sync Status & Pending Writes Tracking
- Initialize `syncStage` to `"Connecting..."` and `lastSyncedAt` to `null`.
- Add `{ includeMetadataChanges: true }` to all `onSnapshot` listeners.
- Set status to `'synced'` and `"100% In Sync"` only when `!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites`.
- Show `"Unsynced changes"` while `hasPendingWrites === true`.
- In `syncNow()`, await `waitForPendingWrites(db)` and report any errors.

### 4. Offline Persistence & Multi-Tab Configuration (`src/lib/firebase.ts`)
- Replace `getFirestore` with:
  ```ts
  import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
  export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  }, firebaseConfig.firestoreDatabaseId);
  ```

### 5. Empty Cache Snapshot Guard
- In all `onSnapshot` listeners, ignore empty snapshots if `snapshot.metadata.fromCache === true` so an empty local cache never overwrites populated server data.

### 6. Safe Migration Storage on User Document
- Store `seedV2Applied: true` as a field on `users/{uid}` in Firestore instead of device-local storage.
- Never delete accounts or categories if `remoteTxSnap.size > 0`.
- Update `firestore.rules` under `isValidUser` to permit `seedV2Applied is bool`.

### 7. 500-Batch Limit Chunking
- Split `writeBatch` into chunks of $\le 400$ operations in `importJSON`, `resetCloudDatabase`, and migrations.
- In `importJSON`, await server completion before changing local state.

### 8. Transfer Modal Account Binding (`src/components/TransferModal.tsx`)
- Default `fromAccountId` and `toAccountId` strictly to valid IDs from `activeAccounts`.
- Disable Confirm Transfer button when `parsedAmount <= 0 || fromAccountId === toAccountId || !fromAccountId || !toAccountId`.

### 9. UI Labels & Grammatical Pluralization
- Show `"Real-time balance updates"` only when `cloudSyncStatus === 'synced'`.
- Pluralize: `{activeAccounts.length} {activeAccounts.length === 1 ? 'account' : 'accounts'} connected`.
- Quick Log Income: show `"RECEIVED IN:"`.

### 10. Stats Historical Navigation (`src/components/StatsView.tsx`)
- Add `offsetDate: Date` state with `<` and `>` step buttons and formatted period labels.
- Add "Today / Current" quick reset badge button.
- Derive start/end date filters dynamically from `offsetDate`.

---

## Verification Plan
1. **Compilation**: Run `lint_applet` and `compile_applet`.
2. **Transfer Modal**: Confirm From/To default to Bank/Cash and the Confirm button is disabled if From == To.
3. **Multi-Tab Sync**: Open two tabs side by side; confirm additions in Tab 1 show up in Tab 2 automatically.
4. **Stats Navigation**: Step back into October and September to verify KPI and category calculations.
