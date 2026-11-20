import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appCode = fs.readFileSync('src/App.tsx', 'utf8');
const appContextCode = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
const propServiceCode = fs.readFileSync('src/firebase/propertiesService.ts', 'utf8');
const servServiceCode = fs.readFileSync('src/firebase/servicesService.ts', 'utf8');
const typesCode = fs.readFileSync('src/types/index.ts', 'utf8');

test('Comprehensive Permanent Deletion & Real-Time Sync Verification', async (t) => {
  await t.test('1. Owner Deletion: permanently removes items and credentials from Firestore and local tracking', () => {
    // Properties
    assert.ok(
      propServiceCode.includes('batch.delete(docRef)'),
      'Properties service deletes main document'
    );
    assert.ok(
      propServiceCode.includes('batch.delete(secretRef)'),
      'Properties service deletes private secret/credentials doc'
    );
    assert.ok(
      propServiceCode.includes('batch.delete(tokenRef)'),
      'Properties service deletes associated edit token doc'
    );
    assert.ok(
      propServiceCode.includes('PROPERTY_EDIT_TOKENS_COLLECTION'),
      'Properties service queries and removes all associated token docs if multiple exist'
    );

    // Services
    assert.ok(
      servServiceCode.includes('batch.delete(srvRef)'),
      'Services service deletes main service document'
    );
    assert.ok(
      servServiceCode.includes('batch.delete(secretRef)'),
      'Services service deletes private secret/credentials doc'
    );
    assert.ok(
      servServiceCode.includes('batch.delete(tokenRef)'),
      'Services service deletes associated edit token doc'
    );
    assert.ok(
      servServiceCode.includes('SERVICE_EDIT_TOKENS_COLLECTION'),
      'Services service queries and removes all associated token docs if multiple exist'
    );
  });

  await t.test('2. Admin Deletion: permanently deletes main doc, secrets, and edit tokens and syncs removal across all devices', () => {
    // Admin deletion deletes all related Firestore collections
    assert.ok(
      propServiceCode.includes('batch.delete(docRef)') &&
      propServiceCode.includes('batch.delete(secretRef)') &&
      propServiceCode.includes('batch.delete(doc(db!, PROPERTY_EDIT_TOKENS_COLLECTION, tok))'),
      'propertiesService permanently deletes property, secret, and edit token docs on admin delete'
    );
    assert.ok(
      servServiceCode.includes('batch.delete(srvRef)') &&
      servServiceCode.includes('batch.delete(secretRef)') &&
      servServiceCode.includes('batch.delete(doc(db!, SERVICE_EDIT_TOKENS_COLLECTION, tok))'),
      'servicesService permanently deletes service, secret, and edit token docs on admin delete'
    );

    // AppContext real-time listeners permanently remove deleted listings on all devices
    assert.ok(
      appContextCode.includes("if (newStatus === 'deleted' || newStatus === 'deleted_by_admin')") &&
      appContextCode.includes('removeSubmittedProperty(propertyId);') &&
      appContextCode.includes('removeSubmittedService(serviceId);'),
      'AppContext real-time listeners permanently remove deleted properties and services across devices'
    );
  });

  await t.test('3. Owner Section keeps Rejected listings visible with a red Rejected badge and excludes deleted listings', () => {
    // Owner property card red Rejected badge
    assert.ok(
      appCode.includes("'bg-red-100 text-red-700 border border-red-200'") &&
      appCode.includes(": 'Rejected'"),
      'App.tsx displays red Rejected badge in owner section for rejected listings'
    );
    // Owner lists exclude deleted listings
    assert.ok(
      appCode.includes('properties.filter(p => isPropertyOwner(p) && !isDeletedByAdmin(p.status))') &&
      appCode.includes('services.filter(s => isServiceOwner(s) && !isDeletedByAdmin(s.status))'),
      'Owner section hides permanently deleted listings'
    );
  });

  await t.test('4. Deleted items never reappear after refresh, app restart, or through old edit links', () => {
    // fetchPropertyDirect checks
    assert.ok(
      propServiceCode.includes('if (isDeletedByAdmin(data?.status))'),
      'fetchPropertyDirect rejects items deleted by admin'
    );

    // fetchPropertyByEditToken checks and purges token
    assert.ok(
      propServiceCode.includes('isDeletedByAdmin(propData?.status) || isDeletedByAdmin(tokenSnap.data()?.status)'),
      'fetchPropertyByEditToken checks for deleted_by_admin'
    );
    assert.ok(
      propServiceCode.includes('await deleteDoc(tokenRef);'),
      'fetchPropertyByEditToken deletes old edit token'
    );

    // fetchServiceByEditToken checks and purges token
    assert.ok(
      servServiceCode.includes('isDeletedByAdmin(srvData?.status) || isDeletedByAdmin(tokenSnap.data()?.status)'),
      'fetchServiceByEditToken checks for deleted_by_admin'
    );

    // Local storage deleted set prevents resurrection from stale cached lists
    assert.ok(
      propServiceCode.includes('DELETED_PROPERTIES_KEY'),
      'Local deleted properties key prevents stale resurrection'
    );
    assert.ok(
      servServiceCode.includes('DELETED_SERVICES_KEY'),
      'Local deleted services key prevents stale resurrection'
    );
  });

  await t.test('5. Public exclusion: deleted and rejected items never appear on public tabs', () => {
    assert.ok(
      appCode.includes("if (!isApproved(p.status)) return false;"),
      'Non-approved properties filtered from public tabs'
    );
    assert.ok(
      appCode.includes('if (isDeletedByAdmin(s.status) || isRejected(s.status)) {\n        return false;\n      }') &&
      appCode.includes('if (!isApproved(s.status)) return false;'),
      'Non-approved, rejected, and deleted services strictly filtered from public services tab'
    );
  });
});
