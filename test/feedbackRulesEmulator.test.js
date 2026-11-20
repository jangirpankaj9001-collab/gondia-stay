import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');

const rules = fs.readFileSync('firestore.rules', 'utf8');
const firebaseModalContent = fs.readFileSync('src/components/FirebaseModal.tsx', 'utf8');

test('User Feedback Firestore Security Rules Verification', async (t) => {
  await t.test('0. FirebaseModal FIRESTORE_RULES_TEXT matches firestore.rules exactly', () => {
    const startMarker = 'export const FIRESTORE_RULES_TEXT = `';
    const startIdx = firebaseModalContent.indexOf(startMarker);
    assert.ok(startIdx !== -1, 'FirebaseModal defines FIRESTORE_RULES_TEXT');
    const afterStart = startIdx + startMarker.length;
    const endIdx = firebaseModalContent.indexOf('`;', afterStart);
    assert.ok(endIdx !== -1, 'FIRESTORE_RULES_TEXT template closes cleanly');
    const modalRules = firebaseModalContent.slice(afterStart, endIdx).trim();
    assert.equal(
      modalRules,
      rules.trim(),
      'FIRESTORE_RULES_TEXT in FirebaseModal.tsx must match firestore.rules byte-for-byte'
    );
  });

  const isEmulatorAvailable = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  if (!isEmulatorAvailable) {
    console.log('Firebase emulator not configured via FIRESTORE_EMULATOR_HOST, skipping live emulator checks');
    return;
  }

  const testEnv = await initializeTestEnvironment({
    projectId: 'demo-gondia-stay-feedback-rules',
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8080
    }
  });

  const adminAuth901 = {
    uid: 'admin_901',
    token: { email: 'jangirpankaj901@gmail.com', email_verified: true }
  };
  const adminAuth9001 = {
    uid: 'admin_9001',
    token: { email: 'jangirpankaj9001@gmail.com', email_verified: true }
  };
  const unverifiedAdminAuth = {
    uid: 'admin_unverified',
    token: { email: 'jangirpankaj901@gmail.com', email_verified: false }
  };
  const regularUserAuth = {
    uid: 'user_regular_1',
    token: { email: 'resident@example.com', email_verified: true }
  };

  let createdFeedbackId = null;

  await t.test('1. Public unauthenticated user CAN submit bug_report with optional screenshot & contact details', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const docRef = await assertSucceeds(
      db.collection('user_feedback').add({
        category: 'bug_report',
        subject: 'Map pin offset',
        message: 'Location pin slightly shifted in Rail Toli 👍',
        screenshotUrl: 'https://res.cloudinary.com/basiw3sf/image/upload/v1/gondiastay_feedback/shot1.jpg',
        contactName: 'Amit',
        contactInfo: '9876543210',
        pageContext: 'explore',
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
    );
    createdFeedbackId = docRef.id;
    assert.ok(createdFeedbackId);
  });

  await t.test('2. Public unauthenticated user CAN submit minimal suggestion & general_query without optional fields', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      db.collection('user_feedback').add({
        category: 'suggestion',
        message: 'Add dark mode toggle',
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
    );
    await assertSucceeds(
      db.collection('user_feedback').add({
        category: 'general_query',
        message: 'Hi 👍',
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
    );
  });

  await t.test('3. Authenticated non-admin user CAN submit feedback', async () => {
    const db = testEnv.authenticatedContext(regularUserAuth.uid, regularUserAuth.token).firestore();
    await assertSucceeds(
      db.collection('user_feedback').add({
        category: 'general_query',
        message: 'How do I edit my service listing?',
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
    );
  });

  await t.test('4. Public user CANNOT forge status, invalid category, empty message, or unauthorized fields', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      db.collection('user_feedback').add({
        category: 'bug_report',
        message: 'Trying to self-resolve',
        status: 'resolved',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
    );
    await assertFails(
      db.collection('user_feedback').add({
        category: 'invalid_type',
        message: 'Invalid category payload',
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
    );
    await assertFails(
      db.collection('user_feedback').add({
        category: 'bug_report',
        message: '',
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
    );
    await assertFails(
      db.collection('user_feedback').add({
        category: 'bug_report',
        message: 'Injecting unauthorized field',
        status: 'pending',
        isAdmin: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
    );
  });

  await t.test('5. Unauthenticated public user CANNOT read, list, update, or delete user_feedback', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.collection('user_feedback').doc(createdFeedbackId).get());
    await assertFails(db.collection('user_feedback').get());
    await assertFails(db.collection('user_feedback').doc(createdFeedbackId).update({ status: 'resolved' }));
    await assertFails(db.collection('user_feedback').doc(createdFeedbackId).delete());
  });

  await t.test('6. Non-admin & unverified users CANNOT read, list, update, or delete user_feedback', async () => {
    const regularDb = testEnv.authenticatedContext(regularUserAuth.uid, regularUserAuth.token).firestore();
    await assertFails(regularDb.collection('user_feedback').doc(createdFeedbackId).get());
    await assertFails(regularDb.collection('user_feedback').get());
    await assertFails(regularDb.collection('user_feedback').doc(createdFeedbackId).update({ status: 'reviewed' }));
    await assertFails(regularDb.collection('user_feedback').doc(createdFeedbackId).delete());

    const unverifiedDb = testEnv.authenticatedContext(unverifiedAdminAuth.uid, unverifiedAdminAuth.token).firestore();
    await assertFails(unverifiedDb.collection('user_feedback').get());
    await assertFails(unverifiedDb.collection('user_feedback').doc(createdFeedbackId).update({ status: 'reviewed' }));
    await assertFails(unverifiedDb.collection('user_feedback').doc(createdFeedbackId).delete());
  });

  await t.test('7. Verified Admin CAN read, list, update status, and delete user_feedback', async () => {
    const adminDb1 = testEnv.authenticatedContext(adminAuth901.uid, adminAuth901.token).firestore();
    const listSnap = await assertSucceeds(adminDb1.collection('user_feedback').get());
    assert.ok(listSnap.size >= 3, 'Admin can list all feedback items');

    await assertSucceeds(
      adminDb1.collection('user_feedback').doc(createdFeedbackId).update({
        status: 'reviewed',
        reviewedAt: Date.now(),
        reviewedBy: adminAuth901.token.email,
        updatedAt: Date.now()
      })
    );

    const adminDb2 = testEnv.authenticatedContext(adminAuth9001.uid, adminAuth9001.token).firestore();
    await assertSucceeds(
      adminDb2.collection('user_feedback').doc(createdFeedbackId).update({
        status: 'resolved',
        updatedAt: Date.now()
      })
    );
    await assertSucceeds(adminDb2.collection('user_feedback').doc(createdFeedbackId).delete());
  });

  await testEnv.cleanup();
});
