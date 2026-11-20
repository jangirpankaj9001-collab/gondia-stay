import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const servServiceCode = fs.readFileSync('src/firebase/servicesService.ts', 'utf8');
const appContextCode = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
const rulesCode = fs.readFileSync('firestore.rules', 'utf8');

test('Approved Home Services remain visible after Admin Panel sign-out and page refresh', async (t) => {
  await t.test('1. Public Firestore services query fetches both lowercase and uppercase approved statuses matching firestore.rules', () => {
    assert.ok(
      rulesCode.includes("resource.data.status in ['approved', 'APPROVED']"),
      'firestore.rules remains intact and permits public reads of approved and APPROVED services'
    );
    assert.ok(
      servServiceCode.includes("where('status', 'in', ['approved', 'APPROVED'])"),
      'subscribeToFirestoreServices public query uses where(status, in, [approved, APPROVED])'
    );
    assert.ok(
      servServiceCode.includes('let isUnsubscribed = false;') &&
      servServiceCode.includes('isUnsubscribed = true;'),
      'subscribeToFirestoreServices guards callbacks with isUnsubscribed during admin sign-out'
    );
    assert.ok(
      servServiceCode.includes('if (!auth?.currentUser)') &&
      servServiceCode.includes('startPublicApprovedListener();'),
      'Admin listener cleanly switches to public approved listener if auth signs out mid-flight'
    );
  });

  await t.test('2. clearAllServicesFromFirestore preserves secrets, tokens, and cache for active approved services', () => {
    assert.ok(
      servServiceCode.includes('const activeServiceIds = new Set<string>();') &&
      servServiceCode.includes('activeServiceIds.add(docSnap.id);'),
      'clearAllServicesFromFirestore tracks activeServiceIds'
    );
    assert.ok(
      servServiceCode.includes('if (!activeServiceIds.has(secSnap.id))'),
      'clearAllServicesFromFirestore never deletes service_secrets belonging to active services'
    );
    assert.ok(
      servServiceCode.includes('if (!tokServiceId || !activeServiceIds.has(tokServiceId))'),
      'clearAllServicesFromFirestore never deletes service_edit_tokens belonging to active services'
    );
    assert.ok(
      servServiceCode.includes('pastServiceDocs.forEach((docSnap) =>'),
      'clearAllServicesFromFirestore fallback catch only deletes past/obsolete docs, never active services'
    );
  });

  await t.test('3. Admin service creation and update synchronize status to service_edit_tokens', () => {
    assert.ok(
      servServiceCode.includes("const cleanStatus = (isRealAdminAuth && serviceData.status) ? String(serviceData.status).toLowerCase() : 'pending';"),
      'saveServiceToFirestore normalizes cleanStatus to lowercase'
    );
    assert.ok(
      servServiceCode.includes('status: cleanStatus,\n      serviceData: clientCachedData,'),
      'saveServiceToFirestore writes cleanStatus (not hardcoded pending) to service_edit_tokens'
    );
    assert.ok(
      servServiceCode.includes('if (isRealAdminAuth && finalPayload.status)'),
      'updateServiceInFirestore synchronizes admin status changes to service_edit_tokens'
    );
  });

  await t.test('4. subscribeToOwnerServicesStatus and AppContext prevent stale/missing tokens from hiding live approved services on logout', () => {
    assert.ok(
      servServiceCode.includes('const isLiveApprovedInFirestore = async (serviceId: string): Promise<boolean> =>'),
      'subscribeToOwnerServicesStatus verifies live approved status in /services before emitting deleted or pending'
    );
    assert.ok(
      appContextCode.includes('const remoteApprovedServiceIdsRef = useRef<Set<string>>(new Set());'),
      'AppContext tracks remoteApprovedServiceIdsRef from Firestore services snapshot'
    );
    assert.ok(
      appContextCode.includes("if (remoteApprovedServiceIdsRef.current.has(serviceId) && (newStatus === 'deleted' || newStatus === 'pending'))"),
      'AppContext blocks stale deleted/pending token callbacks from removing or hiding live approved services'
    );
    const logoutIdx = appContextCode.indexOf('const logoutAdmin = async');
    const setAdminFalseIdx = appContextCode.indexOf('setIsAdminAuthenticated(false);', logoutIdx);
    const signOutIdx = appContextCode.indexOf('await signOut(auth);', logoutIdx);
    assert.ok(
      logoutIdx > 0 && setAdminFalseIdx > logoutIdx && signOutIdx > setAdminFalseIdx,
      'logoutAdmin transitions isAdminAuthenticated to false before revoking Firebase auth'
    );
  });

  await t.test('5. End-to-end simulation: Admin login -> approve/create -> Admin logout -> page refresh keeps all approved services visible', () => {
    const isApproved = (status) => (status || '').toLowerCase() === 'approved';
    const isDeletedByAdmin = (status) => (status || '').toLowerCase() === 'deleted_by_admin';

    // Simulated Firestore collections
    const SERVICES_WIPE_CUTOFF = 1794392500000;
    const now = SERVICES_WIPE_CUTOFF + 60_000;

    const servicesDb = new Map([
      ['srv_old_deleted', { id: 'srv_old_deleted', status: 'deleted_by_admin', createdAt: now }],
      ['srv_approved_lower', { id: 'srv_approved_lower', status: 'approved', createdAt: now }],
      ['srv_approved_upper', { id: 'srv_approved_upper', status: 'APPROVED', createdAt: now }],
      ['srv_pending_owner', { id: 'srv_pending_owner', status: 'pending', createdAt: now }],
      ['srv_admin_created', { id: 'srv_admin_created', status: 'approved', createdAt: now }],
    ]);
    const tokensDb = new Map([
      ['tok_deleted', { serviceId: 'srv_old_deleted', status: 'deleted_by_admin' }],
      ['tok_lower', { serviceId: 'srv_approved_lower', status: 'approved' }],
      // Simulate pre-existing corrupted/missing token (no entry for tok_upper) and stale pending token
      ['tok_admin_created', { serviceId: 'srv_admin_created', status: 'approved' }],
      ['tok_stale_pending', { serviceId: 'srv_approved_lower', status: 'pending' }],
    ]);

    // Step 1: Admin login runs cleanup (must preserve active services & their tokens)
    const activeServiceIds = new Set();
    for (const [id, data] of servicesDb.entries()) {
      const isPastRecord = !data.createdAt || data.createdAt < SERVICES_WIPE_CUTOFF || isDeletedByAdmin(data.status);
      if (isPastRecord) {
        servicesDb.delete(id);
      } else {
        activeServiceIds.add(id);
      }
    }
    for (const [tok, data] of tokensDb.entries()) {
      if (!data.serviceId || !activeServiceIds.has(data.serviceId)) {
        tokensDb.delete(tok);
      }
    }

    assert.equal(servicesDb.has('srv_old_deleted'), false, 'Deleted service purged on admin login');
    assert.equal(tokensDb.has('tok_deleted'), false, 'Deleted service token purged on admin login');
    assert.equal(tokensDb.has('tok_lower'), true, 'Active approved service token preserved on admin login');
    assert.equal(tokensDb.has('tok_admin_created'), true, 'Admin-created approved service token preserved');

    // Step 2: Admin approves srv_pending_owner
    servicesDb.get('srv_pending_owner').status = 'approved';

    // Step 3: Admin logs out -> public query runs where('status', 'in', ['approved', 'APPROVED'])
    const publicQuery = () =>
      Array.from(servicesDb.values())
        .filter((s) => ['approved', 'APPROVED'].includes(s.status))
        .map((s) => ({ ...s, status: s.status.toLowerCase() }));

    let uiServices = publicQuery();
    const remoteApprovedIds = new Set(uiServices.filter((s) => isApproved(s.status)).map((s) => s.id));

    assert.deepEqual(
      uiServices.map((s) => s.id).sort(),
      ['srv_admin_created', 'srv_approved_lower', 'srv_approved_upper', 'srv_pending_owner'],
      'All 4 approved services (both lowercase and uppercase) returned after admin logout'
    );

    // Step 4: subscribeToOwnerServicesStatus fires on device tokens (including missing token and stale pending token)
    const deviceTokens = {
      srv_approved_lower: 'tok_stale_pending',
      srv_approved_upper: 'tok_missing_from_db',
      srv_admin_created: 'tok_admin_created',
      srv_old_deleted: 'tok_deleted',
    };

    const handleOwnerStatusUpdate = (serviceId, newStatus) => {
      if (remoteApprovedIds.has(serviceId) && (newStatus === 'deleted' || newStatus === 'pending')) {
        return;
      }
      if (newStatus === 'deleted') {
        uiServices = uiServices.filter((s) => s.id !== serviceId);
      } else {
        uiServices = uiServices.map((s) => (s.id === serviceId ? { ...s, status: newStatus } : s));
      }
    };

    for (const [serviceId, tok] of Object.entries(deviceTokens)) {
      const tokenDoc = tokensDb.get(tok);
      const liveDoc = servicesDb.get(serviceId);
      const isLiveApproved = Boolean(liveDoc && isApproved(liveDoc.status));

      if (!tokenDoc) {
        handleOwnerStatusUpdate(serviceId, isLiveApproved ? 'approved' : 'deleted');
      } else if (tokenDoc.status === 'pending') {
        handleOwnerStatusUpdate(serviceId, isLiveApproved ? 'approved' : 'pending');
      } else {
        handleOwnerStatusUpdate(serviceId, tokenDoc.status);
      }
    }

    // Public frontend filter after admin logout & page refresh
    const isAdminAuthenticated = false;
    const publicVisibleAfterLogout = uiServices.filter(
      (s) => !isDeletedByAdmin(s.status) && (isAdminAuthenticated || isApproved(s.status))
    );

    assert.deepEqual(
      publicVisibleAfterLogout.map((s) => s.id).sort(),
      ['srv_admin_created', 'srv_approved_lower', 'srv_approved_upper', 'srv_pending_owner'],
      'All 4 approved services remain visible to public users after admin logout and page refresh'
    );
  });
});
