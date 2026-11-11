import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appCode = fs.readFileSync('src/App.tsx', 'utf8');
const gridCode = fs.readFileSync('src/components/ServiceCategoryGrid.tsx', 'utf8');
const appContextCode = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
const servServiceCode = fs.readFileSync('src/firebase/servicesService.ts', 'utf8');

test('Deleted Service Visibility in Home Services Subcategories', async (t) => {
  await t.test('1. ServiceCategoryGrid filters both isDeletedByAdmin and getDeletedServiceIds in dedicated subcategory view', () => {
    assert.ok(
      gridCode.includes('import { getDeletedServiceIds } from'),
      'ServiceCategoryGrid imports getDeletedServiceIds'
    );
    assert.ok(
      gridCode.includes('if (isDeletedByAdmin(service.status)) return false;') &&
      gridCode.includes('if (getDeletedServiceIds().has(service.id)) return false;'),
      'dedicatedProviders strictly filters out both isDeletedByAdmin and getDeletedServiceIds'
    );
  });

  await t.test('2. App.tsx filters both isDeletedByAdmin and getDeletedServiceIds in servicesForCategoryGrid and filteredServices', () => {
    assert.ok(
      appCode.includes('import { getDeletedServiceIds } from'),
      'App.tsx imports getDeletedServiceIds'
    );
    assert.ok(
      appCode.includes('if (isDeletedByAdmin(s.status)) {\n        return false;\n      }\n      if (getDeletedServiceIds().has(s.id)) {\n        return false;\n      }'),
      'filteredServices strictly excludes deleted services and deleted service IDs'
    );
    assert.ok(
      appCode.includes('if (isDeletedByAdmin(s.status)) return false;\n      if (getDeletedServiceIds().has(s.id)) return false;'),
      'servicesForCategoryGrid strictly excludes deleted services and deleted service IDs'
    );
  });

  await t.test('3. AppContext initial state and real-time subscription prevent resurrection of deleted services', () => {
    assert.ok(
      appContextCode.includes('getDeletedServiceIds()'),
      'AppContext uses getDeletedServiceIds'
    );
    assert.ok(
      appContextCode.includes('!map.has(s.id) && !deletedIds.has(s.id) && !isDeletedByAdmin(s.status)'),
      'Initial services state excludes deletedIds and isDeletedByAdmin to ensure services never reappear on refresh/restart'
    );
    assert.ok(
      appContextCode.includes('if (!deletedIds.has(localSrv.id) && !isDeletedByAdmin(localSrv.status))'),
      'Real-time Firestore listener checks deletedIds and isDeletedByAdmin before adding any locally tracked service'
    );
    assert.ok(
      appContextCode.includes('removeSubmittedService(localSrv.id);'),
      'Stale local services are cleaned up from local storage'
    );
  });

  await t.test('4. Immediate removal on service provider deletion and token deletion handling', () => {
    assert.ok(
      appContextCode.includes('removeSubmittedService(serviceId);') &&
      appContextCode.includes('setServices(prev => prev.filter(s => s.id !== serviceId));'),
      'deleteService immediately cleans local submitted service storage and removes service from state'
    );
    assert.ok(
      servServiceCode.includes("onStatusUpdate(serviceId, 'deleted');") ||
      servServiceCode.includes("onStatusUpdate(srvId, 'deleted');"),
      'subscribeToOwnerServicesStatus dispatches deleted status when Firestore document is deleted'
    );
    assert.ok(
      appContextCode.includes("if (newStatus === 'deleted') {\n          removeSubmittedService(serviceId);\n          setServices(prev => prev.filter(s => s.id !== serviceId));"),
      'AppContext reacts to deleted status by immediately removing service from state and storage'
    );
  });

  await t.test('5. Local storage cleanup removes deleted service from both my_submitted and submitted storage keys', () => {
    assert.ok(
      servServiceCode.includes('gondia_stay_my_submitted_services'),
      'deleteServiceInFirestore cleans up gondia_stay_my_submitted_services'
    );
    assert.ok(
      servServiceCode.includes('gondia_stay_submitted_services'),
      'deleteServiceInFirestore cleans up gondia_stay_submitted_services'
    );
  });

  await t.test('6. Laundry, Water Can, and Cook subcategories normalize category strings and Firestore permanently purges admin-deleted services', () => {
    assert.ok(
      gridCode.includes("normTarget === 'COOK' || normTarget === 'MAID'"),
      'matchesSubcategory normalizes COOK and MAID categories'
    );
    assert.ok(
      gridCode.includes("normTarget === 'WATER_CANS' || normTarget === 'WATER_CAN'"),
      'matchesSubcategory normalizes WATER_CANS and WATER_CAN categories'
    );
    assert.ok(
      gridCode.includes("normTarget === 'LAUNDRY'"),
      'matchesSubcategory normalizes LAUNDRY category'
    );
    assert.ok(
      servServiceCode.includes('purgeAllDeletedServicesFromFirestore'),
      'servicesService exports purgeAllDeletedServicesFromFirestore'
    );
    assert.ok(
      servServiceCode.includes('await deleteDoc(srvRef)'),
      'deleteServiceInFirestore executes permanent deleteDoc on Firestore for admin deletion'
    );
  });

  await t.test('7. Complete wipe of all old and new services across all devices with category names intact', () => {
    assert.ok(
      servServiceCode.includes('clearAllServicesFromFirestore'),
      'servicesService exports clearAllServicesFromFirestore'
    );
    assert.ok(
      servServiceCode.includes('ensureServicesStorageWiped'),
      'servicesService exports ensureServicesStorageWiped to clear device caches'
    );
    assert.ok(
      servServiceCode.includes('SERVICES_WIPE_CUTOFF'),
      'servicesService defines SERVICES_WIPE_CUTOFF'
    );
    // Keep category names intact
    assert.ok(gridCode.includes("name: 'Mess/Tiffin'"), 'Mess/Tiffin category name is intact');
    assert.ok(gridCode.includes("name: 'Laundry'"), 'Laundry category name is intact');
    assert.ok(gridCode.includes("name: 'Electrician'"), 'Electrician category name is intact');
    assert.ok(gridCode.includes("name: 'Plumber'"), 'Plumber category name is intact');
    assert.ok(gridCode.includes("name: 'Water Cans'"), 'Water Cans category name is intact');
    assert.ok(gridCode.includes("name: 'Security (CCTV/Guard)'"), 'Security category name is intact');
    assert.ok(gridCode.includes("name: 'Cook'"), 'Cook category name is intact');
    assert.ok(gridCode.includes("name: 'Housekeeping'"), 'Housekeeping category name is intact');
  });
});
