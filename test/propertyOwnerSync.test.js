import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const propertiesServiceSrc = fs.readFileSync('src/firebase/propertiesService.ts', 'utf8');
const appContextSrc = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
const addPropertyModalSrc = fs.readFileSync('src/components/AddPropertyModal.tsx', 'utf8');
const appSrc = fs.readFileSync('src/App.tsx', 'utf8');

// Mirror the pure synchronization logic from propertiesService.ts to run deterministic unit tests
const GENERIC_OWNER_IDS = new Set(['owner_unauthenticated', 'owner_gondia_primary']);

function isValidUniqueOwnerId(ownerId) {
  if (!ownerId || typeof ownerId !== 'string') return false;
  const trimmed = ownerId.trim();
  return trimmed.length > 0 && !GENERIC_OWNER_IDS.has(trimmed);
}

function normalizeOwnerPhoneDigits(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

function synchronizePropertyWithOwner(property, ownersById) {
  if (!property || !isValidUniqueOwnerId(property.ownerId)) {
    return property;
  }

  const owner = ownersById[property.ownerId];
  if (!owner || !isValidUniqueOwnerId(owner.id) || owner.id !== property.ownerId) {
    return property;
  }

  const ownerName = owner.name?.trim() || '';
  const ownerPhone = owner.phone?.trim() || '';
  const ownerWhatsapp = (owner.whatsappNumber || owner.phone)?.trim() || '';

  if (!ownerName && !ownerPhone && !ownerWhatsapp) {
    return property;
  }

  const ownerUpdatedAt = typeof owner.updatedAt === 'number' ? owner.updatedAt : 0;
  const propUpdatedAt = typeof property.updatedAt === 'number'
    ? property.updatedAt
    : (typeof property.createdAt === 'number' ? property.createdAt : 0);
  const isOwnerNewerOrEqual = ownerUpdatedAt > 0 && ownerUpdatedAt >= propUpdatedAt;

  const currentName = property.ownerName?.trim() || '';
  const currentPhone = property.ownerPhone?.trim() || '';
  const currentWhatsapp = (property.ownerWhatsappNumber || property.ownerPhone)?.trim() || '';

  const nextOwnerName = (!currentName || isOwnerNewerOrEqual) && ownerName
    ? ownerName
    : property.ownerName;
  const nextOwnerPhone = (!currentPhone || isOwnerNewerOrEqual) && ownerPhone
    ? ownerPhone
    : property.ownerPhone;
  const nextOwnerWhatsapp = (!currentWhatsapp || isOwnerNewerOrEqual) && ownerWhatsapp
    ? ownerWhatsapp
    : (property.ownerWhatsappNumber || nextOwnerPhone);

  if (
    nextOwnerName === property.ownerName &&
    nextOwnerPhone === property.ownerPhone &&
    nextOwnerWhatsapp === property.ownerWhatsappNumber
  ) {
    return property;
  }

  return {
    ...property,
    ownerName: nextOwnerName,
    ownerPhone: nextOwnerPhone,
    ownerWhatsappNumber: nextOwnerWhatsapp
  };
}

test('Property-Owner Synchronization - pure isolation & auto-update behavior', async (t) => {
  await t.test('1. Rejects generic/empty owner IDs and never mixes owner details', () => {
    assert.equal(isValidUniqueOwnerId(''), false);
    assert.equal(isValidUniqueOwnerId(null), false);
    assert.equal(isValidUniqueOwnerId('owner_unauthenticated'), false);
    assert.equal(isValidUniqueOwnerId('owner_gondia_primary'), false);
    assert.equal(isValidUniqueOwnerId('owner_gondia_abc123'), true);
    assert.equal(isValidUniqueOwnerId('uid_owner_A'), true);

    const genericProp = {
      id: 'prop_generic',
      ownerId: 'owner_unauthenticated',
      ownerName: 'Original Landlord',
      ownerPhone: '9811111111',
      ownerWhatsappNumber: '9811111111',
      updatedAt: 1000
    };
    const ownersById = {
      owner_unauthenticated: { id: 'owner_unauthenticated', name: 'Wrong Owner', phone: '9999999999', updatedAt: 5000 }
    };
    const result = synchronizePropertyWithOwner(genericProp, ownersById);
    assert.equal(result.ownerName, 'Original Landlord');
    assert.equal(result.ownerPhone, '9811111111');
  });

  await t.test('2. Synchronizes each property strictly with its own ownerId when owner changes name/phone', () => {
    const propA = {
      id: 'prop_A',
      ownerId: 'uid_owner_A',
      ownerName: 'Ramesh Old',
      ownerPhone: '9811111111',
      ownerWhatsappNumber: '9811111111',
      updatedAt: 1000
    };
    const propB = {
      id: 'prop_B',
      ownerId: 'uid_owner_B',
      ownerName: 'Suresh Original',
      ownerPhone: '9822222222',
      ownerWhatsappNumber: '9822222222',
      updatedAt: 1000
    };

    const ownersById = {
      uid_owner_A: {
        id: 'uid_owner_A',
        name: 'Ramesh Updated',
        phone: '9833333333',
        whatsappNumber: '9833333333',
        updatedAt: 2000
      },
      uid_owner_B: {
        id: 'uid_owner_B',
        name: 'Suresh Original',
        phone: '9822222222',
        whatsappNumber: '9822222222',
        updatedAt: 1000
      }
    };

    const syncedA = synchronizePropertyWithOwner(propA, ownersById);
    const syncedB = synchronizePropertyWithOwner(propB, ownersById);

    assert.equal(syncedA.ownerName, 'Ramesh Updated');
    assert.equal(syncedA.ownerPhone, '9833333333');
    assert.equal(syncedA.ownerWhatsappNumber, '9833333333');

    // Owner B's property must never be mixed with Owner A's details
    assert.equal(syncedB.ownerName, 'Suresh Original');
    assert.equal(syncedB.ownerPhone, '9822222222');
    assert.equal(syncedB.ownerWhatsappNumber, '9822222222');
  });

  await t.test('3. Preserves newer property-level edit when owner document is older', () => {
    const propA = {
      id: 'prop_A',
      ownerId: 'uid_owner_A',
      ownerName: 'Ramesh Caretaker',
      ownerPhone: '9844444444',
      ownerWhatsappNumber: '9844444444',
      updatedAt: 5000
    };
    const ownersById = {
      uid_owner_A: {
        id: 'uid_owner_A',
        name: 'Ramesh Stale',
        phone: '9811111111',
        whatsappNumber: '9811111111',
        updatedAt: 2000
      }
    };

    const synced = synchronizePropertyWithOwner(propA, ownersById);
    assert.equal(synced.ownerName, 'Ramesh Caretaker');
    assert.equal(synced.ownerPhone, '9844444444');
  });

  await t.test('4. Fills missing property ownerName/ownerPhone from matching owner record', () => {
    const propMissing = {
      id: 'prop_missing',
      ownerId: 'uid_owner_C',
      ownerName: '',
      ownerPhone: '',
      ownerWhatsappNumber: '',
      updatedAt: 5000
    };
    const ownersById = {
      uid_owner_C: {
        id: 'uid_owner_C',
        name: 'Mahesh Verma',
        phone: '9855555555',
        whatsappNumber: '9855555555',
        updatedAt: 1000
      }
    };

    const synced = synchronizePropertyWithOwner(propMissing, ownersById);
    assert.equal(synced.ownerName, 'Mahesh Verma');
    assert.equal(synced.ownerPhone, '9855555555');
    assert.equal(synced.ownerWhatsappNumber, '9855555555');
  });

  await t.test('5. Phone digit normalization matches formatted Indian mobile numbers accurately', () => {
    assert.equal(normalizeOwnerPhoneDigits('+91 98111-11111'), '9811111111');
    assert.equal(normalizeOwnerPhoneDigits('09811111111'), '9811111111');
    assert.equal(normalizeOwnerPhoneDigits('9811111111'), '9811111111');
    assert.notEqual(normalizeOwnerPhoneDigits('9811111111'), normalizeOwnerPhoneDigits('9822222222'));
  });
});

test('Firestore & App Wiring - Property Owner Name & Phone Synchronization', async (t) => {
  await t.test('1. propertiesService exports dedicated owner contact Firestore sync & /owners subscription', () => {
    assert.ok(propertiesServiceSrc.includes('export const syncPropertyOwnerContactInFirestore'), 'Exports syncPropertyOwnerContactInFirestore');
    assert.ok(propertiesServiceSrc.includes('export const subscribeToFirestoreOwners'), 'Exports subscribeToFirestoreOwners');
    assert.ok(propertiesServiceSrc.includes('export const synchronizePropertyWithOwner'), 'Exports synchronizePropertyWithOwner');
    assert.ok(propertiesServiceSrc.includes('export const synchronizePropertiesWithOwners'), 'Exports synchronizePropertiesWithOwners');
    assert.ok(
      propertiesServiceSrc.includes('if (existingData && isValidUniqueOwnerId(existingData.ownerId) && existingData.ownerId !== expectedOwnerId)'),
      'Refuses Firestore owner contact sync when document ownerId does not match expectedOwnerId'
    );
  });

  await t.test('2. AppContext subscribes to /owners, syncs selectedProperty reactively, and syncs only matching ownerId properties on profile change', () => {
    assert.ok(appContextSrc.includes('subscribeToFirestoreOwners((remoteOwners) => {'), 'Subscribes to Firestore /owners collection');
    assert.ok(appContextSrc.includes('synchronizePropertiesWithOwners(prev, remoteOwners)'), 'Automatically re-synchronizes properties when /owners changes');
    assert.ok(appContextSrc.includes('const latest = properties.find(p => p.id === prev.id);'), 'Automatically updates selectedProperty when properties change');
    assert.ok(appContextSrc.includes('await syncPropertyOwnerContactInFirestore('), 'updateOwnerProfile syncs matching properties to Firestore via syncPropertyOwnerContactInFirestore');
    assert.ok(appContextSrc.includes('myListingTokens[prop.id]'), 'Passes property edit token when syncing zero-login owner contact updates');
    assert.ok(
      appContextSrc.includes('const ownerPropsToSync = isValidUniqueOwnerId(updated.id)\n      ? properties.filter(p => p.ownerId === updated.id)\n      : [];'),
      'Strictly restricts profile contact propagation to exact matching valid ownerId'
    );
  });

  await t.test('3. AddPropertyModal and App.tsx prevent mixing different owners on create/edit', () => {
    assert.ok(addPropertyModalSrc.includes('const isDifferentOwnerPhone = Boolean('), 'AddPropertyModal detects when a different owner phone is entered');
    assert.ok(addPropertyModalSrc.includes('const isOwnEditableListing = Boolean('), 'AddPropertyModal guards owner profile update on property edit');
    assert.ok(
      addPropertyModalSrc.includes('if (!isAdmin && !isDifferentOwnerPhone && actualOwnerId === currentOwner?.id && ownerName.trim() && ownerPhone.trim())'),
      'AddPropertyModal only updates currentOwner when creating a listing for the same owner'
    );
    assert.ok(!appSrc.includes("ownerId: 'owner_unauthenticated'"), 'App.tsx inline form no longer assigns shared owner_unauthenticated placeholder');
    assert.ok(
      appSrc.includes('newlyCreatedLinkInfo.ownerName || formData.ownerName'),
      'Private link modal uses the submitted property owner name instead of falling back to currentOwner'
    );
  });
});
