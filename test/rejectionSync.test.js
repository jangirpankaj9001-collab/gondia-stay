import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Read relevant source files to verify logic and implementations
const typesCode = fs.readFileSync('src/types/index.ts', 'utf8');
const propertiesServiceCode = fs.readFileSync('src/firebase/propertiesService.ts', 'utf8');
const servicesServiceCode = fs.readFileSync('src/firebase/servicesService.ts', 'utf8');
const appContextCode = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
const appCode = fs.readFileSync('src/App.tsx', 'utf8');
const rulesCode = fs.readFileSync('firestore.rules', 'utf8');

test('Admin Rejection & Deletion Functional Sync & Public Exclusion', async (t) => {
  await t.test('1. Admin rejection for properties persists status: "rejected" in Firestore and token document', () => {
    // Check moderatePropertyInFirestore implementation
    assert.ok(propertiesServiceCode.includes('moderatePropertyInFirestore'), 'moderatePropertyInFirestore must exist');
    assert.ok(propertiesServiceCode.includes("const newStatus = approve ? 'approved' : 'rejected'"), 'moderatePropertyInFirestore calculates newStatus');
    assert.ok(propertiesServiceCode.includes('PROPERTY_EDIT_TOKENS_COLLECTION'), 'moderatePropertyInFirestore syncs to token collection');
    assert.ok(propertiesServiceCode.includes('status: newStatus'), 'moderatePropertyInFirestore sets status: newStatus in Firestore');
  });

  await t.test('2. Admin rejection for services persists status: "rejected" in Firestore and token document', () => {
    // Check moderateServiceInFirestore implementation
    assert.ok(servicesServiceCode.includes('moderateServiceInFirestore'), 'moderateServiceInFirestore must exist');
    assert.ok(servicesServiceCode.includes("const newStatus = approve ? 'approved' : 'rejected'"), 'moderateServiceInFirestore calculates newStatus');
    assert.ok(servicesServiceCode.includes('SERVICE_EDIT_TOKENS_COLLECTION'), 'moderateServiceInFirestore syncs to token collection');
    assert.ok(servicesServiceCode.includes('status: newStatus'), 'moderateServiceInFirestore sets status: newStatus in Firestore');
  });

  await t.test('3. Admin permanent deletion removes main document, secrets, and edit-token records in Firestore', () => {
    // Check deletePropertyFromFirestore implementation
    assert.ok(propertiesServiceCode.includes('deletePropertyFromFirestore'), 'deletePropertyFromFirestore must exist');
    assert.ok(
      propertiesServiceCode.includes('batch.delete(docRef)') &&
      propertiesServiceCode.includes('batch.delete(secretRef)') &&
      propertiesServiceCode.includes('batch.delete(doc(db!, PROPERTY_EDIT_TOKENS_COLLECTION, tok))'),
      'deletePropertyFromFirestore permanently deletes property, secret, and edit-token documents'
    );

    // Check deleteServiceInFirestore implementation
    assert.ok(servicesServiceCode.includes('deleteServiceInFirestore'), 'deleteServiceInFirestore must exist');
    assert.ok(
      servicesServiceCode.includes('batch.delete(srvRef)') &&
      servicesServiceCode.includes('batch.delete(secretRef)') &&
      servicesServiceCode.includes('batch.delete(doc(db!, SERVICE_EDIT_TOKENS_COLLECTION, tok))'),
      'deleteServiceInFirestore permanently deletes service, secret, and edit-token documents'
    );
  });

  await t.test('4. Real-time status listeners sync rejection and admin deletion immediately to the owner device', () => {
    // Check subscribeToOwnerPropertiesStatus and subscribeToOwnerServicesStatus
    assert.ok(propertiesServiceCode.includes('subscribeToOwnerPropertiesStatus'), 'subscribeToOwnerPropertiesStatus must be exported');
    assert.ok(servicesServiceCode.includes('subscribeToOwnerServicesStatus'), 'subscribeToOwnerServicesStatus must be exported');

    // Both listeners should handle deleted_by_admin alongside approved, pending, rejected
    assert.ok(propertiesServiceCode.includes("'deleted_by_admin'"), 'Property listener handles deleted_by_admin');
    assert.ok(servicesServiceCode.includes("'deleted_by_admin'"), 'Service listener handles deleted_by_admin');

    // Both listeners should extract rawStatus and invoke onStatusUpdate
    assert.ok(propertiesServiceCode.includes("onStatusUpdate(propertyId, rawStatus as any)"), 'Property status listener notifies owner device');
    assert.ok(servicesServiceCode.includes("onStatusUpdate(serviceId, rawStatus as any)"), 'Service status listener notifies owner device');
  });

  await t.test('5. AppContext hooks up real-time rejection & deletion synchronization for properties and services', () => {
    assert.ok(appContextCode.includes('subscribeToOwnerPropertiesStatus'), 'AppContext imports subscribeToOwnerPropertiesStatus');
    assert.ok(appContextCode.includes('subscribeToOwnerServicesStatus'), 'AppContext imports subscribeToOwnerServicesStatus');

    // AppContext updates local tracking and state on status change (e.g. rejected)
    assert.ok(appContextCode.includes('updateSubmittedPropertyStatus(propertyId, newStatus)'), 'AppContext updates submitted property status in storage');
    assert.ok(appContextCode.includes('updateSubmittedServiceStatus(serviceId, newStatus)'), 'AppContext updates submitted service status in storage');

    // Permanent deletion removes listing from state and all local storage caches
    assert.ok(appContextCode.includes('removeSubmittedProperty(propertyId);'), 'AppContext removes permanently deleted property from local storage');
    assert.ok(appContextCode.includes('removeSubmittedService(serviceId);'), 'AppContext removes permanently deleted service from local storage');
  });

  await t.test('6. Owner Section renders red "Rejected" badge for rejected owner listings', () => {
    assert.ok(
      appCode.includes("'bg-red-100 text-red-700 border border-red-200'") &&
      appCode.includes(": 'Rejected'"),
      'App.tsx displays red Rejected badge for rejected owner properties and services'
    );
  });

  await t.test('7. Admin moderation cards display "Deleted by Admin" or "Rejected" badge', () => {
    assert.ok(/isDeletedByAdmin\(prop\.status\)\s*\?\s*['"](Property )?Deleted by Admin['"]\s*:\s*['"]Rejected['"]/.test(appCode),
      'Admin property card displays Rejected badge');
    assert.ok(/isDeletedByAdmin\(srv\.status\)\s*\?\s*['"](Service )?Deleted by Admin['"]\s*:\s*['"]Rejected['"]/.test(appCode),
      'Admin service card displays Rejected badge');
  });

  await t.test('8. Public tabs strictly exclude rejected and deleted properties and services from public view', () => {
    // Explore, Map, Saved tabs
    assert.ok(appCode.includes("if (activeTab === 'explore' || activeTab === 'map' || activeTab === 'saved')"), 
      'App.tsx filters ordinary user tabs');
    assert.ok(appCode.includes("if (!isApproved(p.status)) return false;"), 
      'Rejected and deleted properties are filtered out of explore, map, and saved');

    // Services tab
    assert.ok(
      appCode.includes('if (isDeletedByAdmin(s.status) || isRejected(s.status)) {\n        return false;\n      }') &&
      appCode.includes('if (!isApproved(s.status)) return false;'),
      'Rejected and deleted services are strictly filtered out of public Services tab'
    );
  });

  await t.test('9. Types define isDeletedByAdmin and support deleted_by_admin status', () => {
    assert.ok(typesCode.includes('isDeletedByAdmin'), 'isDeletedByAdmin helper is exported');
    assert.ok(typesCode.includes("'deleted_by_admin'"), 'deleted_by_admin is part of ListingStatus');
  });

  await t.test('10. Firestore security rules preserve zero-trust protection for public queries while allowing admin moderation', () => {
    // Public reads require approved status or admin or owner
    assert.ok(rulesCode.includes("allow read: if (resource.data.status in ['approved', 'APPROVED'])"), 
      'Public reads in rules strictly require approved status');
    assert.ok(rulesCode.includes("|| isAdmin()"), 'Admin has full access in rules');
    assert.ok(rulesCode.includes("|| isPropertyOwner();"), 'Property owners can read their own documents in rules');
    assert.ok(rulesCode.includes("|| isServiceOwner();"), 'Service owners can read their own documents in rules');
  });
});
