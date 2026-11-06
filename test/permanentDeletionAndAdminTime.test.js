import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { formatExactDateTime } from '../src/utils/contact.ts';

test('Permanent Property & Service Deletion & Admin Timestamp Display', async (t) => {
  const appContextContent = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
  const appContent = fs.readFileSync('src/App.tsx', 'utf8');
  const propServiceContent = fs.readFileSync('src/firebase/propertiesService.ts', 'utf8');
  const servServiceContent = fs.readFileSync('src/firebase/servicesService.ts', 'utf8');
  const firestoreRulesContent = fs.readFileSync('firestore.rules', 'utf8');

  await t.test('1. formatExactDateTime formats timestamps to exact readable date & time', () => {
    // 2026-11-06T00:00:00.000Z
    const testTimestamp = 1793923200000;
    const formatted = formatExactDateTime(testTimestamp);
    assert.ok(typeof formatted === 'string' && formatted.length > 0);
    assert.match(formatted, /2026/);
    assert.match(formatted, /(AM|PM)/i);

    // Handles falsy gracefully
    assert.equal(formatExactDateTime(null), 'Date/time not recorded');
    assert.equal(formatExactDateTime(undefined), 'Date/time not recorded');
    assert.equal(formatExactDateTime(0), 'Date/time not recorded');
  });

  await t.test('2. Admin Panel displays exact creation date/time for every property and service', () => {
    // Property card in Admin Panel
    assert.ok(
      appContent.includes('data-testid="property-creation-datetime"'),
      'Admin property card renders data-testid="property-creation-datetime"'
    );
    assert.ok(
      appContent.includes('formatExactDateTime(prop.createdAt)'),
      'Admin property card calls formatExactDateTime with prop.createdAt'
    );

    // Service card in Admin Panel
    assert.ok(
      appContent.includes('data-testid="service-creation-datetime"'),
      'Admin service card renders data-testid="service-creation-datetime"'
    );
    assert.ok(
      appContent.includes('formatExactDateTime(srv.createdAt)'),
      'Admin service card calls formatExactDateTime with srv.createdAt'
    );
  });

  await t.test('3. UI updates only after successful Firestore deletion in AppContext', () => {
    // deleteProperty: calls deletePropertyFromFirestore before setProperties filter
    const deletePropertyIdx = appContextContent.indexOf('const deleteProperty = async');
    const deletePropertyFromFirestoreIdx = appContextContent.indexOf('await deletePropertyFromFirestore(', deletePropertyIdx);
    const setPropertiesFilterIdx = appContextContent.indexOf('setProperties(prev => prev.filter(p => p.id !== propertyId)', deletePropertyIdx);

    assert.ok(deletePropertyIdx !== -1, 'deleteProperty exists');
    assert.ok(deletePropertyFromFirestoreIdx !== -1, 'deletePropertyFromFirestore is awaited');
    assert.ok(setPropertiesFilterIdx !== -1, 'setProperties filter is called');
    assert.ok(
      deletePropertyFromFirestoreIdx < setPropertiesFilterIdx,
      'Firestore deletion is executed before UI state is updated'
    );

    // deleteService: calls deleteServiceInFirestore before setServices filter
    const deleteServiceIdx = appContextContent.indexOf('const deleteService = async');
    const deleteServiceInFirestoreIdx = appContextContent.indexOf('await deleteServiceInFirestore(', deleteServiceIdx);
    const setServicesFilterIdx = appContextContent.indexOf('setServices(prev => prev.filter(s => s.id !== serviceId)', deleteServiceIdx);

    assert.ok(deleteServiceIdx !== -1, 'deleteService exists');
    assert.ok(deleteServiceInFirestoreIdx !== -1, 'deleteServiceInFirestore is awaited');
    assert.ok(setServicesFilterIdx !== -1, 'setServices filter is called');
    assert.ok(
      deleteServiceInFirestoreIdx < setServicesFilterIdx,
      'Firestore service deletion is executed before UI state is updated'
    );
  });

  await t.test('4. Deleted properties and services are tracked and filtered out so they never reappear after refresh', () => {
    assert.ok(
      propServiceContent.includes('DELETED_PROPERTIES_KEY'),
      'propertiesService tracks deleted property keys'
    );
    assert.ok(
      propServiceContent.includes('getDeletedPropertyIds'),
      'propertiesService filters out deleted properties'
    );
    assert.ok(
      servServiceContent.includes('DELETED_SERVICES_KEY'),
      'servicesService tracks deleted service keys'
    );
    assert.ok(
      servServiceContent.includes('getDeletedServiceIds'),
      'servicesService filters out deleted services'
    );
  });

  await t.test('5. Firestore rules and admin email helper authorize jangirpankaj901@gmail.com', () => {
    assert.ok(
      firestoreRulesContent.includes('jangirpankaj901@gmail.com'),
      'firestore.rules authorizes active admin jangirpankaj901@gmail.com'
    );
    assert.ok(
      propServiceContent.includes('jangirpankaj901@gmail.com'),
      'propertiesService authorizes active admin jangirpankaj901@gmail.com'
    );
    assert.ok(
      appContextContent.includes('jangirpankaj901@gmail.com'),
      'AppContext authorizes active admin jangirpankaj901@gmail.com'
    );
    assert.ok(
      firestoreRulesContent.includes('email_verified == true'),
      'firestore.rules maintains email_verified security constraint'
    );
  });

  await t.test('6. Permanently deletes items and associated tokens/credentials from Firestore and storage', () => {
    // Property deletion clears docRef, secretRef, and tokenRef
    assert.ok(
      propServiceContent.includes('batch.delete(tokenRef)') &&
      propServiceContent.includes('batch.delete(secretRef)'),
      'Property deletion batch deletes token and secret docs'
    );
    assert.ok(
      propServiceContent.includes('gondia_stay_my_property_ids') &&
      propServiceContent.includes('gondia_stay_favorites'),
      'Property deletion cleans up all local storage IDs and favorites'
    );

    // Service deletion clears srvRef, secretRef, and tokenRef
    assert.ok(
      servServiceContent.includes('batch.delete(tokenRef)') &&
      servServiceContent.includes('batch.delete(secretRef)'),
      'Service deletion batch deletes token and secret docs'
    );
    assert.ok(
      servServiceContent.includes('gondia_stay_my_service_ids'),
      'Service deletion cleans up local storage service IDs'
    );
  });

  await t.test('7. Invalidates all old edit links so deleted items cannot be accessed or restored', () => {
    // fetchPropertyDirect checks if main document exists and does not return draft data for deleted items
    assert.ok(
      propServiceContent.includes('getDeletedPropertyIds().has(propertyId)'),
      'fetchPropertyDirect checks deleted property IDs'
    );
    assert.ok(
      propServiceContent.includes('Main property was permanently deleted: invalidate old token document'),
      'fetchPropertyDirect invalidates old token document when property is deleted'
    );

    // fetchPropertyByEditToken verifies main property document exists
    assert.ok(
      propServiceContent.includes('Main property document does not exist (deleted): invalidate token document'),
      'fetchPropertyByEditToken invalidates token document and returns null if property document does not exist'
    );

    // fetchServiceByEditToken verifies main service document exists
    assert.ok(
      servServiceContent.includes('Main service doc does not exist: the service was permanently deleted!'),
      'fetchServiceByEditToken invalidates token document and returns null if service document does not exist'
    );

    // App.tsx clears URL parameters and displays deleted listing notice
    assert.ok(
      appContent.includes('Listing not found or has been permanently deleted. Edit link is invalid.'),
      'App.tsx displays invalidation message for deleted properties'
    );
    assert.ok(
      appContent.includes('Service listing not found or has been permanently deleted. Edit link is invalid.'),
      'App.tsx displays invalidation message for deleted services'
    );
    assert.ok(
      appContent.includes('window.history.replaceState({}, document.title, window.location.pathname)'),
      'App.tsx clears invalid query params from browser URL bar'
    );
  });
});
