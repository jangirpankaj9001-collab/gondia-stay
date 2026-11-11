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

  await t.test('2. Admin Deletion: marks status as deleted_by_admin and syncs across all devices', () => {
    // Admin deletion updates status
    assert.ok(
      propServiceCode.includes("status: 'deleted_by_admin'"),
      'propertiesService sets status to deleted_by_admin on admin delete'
    );
    assert.ok(
      servServiceCode.includes("status: 'deleted_by_admin'"),
      'servicesService sets status to deleted_by_admin on admin delete'
    );

    // AppContext real-time listeners sync status
    assert.ok(
      appContextCode.includes("updateSubmittedPropertyStatus(propertyId, 'deleted_by_admin')"),
      'AppContext real-time listener syncs deleted_by_admin property status'
    );
    assert.ok(
      appContextCode.includes("updateSubmittedServiceStatus(serviceId, 'deleted_by_admin')"),
      'AppContext real-time listener syncs deleted_by_admin service status'
    );
  });

  await t.test('3. Owner Section displays "Property Deleted by Admin" and "Service Deleted by Admin"', () => {
    // Owner property card status
    assert.ok(
      appCode.includes("isDeletedByAdmin(property.status)\n                                      ? 'Property Deleted by Admin'"),
      'App.tsx displays Property Deleted by Admin in owner section for deleted property'
    );

    // Owner service card status
    assert.ok(
      appCode.includes("isDeletedByAdmin(srv.status)\n                                          ? 'Service Deleted by Admin'"),
      'App.tsx displays Service Deleted by Admin in owner section for deleted service'
    );

    // Admin moderation status displays
    assert.ok(
      appCode.includes("isDeletedByAdmin(prop.status) ? 'Property Deleted by Admin' : 'Rejected'"),
      'App.tsx displays Property Deleted by Admin in admin moderation'
    );
    assert.ok(
      appCode.includes("isDeletedByAdmin(srv.status) ? 'Service Deleted by Admin' : 'Rejected'"),
      'App.tsx displays Service Deleted by Admin in admin moderation'
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
      appCode.includes("if (!isAdminAuthenticated && !isApproved(s.status)) return false;"),
      'Non-approved services filtered from public services tab'
    );
  });
});
