import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Reapproval Feedback & UI State Consistency for Properties & Services', async (t) => {
  const addPropertyContent = fs.readFileSync('src/components/AddPropertyModal.tsx', 'utf8');
  const addServiceContent = fs.readFileSync('src/components/AddServiceModal.tsx', 'utf8');
  const propertyCardContent = fs.readFileSync('src/components/PropertyCard.tsx', 'utf8');
  const serviceCardContent = fs.readFileSync('src/components/ServiceCard.tsx', 'utf8');
  const appContent = fs.readFileSync('src/App.tsx', 'utf8');

  await t.test('1. Property Modal: Confirmation popup explains changes become public only after admin approval', () => {
    assert.ok(
      addPropertyContent.includes('Changes Submitted for Reapproval'),
      'Should display reapproval confirmation title in AddPropertyModal'
    );
    assert.ok(
      addPropertyContent.includes('Changes will become public only after admin approval'),
      'Should explain changes become public only after admin approval'
    );
    assert.ok(
      addPropertyContent.includes('hidden from public users until an administrator reviews and approves them'),
      'Should emphasize that changes remain hidden from public users until approval'
    );
  });

  await t.test('2. Property Modal: Submit button toggles between "Pending Approval" and "Approved ✓"', () => {
    assert.ok(
      addPropertyContent.includes('Pending Approval'),
      'Submit button should support Pending Approval state'
    );
    assert.ok(
      addPropertyContent.includes('Approved ✓'),
      'Submit button should support Approved ✓ state'
    );
    assert.ok(
      addPropertyContent.includes('<Clock className="w-4 h-4'),
      'Submit button should show clock icon when pending'
    );
  });

  await t.test('3. Service Modal: Confirmation popup explains changes become public only after admin approval', () => {
    assert.ok(
      addServiceContent.includes('Changes Submitted for Reapproval'),
      'Should display reapproval confirmation title in AddServiceModal'
    );
    assert.ok(
      addServiceContent.includes('Changes will become public only after admin approval'),
      'Should explain changes become public only after admin approval'
    );
    assert.ok(
      addServiceContent.includes('hidden from public users until an administrator reviews and approves them'),
      'Should emphasize that changes remain hidden from public users until approval'
    );
  });

  await t.test('4. Service Modal: Submit button toggles between "Pending Approval" and "Approved ✓"', () => {
    assert.ok(
      addServiceContent.includes('Pending Approval'),
      'Submit button should support Pending Approval state'
    );
    assert.ok(
      addServiceContent.includes('Approved ✓'),
      'Submit button should support Approved ✓ state'
    );
    assert.ok(
      addServiceContent.includes('<Clock className="w-4 h-4'),
      'Submit button should show clock icon when pending'
    );
  });

  await t.test('5. Property Card: Pending changes and status hidden from public users, visible to owner', () => {
    assert.ok(
      propertyCardContent.includes('isOwner && property.hasPendingEdit'),
      'PropertyCard must gate pending edit badge behind isOwner'
    );
    assert.ok(
      propertyCardContent.includes('Pending Approval'),
      'PropertyCard owner button shows Pending Approval with clock icon'
    );
    assert.ok(
      propertyCardContent.includes('Approved ✓'),
      'PropertyCard owner button shows Approved ✓ when approved'
    );
  });

  await t.test('6. Service Card: Pending changes and status hidden from public users, visible to owner', () => {
    assert.ok(
      serviceCardContent.includes('service.hasPendingEdit && canEdit'),
      'ServiceCard must gate pending edit banner behind canEdit'
    );
    assert.ok(
      serviceCardContent.includes('Pending Approval'),
      'ServiceCard owner button shows Pending Approval with clock icon'
    );
    assert.ok(
      serviceCardContent.includes('Approved ✓'),
      'ServiceCard owner button shows Approved ✓ when approved'
    );
  });

  await t.test('7. App Dashboard: Owner listings reflect "Pending Approval" and "Approved ✓" consistently', () => {
    assert.ok(
      appContent.includes('property.hasPendingEdit'),
      'App.tsx checks property.hasPendingEdit'
    );
    assert.ok(
      appContent.includes('srv.hasPendingEdit'),
      'App.tsx checks srv.hasPendingEdit'
    );
    assert.ok(
      appContent.includes('Approved ✓'),
      'App.tsx owner listing buttons display Approved ✓'
    );
  });
});
