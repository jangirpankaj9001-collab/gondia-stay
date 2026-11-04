import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Submission Feedback & Duplicate Prevention for Properties & Services', async (t) => {
  const addPropContent = fs.readFileSync('src/components/AddPropertyModal.tsx', 'utf8');
  const addServiceContent = fs.readFileSync('src/components/AddServiceModal.tsx', 'utf8');

  await t.test('1. Property Modal: Submit button turns green and shows "Submitted"', () => {
    assert.ok(
      addPropContent.includes('isReapprovalSubmitted') &&
      addPropContent.includes('bg-emerald-600 hover:bg-emerald-700 text-white'),
      'Submit button uses emerald green style when isReapprovalSubmitted is true'
    );
    assert.ok(
      addPropContent.includes('isReapprovalSubmitted ? (') &&
      addPropContent.includes('<span>Submitted</span>'),
      'Submit button displays "Submitted" label when isReapprovalSubmitted is true'
    );
  });

  await t.test('2. Property Modal: Duplicate submissions are prevented', () => {
    assert.ok(
      addPropContent.includes('if (isSubmitting || isUploadingPhotos || isReapprovalSubmitted) {') ||
      addPropContent.includes('if (isSubmitting || isUploadingPhotos || isReapprovalSubmitted) return;'),
      'handleSubmit prevents duplicate submissions if already submitting or submitted'
    );
    assert.ok(
      addPropContent.includes('disabled={isSubmitting || isUploadingPhotos || isReapprovalSubmitted}'),
      'Submit button is disabled when isReapprovalSubmitted is true'
    );
  });

  await t.test('3. Property Modal: Success popup confirms admin approval and shows property details', () => {
    assert.ok(
      addPropContent.includes('showReapprovalPopup'),
      'Modal uses showReapprovalPopup for confirmation'
    );
    assert.ok(
      addPropContent.includes('Pending Approval'),
      'Confirmation popup displays Pending Approval status badge'
    );
    assert.ok(
      addPropContent.includes('Changes will become public only after admin approval'),
      'Popup explains that changes will become public only after admin approval'
    );
    assert.ok(
      addPropContent.includes('savedPropertyInfo?.title || title') &&
      addPropContent.includes('Landlord:'),
      'Popup displays relevant property summary details including title and landlord contact'
    );
  });

  await t.test('4. Service Modal: Submit button turns green and shows "Submitted"', () => {
    assert.ok(
      addServiceContent.includes('isReapprovalSubmitted') &&
      addServiceContent.includes('bg-emerald-600 hover:bg-emerald-700 text-white'),
      'Submit button uses emerald green style when isReapprovalSubmitted is true'
    );
    assert.ok(
      addServiceContent.includes('isReapprovalSubmitted ? (') &&
      addServiceContent.includes('<span>Submitted</span>'),
      'Submit button displays "Submitted" label when isReapprovalSubmitted is true'
    );
  });

  await t.test('5. Service Modal: Duplicate submissions are prevented', () => {
    assert.ok(
      addServiceContent.includes('if (isSubmitting || isReapprovalSubmitted) {') ||
      addServiceContent.includes('if (isSubmitting || isReapprovalSubmitted) return;'),
      'handleSubmit prevents duplicate submissions if already submitting or submitted'
    );
    assert.ok(
      addServiceContent.includes('disabled={isSubmitting || isUploadingPhoto || isReapprovalSubmitted}'),
      'Submit button is disabled when isReapprovalSubmitted is true'
    );
  });

  await t.test('6. Service Modal: Success popup confirms admin approval and shows service details', () => {
    assert.ok(
      addServiceContent.includes('showReapprovalPopup'),
      'Modal uses showReapprovalPopup for confirmation'
    );
    assert.ok(
      addServiceContent.includes('Pending Approval'),
      'Confirmation popup displays Pending Approval status badge'
    );
    assert.ok(
      addServiceContent.includes('Changes will become public only after admin approval'),
      'Popup explains that changes will become public only after admin approval'
    );
    assert.ok(
      addServiceContent.includes('{title}') &&
      addServiceContent.includes('{providerName}'),
      'Popup displays relevant service summary details including title and provider contact'
    );
  });
});
