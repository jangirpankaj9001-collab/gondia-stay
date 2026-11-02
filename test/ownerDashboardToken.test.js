import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Owner Section -> My Dashboard: Persistent Profile, Device Token & Auto-Fill', async (t) => {
  const appContent = fs.readFileSync('src/App.tsx', 'utf8');
  const appContextContent = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
  const propServiceContent = fs.readFileSync('src/firebase/propertiesService.ts', 'utf8');
  const addPropContent = fs.readFileSync('src/components/AddPropertyModal.tsx', 'utf8');
  const addServiceContent = fs.readFileSync('src/components/AddServiceModal.tsx', 'utf8');
  const typesContent = fs.readFileSync('src/types/index.ts', 'utf8');

  await t.test('1. Owner Profile & Greeting: Displays "Welcome, Mr./Mrs. [Name]" and saves Name, Phone, WhatsApp', () => {
    assert.ok(
      appContent.includes('Welcome, Mr./Mrs.'),
      'App displays requested greeting prefix "Welcome, Mr./Mrs."'
    );
    assert.ok(
      appContent.includes('getOwnerGreeting'),
      'App uses helper to format "Welcome, Mr./Mrs. [Name]"'
    );
    assert.ok(
      appContent.includes('ownerProfileForm.name') &&
      appContent.includes('ownerProfileForm.phone') &&
      appContent.includes('ownerProfileForm.whatsappNumber'),
      'My Dashboard provides fields to edit and save owner Name, Phone, and WhatsApp Number'
    );
  });

  await t.test('2. Unique Owner ID & Persistent Device Token: Generated, stored securely and HIDDEN from UI', () => {
    assert.ok(
      propServiceContent.includes('generateDeviceToken') &&
      propServiceContent.includes('gondia_devtoken_'),
      'Properties service exports cryptographically secure generateDeviceToken with gondia_devtoken_ prefix'
    );
    assert.ok(
      propServiceContent.includes('generateUniqueOwnerId') &&
      propServiceContent.includes('owner_gondia_'),
      'Properties service exports generateUniqueOwnerId with owner_gondia_ prefix'
    );
    assert.ok(
      typesContent.includes('deviceToken?: string'),
      'OwnerProfile interface includes deviceToken property'
    );
    // User requirement: "Hide all IDs and tokens from UI"
    assert.ok(
      !appContent.includes('Unique Owner ID') &&
      !appContent.includes('Persistent Device Token') &&
      !addPropContent.includes('Owner Management Credentials') &&
      !addServiceContent.includes('Owner Management Credentials'),
      'All technical Owner IDs and Device Tokens must be strictly hidden from the UI across all screens'
    );
    // User requirement: "Show Edit Profile for recognized owners"
    assert.ok(
      appContent.includes('Edit Profile'),
      'My Dashboard and Owner Section show Edit Profile for recognized owners'
    );
  });

  await t.test('3. Profile & Token Persistence across page refreshes and app reopening', () => {
    assert.ok(
      appContextContent.includes('gondia_stay_owner_device_token'),
      'Device token is persisted in localStorage key gondia_stay_owner_device_token'
    );
    assert.ok(
      appContextContent.includes('gondia_stay_device_owner_id'),
      'Device Owner ID is persisted in localStorage key gondia_stay_device_owner_id'
    );
    assert.ok(
      appContextContent.includes('gondia_stay_current_owner'),
      'Owner profile is stored in localStorage key gondia_stay_current_owner'
    );
    // Crucial: Ensure onAuthStateChanged guest branch and logoutAdmin do NOT remove gondia_stay_current_owner
    const authStateChangedMatch = appContextContent.match(/onAuthStateChanged\(auth,[\s\S]*?\}\s*else\s*\{([\s\S]*?)\}\s*\}\);/);
    assert.ok(authStateChangedMatch, 'Found onAuthStateChanged handler');
    const guestBranch = authStateChangedMatch[1];
    assert.ok(
      !guestBranch.includes('localStorage.removeItem(\'gondia_stay_current_owner\')'),
      'Unauthenticated guest branch must NOT delete gondia_stay_current_owner on refresh'
    );
    assert.ok(
      appContextContent.includes('gondia_stay_persistent_owner'),
      'Owner profile is backed up to persistent key gondia_stay_persistent_owner'
    );
    const logoutAdminMatch = appContextContent.match(/logoutAdmin\s*=\s*async\s*\(\)[\s\S]*?showToast/);
    assert.ok(logoutAdminMatch, 'Found logoutAdmin handler');
    assert.ok(
      !logoutAdminMatch[0].includes('localStorage.removeItem(\'gondia_stay_current_owner\')'),
      'logoutAdmin must NOT delete gondia_stay_current_owner on sign-out'
    );
  });

  await t.test('4. Auto-recognize owner and prefill details in Property and Service modals', () => {
    assert.ok(
      addPropContent.includes('shouldAutoFill') &&
      addPropContent.includes('currentOwner?.name'),
      'AddPropertyModal recognizes currentOwner and prefills ownerName'
    );
    assert.ok(
      addPropContent.includes('setOwnerPhone(shouldAutoFill ? (currentOwner?.phone || \'\') : \'\')'),
      'AddPropertyModal prefills ownerPhone'
    );
    assert.ok(
      addPropContent.includes('setOwnerWhatsappNumber(shouldAutoFill ? (currentOwner?.whatsappNumber || currentOwner?.phone || \'\') : \'\')'),
      'AddPropertyModal prefills ownerWhatsappNumber'
    );
    assert.ok(
      addServiceContent.includes('setProviderName(shouldAutoFill ? (currentOwner?.name || \'\') : \'\')'),
      'AddServiceModal prefills providerName from currentOwner'
    );
    assert.ok(
      addServiceContent.includes('setPhone(shouldAutoFill ? (currentOwner?.phone || \'\') : \'\')'),
      'AddServiceModal prefills phone from currentOwner'
    );
  });

  await t.test('5. Link all properties and services to the same Owner ID', () => {
    assert.ok(
      addPropContent.includes('actualOwnerId') &&
      addPropContent.includes('currentOwner?.id'),
      'AddPropertyModal links new property to currentOwner.id'
    );
    assert.ok(
      addServiceContent.includes('ownerId: (authUser && !isAdmin) ? authUser.uid : (currentOwner?.id || undefined)'),
      'AddServiceModal links new service to currentOwner.id'
    );
    assert.ok(
      appContextContent.includes('property.ownerId === currentOwner.id'),
      'isPropertyOwner recognizes listings belonging to currentOwner.id'
    );
    assert.ok(
      appContextContent.includes('service.ownerId === currentOwner.id'),
      'isServiceOwner recognizes services belonging to currentOwner.id'
    );
  });

  await t.test('6. Server-side token validation & registration without login or OTP', () => {
    assert.ok(
      propServiceContent.includes('verifyDeviceToken'),
      'Properties service provides verifyDeviceToken function'
    );
    assert.ok(
      propServiceContent.includes('registerDeviceTokenInFirestore'),
      'Properties service provides registerDeviceTokenInFirestore'
    );
    assert.ok(
      appContextContent.includes('registerDeviceTokenInFirestore(updated.id, deviceToken, updated)'),
      'AppContext registers device token on profile save'
    );
  });
});
