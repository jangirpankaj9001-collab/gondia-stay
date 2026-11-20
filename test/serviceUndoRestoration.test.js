import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appContextCode = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
const rulesCode = fs.readFileSync('firestore.rules', 'utf8');

test('Service Delete -> Undo preserves exact previous approval status and all details without requiring admin reapproval', async (t) => {
  const deleteStart = appContextCode.indexOf('const deleteService = async (serviceId: string)');
  const undoStart = appContextCode.indexOf('const undoServiceDeletion = useCallback');
  const loginStart = appContextCode.indexOf('const loginAdminWithEmailPassword = async');

  assert.ok(deleteStart > -1 && undoStart > deleteStart && loginStart > undoStart, 'Located deleteService and undoServiceDeletion');

  const deleteServiceFn = appContextCode.slice(deleteStart, undoStart);
  const undoServiceFn = appContextCode.slice(undoStart, loginStart);

  await t.test('1. Owner deleteService defers permanent Firestore deletion until the 7-second Undo window expires', () => {
    const adminReturnIdx = deleteServiceFn.indexOf('showToast("Service permanently deleted from Firestore.");');
    assert.ok(adminReturnIdx > -1, 'Admin permanent delete branch exists');

    const ownerBranch = deleteServiceFn.slice(adminReturnIdx);
    assert.ok(
      !ownerBranch.includes('deleteServiceInFirestore('),
      'Owner delete branch must NOT eagerly delete the Firestore document before the 7-second Undo timer expires'
    );
    assert.ok(
      ownerBranch.includes('pendingServiceDeletionRef.current = pendingItem;') &&
      ownerBranch.includes('setServices(prev => prev.filter(s => s.id !== serviceId));') &&
      ownerBranch.includes('await finalizePendingServiceDeletion(itemToDelete);'),
      'Owner delete hides service immediately in UI and finalizes Firestore deletion only when the 7-second timer expires'
    );
  });

  await t.test('2. Incoming Firestore snapshots keep the pending-delete service hidden during the 7-second Undo window', () => {
    assert.ok(
      appContextCode.includes('const pendingDeleteId = pendingServiceDeletionRef.current?.service.id;') &&
      appContextCode.includes('merged.filter(s => s.id !== pendingDeleteId)'),
      'Firestore services listener excludes pendingServiceDeletionRef during the 7-second countdown'
    );
  });

  await t.test('3. undoServiceDeletion restores exact original service and status without calling saveServiceToFirestore (no Pending Approval reset)', () => {
    assert.ok(
      !undoServiceFn.includes('saveServiceToFirestore('),
      'undoServiceDeletion must NOT call saveServiceToFirestore (which forces status: pending and requires admin reapproval)'
    );
    assert.ok(
      !undoServiceFn.includes("status: 'pending'"),
      'undoServiceDeletion must NOT alter service status to pending'
    );
    assert.ok(
      undoServiceFn.includes('if (isApproved(item.service.status))') &&
      undoServiceFn.includes('remoteApprovedServiceIdsRef.current.add(item.service.id);') &&
      undoServiceFn.includes('const restored = [item.service, ...withoutDup];') &&
      undoServiceFn.includes('saveSubmittedService(item.service);') &&
      undoServiceFn.includes('saveServiceId(item.service.id);'),
      'undoServiceDeletion immediately restores exact original service object, live-approved state, owner credentials, and caches'
    );
  });

  await t.test('4. Expiring timer or page unload still permanently deletes the service in Firestore', () => {
    const finalizeStart = appContextCode.indexOf('const finalizePendingServiceDeletion = useCallback');
    const finalizeEnd = appContextCode.indexOf('const isServiceOwner = useCallback');
    assert.ok(finalizeStart > -1 && finalizeEnd > finalizeStart, 'Located finalizePendingServiceDeletion');
    const finalizeFn = appContextCode.slice(finalizeStart, finalizeEnd);

    assert.ok(
      finalizeFn.includes('await deleteServiceInFirestore(item.service.id, item.token, item.ownerId, isAdminAuthenticated)') &&
      finalizeFn.includes('removeSubmittedService(item.service.id);') &&
      appContextCode.includes('gondia_stay_pending_service_finalize'),
      'Permanent Firestore deletion runs reliably when timer expires or if tab reloads mid-countdown'
    );
  });

  await t.test('5. Firestore security rules remain intact and strictly prohibit public self-approval', () => {
    assert.ok(
      rulesCode.includes("request.resource.data.status in ['pending', 'PENDING']") &&
      rulesCode.includes('allow delete: if isAdmin() || isServiceOwner() || hasValidServiceDeleteToken();'),
      'Firestore service create/delete rules remain strictly enforced'
    );
  });
});
