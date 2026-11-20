import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appCode = fs.readFileSync('src/App.tsx', 'utf8');
const gridCode = fs.readFileSync('src/components/ServiceCategoryGrid.tsx', 'utf8');
const appContextCode = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
const propServiceCode = fs.readFileSync('src/firebase/propertiesService.ts', 'utf8');
const servServiceCode = fs.readFileSync('src/firebase/servicesService.ts', 'utf8');
const rulesCode = fs.readFileSync('firestore.rules', 'utf8');

test('Property & Home Services Status Handling and Permanent Deletion Verification', async (t) => {
  await t.test('1. Rejected listings stay visible in Owner Panel with a red Rejected label', () => {
    // Owner panel property list keeps rejected items (only excludes deleted_by_admin)
    assert.ok(
      appCode.includes('const myProperties = useMemo(() => {\n    return properties.filter(p => isPropertyOwner(p) && !isDeletedByAdmin(p.status));'),
      'myProperties keeps rejected properties visible to the owner'
    );
    // Owner panel service list keeps rejected items (only excludes deleted_by_admin)
    assert.ok(
      appCode.includes('const myOwnerServices = services.filter(s => isServiceOwner(s) && !isDeletedByAdmin(s.status));'),
      'myOwnerServices keeps rejected services visible to the owner'
    );
    // Red Rejected label rendered in both My Properties and My Home Services
    const redRejectedBadgeMatches = appCode.match(/'bg-red-100 text-red-700 border border-red-200'/g) || [];
    assert.ok(
      redRejectedBadgeMatches.length >= 2,
      'Owner panel renders red Rejected badge styling for both My Properties and My Home Services'
    );
    assert.ok(
      appCode.includes("? 'Pending Approval'\n                                    : 'Rejected'") &&
      appCode.includes("? 'Pending Approval'\n                                        : 'Rejected'"),
      'Owner panel displays exact "Rejected" label for rejected properties and services'
    );
  });

  await t.test('2. Rejected listings are completely hidden from public Rentals and Home Services (including subcategories)', () => {
    // Public Rentals
    assert.ok(
      appCode.includes('if (isDeletedByAdmin(p.status) || isRejected(p.status)) {\n        return false;\n      }'),
      'filteredProperties excludes rejected and deleted properties'
    );
    assert.ok(
      appCode.includes('if (found && !isDeletedByAdmin(found.status) && (isApproved(found.status) || isAdminAuthenticated || isPropertyOwner(found)))'),
      'Direct shared property link blocks rejected/unapproved listings from public viewers'
    );
    // Public Home Services & Category Grid
    assert.ok(
      appCode.includes('if (isDeletedByAdmin(s.status) || isRejected(s.status)) {\n        return false;\n      }') &&
      appCode.includes('if (!isApproved(s.status)) return false;'),
      'filteredServices strictly hides rejected and non-approved services from public view'
    );
    assert.ok(
      appCode.includes('if (isDeletedByAdmin(s.status) || isRejected(s.status)) return false;'),
      'servicesForCategoryGrid strictly hides rejected and deleted services'
    );
    // Subcategory list in ServiceCategoryGrid
    assert.ok(
      gridCode.includes('if (isDeletedByAdmin(service.status) || isRejected(service.status)) return false;') &&
      gridCode.includes('if (!isApproved(service.status)) return false;'),
      'ServiceCategoryGrid dedicatedProviders strictly hides rejected and non-approved services'
    );
  });

  await t.test('3. Property deletion by owner or admin permanently deletes properties, property_secrets, and property_edit_tokens', () => {
    const deleteFnStart = propServiceCode.indexOf('export const deletePropertyFromFirestore');
    const deleteFnEnd = propServiceCode.indexOf('export const saveOwnerProfileToFirestore');
    assert.ok(deleteFnStart > -1 && deleteFnEnd > deleteFnStart, 'Located deletePropertyFromFirestore');
    const deleteFn = propServiceCode.slice(deleteFnStart, deleteFnEnd);

    // Must NOT soft-mark deleted_by_admin anymore
    assert.ok(
      !deleteFn.includes("status: 'deleted_by_admin'"),
      'deletePropertyFromFirestore must permanently delete instead of soft-marking status: deleted_by_admin'
    );
    // Admin path deletes all 3 collections
    assert.ok(
      deleteFn.includes('batch.delete(docRef)') &&
      deleteFn.includes('batch.delete(secretRef)') &&
      deleteFn.includes('batch.delete(doc(db!, PROPERTY_EDIT_TOKENS_COLLECTION, tok))') &&
      deleteFn.includes("where('propertyId', '==', propertyId)"),
      'Admin property delete atomically deletes property doc, secret doc, and all matching edit-token docs'
    );
    // Owner path atomically deletes all 3 collections
    assert.ok(
      deleteFn.includes('const tokenRef = doc(db, PROPERTY_EDIT_TOKENS_COLLECTION, cleanToken);') &&
      deleteFn.includes('batch.delete(tokenRef);'),
      'Owner property delete atomically deletes property doc, secret doc, and edit-token doc'
    );
    // Cleans up correct local storage submitted key (gondia_stay_my_submitted_properties)
    assert.ok(
      deleteFn.includes("'gondia_stay_my_submitted_properties'") &&
      deleteFn.includes('DELETED_PROPERTIES_KEY') &&
      deleteFn.includes('gondia_stay_listing_tokens') &&
      deleteFn.includes('gondia_stay_my_property_ids'),
      'deletePropertyFromFirestore cleans up all local storage caches including gondia_stay_my_submitted_properties'
    );
  });

  await t.test('4. Service deletion by owner or admin permanently deletes services, service_secrets, and service_edit_tokens', () => {
    const deleteFnStart = servServiceCode.indexOf('export const deleteServiceInFirestore');
    const deleteFnEnd = servServiceCode.indexOf('export const fetchServiceByEditToken');
    assert.ok(deleteFnStart > -1 && deleteFnEnd > deleteFnStart, 'Located deleteServiceInFirestore');
    const deleteFn = servServiceCode.slice(deleteFnStart, deleteFnEnd);

    // Must NOT soft-mark deleted_by_admin anymore
    assert.ok(
      !deleteFn.includes("status: 'deleted_by_admin'"),
      'deleteServiceInFirestore must permanently delete instead of soft-marking status: deleted_by_admin'
    );
    // Admin path deletes all 3 collections
    assert.ok(
      deleteFn.includes('batch.delete(srvRef)') &&
      deleteFn.includes('batch.delete(secretRef)') &&
      deleteFn.includes('batch.delete(doc(db!, SERVICE_EDIT_TOKENS_COLLECTION, tok))') &&
      deleteFn.includes("where('serviceId', '==', serviceId)"),
      'Admin service delete atomically deletes service doc, secret doc, and all matching edit-token docs'
    );
    // Owner path atomically deletes all 3 collections
    assert.ok(
      deleteFn.includes('const tokenRef = doc(db, SERVICE_EDIT_TOKENS_COLLECTION, cleanToken);') &&
      deleteFn.includes('batch.delete(tokenRef);'),
      'Owner service delete atomically deletes service doc, secret doc, and edit-token doc'
    );
    // Cleans up all local storage caches
    assert.ok(
      deleteFn.includes("'gondia_stay_my_submitted_services'") &&
      deleteFn.includes('DELETED_SERVICES_KEY') &&
      deleteFn.includes('gondia_stay_service_tokens') &&
      deleteFn.includes('gondia_stay_my_service_ids'),
      'deleteServiceInFirestore cleans up all local storage caches including gondia_stay_my_submitted_services'
    );
  });

  await t.test('5. Deleted listings never reappear after refresh or on any device (cross-device listener + local cache purge)', () => {
    // Property cross-device deletion detection when token/property doc is permanently deleted
    assert.ok(
      propServiceCode.includes('isLiveApprovedPropertyInFirestore') &&
      propServiceCode.includes("onStatusUpdate(propertyId, liveApproved ? 'approved' : 'deleted')") &&
      propServiceCode.includes("onStatusUpdate(propId, 'deleted')"),
      'subscribeToOwnerPropertiesStatus detects permanent deletion on token/property removal while protecting live approved properties'
    );
    // Service cross-device deletion detection
    assert.ok(
      servServiceCode.includes('isLiveApprovedInFirestore') &&
      servServiceCode.includes("onStatusUpdate(serviceId, 'deleted')") &&
      servServiceCode.includes("onStatusUpdate(srvId, 'deleted')"),
      'subscribeToOwnerServicesStatus detects permanent deletion on token/service removal while protecting live approved services'
    );
    // AppContext prevents resurrection on refresh & admin authoritative snapshot sync
    assert.ok(
      appContextCode.includes('getDeletedPropertyIds') &&
      appContextCode.includes('DELETED_PROPERTIES_KEY') &&
      appContextCode.includes('DELETED_SERVICES_KEY') &&
      appContextCode.includes('remoteApprovedPropertyIdsRef') &&
      appContextCode.includes('remoteApprovedServiceIdsRef'),
      'AppContext tracks deleted IDs and live approved IDs for both properties and services'
    );
    // Admin delete removes from state instead of setting deleted_by_admin
    assert.ok(
      !appContextCode.includes("updateSubmittedPropertyStatus(propertyId, 'deleted_by_admin')") &&
      !appContextCode.includes("updateSubmittedServiceStatus(serviceId, 'deleted_by_admin')"),
      'AppContext permanently removes deleted listings rather than storing deleted_by_admin placeholders'
    );
  });

  await t.test('6. Existing Firestore security rules remain intact and strictly protect delete permissions', () => {
    assert.ok(
      rulesCode.includes('allow delete: if isAdmin() || isPropertyOwner() || hasValidPropertyDeleteToken();'),
      'properties delete rule strictly requires admin, owner, or valid atomic edit-token delete'
    );
    assert.ok(
      rulesCode.includes('allow delete: if isAdmin() || !existsAfter(/databases/$(database)/documents/properties/$(propertyId));'),
      'property_secrets delete rule strictly requires admin or atomic deletion of parent property'
    );
    assert.ok(
      rulesCode.includes('allow delete: if isAdmin() || isServiceOwner() || hasValidServiceDeleteToken();'),
      'services delete rule strictly requires admin, owner, or valid atomic edit-token delete'
    );
    assert.ok(
      rulesCode.includes('allow delete: if isAdmin() || !existsAfter(/databases/$(database)/documents/services/$(serviceId));'),
      'service_secrets delete rule strictly requires admin or atomic deletion of parent service'
    );
    assert.ok(
      rulesCode.includes("allow read: if (resource.data.status in ['approved', 'APPROVED'])"),
      'Public read rules strictly restrict reads to approved listings'
    );
  });
});
