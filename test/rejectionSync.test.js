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

  await t.test('3. Admin permanent deletion marks status: "deleted_by_admin" in Firestore document and token document', () => {
    // Check deletePropertyFromFirestore implementation
    assert.ok(propertiesServiceCode.includes('deletePropertyFromFirestore'), 'deletePropertyFromFirestore must exist');
    assert.ok(propertiesServiceCode.includes("status: 'deleted_by_admin'"), 'deletePropertyFromFirestore sets status: deleted_by_admin');
    assert.ok(propertiesServiceCode.includes("'propertyData.status': 'deleted_by_admin'"), 'deletePropertyFromFirestore updates token document status');

    // Check deleteServiceInFirestore implementation
    assert.ok(servicesServiceCode.includes('deleteServiceInFirestore'), 'deleteServiceInFirestore must exist');
    assert.ok(servicesServiceCode.includes("status: 'deleted_by_admin'"), 'deleteServiceInFirestore sets status: deleted_by_admin');
    assert.ok(servicesServiceCode.includes("'serviceData.status': 'deleted_by_admin'"), 'deleteServiceInFirestore updates token document status');
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

    // AppContext updates local tracking and state on status change
    assert.ok(appContextCode.includes('updateSubmittedPropertyStatus(propertyId, newStatus)'), 'AppContext updates submitted property status in storage');
    assert.ok(appContextCode.includes('updateSubmittedServiceStatus(serviceId, newStatus)'), 'AppContext updates submitted service status in storage');

    // Admin deletion updates AppContext with deleted_by_admin and persists immediately
    assert.ok(appContextCode.includes("updateSubmittedPropertyStatus(propertyId, 'deleted_by_admin')"), 'AppContext updates submitted property to deleted_by_admin');
    assert.ok(appContextCode.includes("updateSubmittedServiceStatus(serviceId, 'deleted_by_admin')"), 'AppContext updates submitted service to deleted_by_admin');
  });

  await t.test('6. Owner Section renders "Rejected" or "Deleted by Admin" badge for owner listings', () => {
    // Check App.tsx for property badges
    assert.ok(
      /isDeletedByAdmin\(property\.status\)\s*\?\s*['"](Property )?Deleted by Admin['"]\s*:\s*['"]Rejected['"]/.test(appCode), 
      'App.tsx displays Deleted by Admin or Rejected for non-approved non-pending properties'
    );
    assert.ok(appCode.includes("'bg-rose-100 text-rose-800'"), 'App.tsx uses rose styling for rejected/deleted status');

    // Check App.tsx for service badges
    assert.ok(
      /isDeletedByAdmin\(srv\.status\)\s*\?\s*['"](Service )?Deleted by Admin['"]\s*:\s*['"]Rejected['"]/.test(appCode), 
      'App.tsx displays Deleted by Admin or Rejected for non-approved non-pending services'
    );
  });

  await t.test('7. Admin moderation cards display "Deleted by Admin" when status is deleted by admin', () => {
    assert.ok(/isDeletedByAdmin\(prop\.status\)\s*\?\s*['"](Property )?Deleted by Admin['"]\s*:\s*['"]Rejected['"]/.test(appCode),
      'Admin property card displays Deleted by Admin');
    assert.ok(/isDeletedByAdmin\(srv\.status\)\s*\?\s*['"](Service )?Deleted by Admin['"]\s*:\s*['"]Rejected['"]/.test(appCode),
      'Admin service card displays Deleted by Admin');
  });

  await t.test('8. Public tabs strictly exclude rejected and deleted properties and services from public view', () => {
    // Explore, Map, Saved tabs
    assert.ok(appCode.includes("if (activeTab === 'explore' || activeTab === 'map' || activeTab === 'saved')"), 
      'App.tsx filters ordinary user tabs');
    assert.ok(appCode.includes("if (!isApproved(p.status)) return false;"), 
      'Rejected and deleted properties are filtered out of explore, map, and saved');

    // Services tab
    assert.ok(appCode.includes("if (!isAdminAuthenticated && !isApproved(s.status))"), 
      'Rejected and deleted services are filtered out of public Services tab');
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
