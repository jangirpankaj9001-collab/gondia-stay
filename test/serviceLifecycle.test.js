import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');

const rules = fs.readFileSync('firestore.rules', 'utf8');

test('Firebase Emulator - Service Lifecycle Verification (No Rating Impact)', async (t) => {
  let testEnv;

  try {
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-gondia-stay-lifecycle-test',
      firestore: {
        rules,
        host: '127.0.0.1',
        port: 8080
      }
    });
  } catch (err) {
    console.error('Failed to connect to Firebase emulator:', err);
    throw err;
  }

  const adminAuth = {
    uid: 'admin_pankaj',
    token: {
      email: 'jangirpankaj9001@gmail.com',
      email_verified: true
    }
  };

  await t.test('1. Service Creation (Zero-login with atomic secrets & edit token) is ALLOWED', async () => {
    const serviceId = 'srv_lifecycle_create_1';
    const editToken = 'gst_srv_abcdef0123456789abcdef0123456789';

    const unauthContext = testEnv.unauthenticatedContext();
    const db = unauthContext.firestore();

    const srvRef = db.collection('services').doc(serviceId);
    const secretRef = db.collection('service_secrets').doc(serviceId);
    const tokenRef = db.collection('service_edit_tokens').doc(editToken);

    const batch = db.batch();
    batch.set(srvRef, {
      title: 'Maa Annapurna Tiffin Center',
      phone: '9876543210',
      category: 'MESS_TIFFIN',
      status: 'pending',
      providerName: 'Annapurna Provider',
      locality: 'Rail Toli',
      charges: 'From ₹2,500/month',
      description: 'Pure veg home cooked thali delivery in Gondia',
      photos: ['https://example.com/photo1.jpg'],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    batch.set(secretRef, {
      serviceId,
      editToken,
      createdAt: Date.now()
    });

    batch.set(tokenRef, {
      serviceId,
      createdAt: Date.now(),
      lastActionAt: Date.now()
    });

    await assertSucceeds(batch.commit());

    // Verify created state
    let snap;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      snap = await context.firestore().collection('services').doc(serviceId).get();
    });
    assert.equal(snap.exists, true);
    assert.equal(snap.data()?.status, 'pending');
  });

  await t.test('2. Owner private edit token lookup (allow get) works for link resolution', async () => {
    const editToken = 'gst_srv_abcdef0123456789abcdef0123456789';
    const unauthContext = testEnv.unauthenticatedContext();
    const db = unauthContext.firestore();

    const tokenRef = db.collection('service_edit_tokens').doc(editToken);
    const snap = await assertSucceeds(tokenRef.get());
    assert.equal(snap.exists, true);
    assert.equal(snap.data()?.serviceId, 'srv_lifecycle_create_1');
  });

  await t.test('3. Owner editing pending service draft with private edit token is ALLOWED', async () => {
    const serviceId = 'srv_lifecycle_create_1';
    const editToken = 'gst_srv_abcdef0123456789abcdef0123456789';

    const unauthContext = testEnv.unauthenticatedContext();
    const db = unauthContext.firestore();

    const srvRef = db.collection('services').doc(serviceId);
    const tokenRef = db.collection('service_edit_tokens').doc(editToken);

    const batch = db.batch();
    batch.update(srvRef, {
      title: 'Maa Annapurna Tiffin Center (Updated)',
      phone: '9876543211',
      description: 'Pure veg home cooked thali delivery with special dinner delivery',
      updatedAt: Date.now()
    });
    batch.update(tokenRef, {
      lastActionAt: Date.now() + 100,
      updatedAt: Date.now()
    });

    await assertSucceeds(batch.commit());

    let snap;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      snap = await context.firestore().collection('services').doc(serviceId).get();
    });
    assert.equal(snap.data()?.title, 'Maa Annapurna Tiffin Center (Updated)');
  });

  await t.test('4. Admin approval of service listing is ALLOWED', async () => {
    const serviceId = 'srv_lifecycle_create_1';
    const adminContext = testEnv.authenticatedContext(adminAuth.uid, adminAuth.token);
    const db = adminContext.firestore();

    const srvRef = db.collection('services').doc(serviceId);
    await assertSucceeds(
      srvRef.update({
        status: 'approved',
        moderatedAt: Date.now(),
        moderatedBy: adminAuth.token.email,
        updatedAt: Date.now()
      })
    );

    let snap;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      snap = await context.firestore().collection('services').doc(serviceId).get();
    });
    assert.equal(snap.data()?.status, 'approved');
  });

  await t.test('5. Owner submitting pending edit on approved listing with private edit token is ALLOWED', async () => {
    const serviceId = 'srv_lifecycle_create_1';
    const editToken = 'gst_srv_abcdef0123456789abcdef0123456789';

    const unauthContext = testEnv.unauthenticatedContext();
    const db = unauthContext.firestore();

    const srvRef = db.collection('services').doc(serviceId);
    const tokenRef = db.collection('service_edit_tokens').doc(editToken);

    const batch = db.batch();
    batch.update(srvRef, {
      hasPendingEdit: true,
      pendingEdit: {
        title: 'Maa Annapurna Grand Tiffin',
        phone: '9876543212',
        description: 'Updated daily thali meal service for students & working professionals'
      },
      updatedAt: Date.now()
    });
    batch.update(tokenRef, {
      lastActionAt: Date.now() + 200,
      updatedAt: Date.now()
    });

    await assertSucceeds(batch.commit());

    let snap;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      snap = await context.firestore().collection('services').doc(serviceId).get();
    });
    // Live listing remains approved and unchanged
    assert.equal(snap.data()?.status, 'approved');
    assert.equal(snap.data()?.hasPendingEdit, true);
    assert.equal(snap.data()?.pendingEdit?.title, 'Maa Annapurna Grand Tiffin');
  });

  await t.test('6. Unauthorized caller editing service listing without edit token is BLOCKED', async () => {
    const serviceId = 'srv_lifecycle_create_1';
    const unauthContext = testEnv.unauthenticatedContext();
    const db = unauthContext.firestore();

    const srvRef = db.collection('services').doc(serviceId);

    // Caller attempts to tamper with service directly without touching token document
    await assertFails(
      srvRef.update({
        title: 'Hacked Service Name',
        updatedAt: Date.now()
      })
    );
  });

  await t.test('7. Unauthorized caller deleting service without edit token is BLOCKED', async () => {
    const serviceId = 'srv_lifecycle_create_1';
    const unauthContext = testEnv.unauthenticatedContext();
    const db = unauthContext.firestore();

    const srvRef = db.collection('services').doc(serviceId);
    await assertFails(srvRef.delete());
  });

  await t.test('8. Owner deleting service listing with private edit token is ALLOWED', async () => {
    const serviceId = 'srv_lifecycle_create_1';
    const editToken = 'gst_srv_abcdef0123456789abcdef0123456789';

    const unauthContext = testEnv.unauthenticatedContext();
    const db = unauthContext.firestore();

    const srvRef = db.collection('services').doc(serviceId);
    const tokenRef = db.collection('service_edit_tokens').doc(editToken);

    const batch = db.batch();
    batch.delete(srvRef);
    batch.delete(tokenRef);

    await assertSucceeds(batch.commit());

    let snap;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      snap = await context.firestore().collection('services').doc(serviceId).get();
    });
    assert.equal(snap.exists, false);
  });

  await t.test('9. Admin creation and deletion of service is ALLOWED', async () => {
    const serviceId = 'srv_admin_direct';
    const adminContext = testEnv.authenticatedContext(adminAuth.uid, adminAuth.token);
    const db = adminContext.firestore();

    const srvRef = db.collection('services').doc(serviceId);

    // Direct create as approved
    await assertSucceeds(
      srvRef.set({
        title: 'Admin Created Electrician Service',
        phone: '9876543299',
        category: 'ELECTRICIAN',
        status: 'approved',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
    );

    // Direct delete by admin
    await assertSucceeds(srvRef.delete());
  });

  if (testEnv) {
    await testEnv.cleanup();
  }
});
