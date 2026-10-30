import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rules = fs.readFileSync('firestore.rules', 'utf8');
const modal = fs.readFileSync('src/components/FirebaseModal.tsx', 'utf8');

test('firestore.rules - /owners/{ownerId} static check', () => {
  // Ensure public write access based on name & phone is completely removed
  assert.equal(
    rules.includes('request.resource.data.name is string && request.resource.data.phone is string'),
    false,
    'Public write access based on name/phone strings must be removed from firestore.rules'
  );

  // Ensure write requires isAdmin() or matching authenticated owner UID
  const expectedOwnerRule = `match /owners/{ownerId} {
      allow read: if true;
      allow write: if isAdmin() 
        || (request.auth != null && request.auth.uid == ownerId);
    }`;

  assert.ok(
    rules.includes(expectedOwnerRule),
    'firestore.rules must allow profile writes only by matching authenticated owner or verified admin'
  );
});

test('FirebaseModal.tsx - /owners/{ownerId} synchronization', () => {
  assert.equal(
    modal.includes('request.resource.data.name is string && request.resource.data.phone is string'),
    false,
    'Public write access based on name/phone strings must be removed from FirebaseModal.tsx'
  );

  const expectedModalOwnerRule = `match /owners/{ownerId} {
      allow read: if true;
      allow write: if isAdmin() 
        || (request.auth != null && request.auth.uid == ownerId);
    }`;

  assert.ok(
    modal.includes(expectedModalOwnerRule),
    'FirebaseModal.tsx rules text must match firestore.rules for /owners/{ownerId}'
  );
});

// Behavioral test for the owners rule logic
function evalOwnerWrite(ownerId, auth, requestData) {
  // 1. Check isAdmin()
  const isAdmin = auth != null
    && auth.token?.email != null
    && auth.token.email.toLowerCase() === 'jangirpankaj9001@gmail.com'
    && auth.token.email_verified === true;

  if (isAdmin) return { allowed: true, reason: 'admin' };

  // 2. Check matching authenticated owner
  if (auth != null && auth.uid === ownerId) {
    return { allowed: true, reason: 'matching_owner' };
  }

  // Any other caller is unauthorized
  return { allowed: false, reason: 'unauthorized' };
}

test('Unauthorized profile write - unauthenticated caller with name & phone strings is BLOCKED', () => {
  const result = evalOwnerWrite('owner_123', null, { name: 'Stranger', phone: '9876543210' });
  assert.equal(result.allowed, false, 'Unauthenticated profile write must be blocked even if name and phone are provided');
});

test('Unauthorized profile write - authenticated user writing to different owner profile is BLOCKED', () => {
  const callerAuth = { uid: 'user_456', token: { email: 'user456@gmail.com', email_verified: true } };
  const result = evalOwnerWrite('owner_123', callerAuth, { name: 'Attacker Tamper', phone: '9876543210' });
  assert.equal(result.allowed, false, 'Authenticated user must not be able to write another owner profile');
});

test('Unauthorized profile write - unverified admin is BLOCKED', () => {
  const fakeAdminAuth = { uid: 'admin_fake', token: { email: 'jangirpankaj9001@gmail.com', email_verified: false } };
  const result = evalOwnerWrite('owner_123', fakeAdminAuth, { name: 'Admin Edit' });
  assert.equal(result.allowed, false, 'Unverified admin email must not be allowed to write owner profile');
});

test('Authorized profile write - matching authenticated owner is ALLOWED', () => {
  const ownerAuth = { uid: 'owner_123', token: { email: 'owner@gondiastay.in', email_verified: true } };
  const result = evalOwnerWrite('owner_123', ownerAuth, { name: 'Owner Real Name', phone: '9876543210' });
  assert.equal(result.allowed, true, 'Matching authenticated owner must be allowed to write their own profile');
});

test('Authorized profile write - verified admin is ALLOWED', () => {
  const realAdminAuth = { uid: 'admin_real', token: { email: 'jangirpankaj9001@gmail.com', email_verified: true } };
  const result = evalOwnerWrite('owner_123', realAdminAuth, { name: 'Moderated Name' });
  assert.equal(result.allowed, true, 'Verified admin must be allowed to manage owner profile');
});
