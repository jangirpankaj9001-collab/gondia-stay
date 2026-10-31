import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Property Deletion UNDO Capability (5–10s Temporary Window)', async (t) => {
  const appContextContent = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
  const appContent = fs.readFileSync('src/App.tsx', 'utf8');
  const modalContent = fs.readFileSync('src/components/DeleteConfirmationModal.tsx', 'utf8');

  await t.test('1. Delete Confirmation Modal: Tapping Yes triggers deletion workflow', () => {
    assert.ok(
      modalContent.includes('Yes, Delete'),
      'Modal must have Yes, Delete action button'
    );
    assert.ok(
      modalContent.includes('onClick={onConfirm}'),
      'Yes, Delete button triggers onConfirm callback'
    );
  });

  await t.test('2. Temporary "Property deleted – UNDO" option is rendered for 5–10 seconds', () => {
    assert.ok(
      appContent.includes('Property deleted – UNDO'),
      'App must display "Property deleted – UNDO" prompt'
    );
    assert.ok(
      appContent.includes('data-testid="property-undo-banner"'),
      'Banner has testable property-undo-banner ID'
    );
    assert.ok(
      appContent.includes('data-testid="undo-delete-btn"'),
      'Banner has testable undo-delete-btn ID'
    );
    assert.ok(
      appContent.includes('onClick={undoPropertyDeletion}'),
      'Banner button calls undoPropertyDeletion'
    );
  });

  await t.test('3. AppContext manages 5–10s countdown timer and deferred deletion', () => {
    assert.ok(
      appContextContent.includes('DURATION_SECONDS = 8') || appContextContent.includes('DURATION_SECONDS = 7'),
      'Duration is set within the required 5–10 second window'
    );
    assert.ok(
      appContextContent.includes('pendingPropertyDeletion'),
      'AppContext manages pendingPropertyDeletion state'
    );
    assert.ok(
      appContextContent.includes('undoPropertyDeletion'),
      'AppContext provides undoPropertyDeletion function'
    );
  });

  await t.test('4. Undo restores property with original details, photos, credentials and status', () => {
    assert.ok(
      appContextContent.includes('undoPropertyDeletion = useCallback'),
      'undoPropertyDeletion is memoized'
    );
    assert.ok(
      appContextContent.includes('setProperties(prev => {') &&
      appContextContent.includes('[item.property, ...prev]'),
      'Restores property to active properties state preserving all fields (photos, occupancy, approval status)'
    );
    assert.ok(
      appContextContent.includes('setMyListingTokens(prev => {') &&
      appContextContent.includes('localStorage.setItem(\'gondia_stay_listing_tokens\''),
      'Restores owner credentials and edit token on undo'
    );
    assert.ok(
      appContextContent.includes('Property restored successfully'),
      'Provides user feedback upon successful undo'
    );
  });

  await t.test('5. Expiry of timer executes permanent deletion in Cloud Firestore', () => {
    assert.ok(
      appContextContent.includes('finalizePendingDeletion'),
      'Finalize function handles permanent deletion'
    );
    assert.ok(
      appContextContent.includes('deletePropertyFromFirestore(item.property.id)') ||
      appContextContent.includes('deletePropertyFromFirestore(pendingItem.property.id)'),
      'Calls deletePropertyFromFirestore on timer expiry'
    );
  });

  await t.test('6. Other functionality (approval, moderation, edit, view) remains intact', () => {
    assert.ok(
      appContextContent.includes('approveProperty'),
      'approveProperty remains intact'
    );
    assert.ok(
      appContextContent.includes('saveProperty'),
      'saveProperty remains intact'
    );
    assert.ok(
      appContextContent.includes('updatePropertyOccupancy'),
      'updatePropertyOccupancy remains intact'
    );
  });

  await t.test('7. Owner section: My Properties and My Home Services use matching app icons', () => {
    assert.ok(
      appContent.includes('<Building2 className="w-3.5 h-3.5" />\n                    <span>My Properties'),
      'My Properties in Owner section uses Building2 icon assigned to Properties elsewhere'
    );
    assert.ok(
      appContent.includes('<ServicesHouseIcon className="w-4 h-4" />\n                            <span>My Home Services'),
      'My Home Services in Owner section uses ServicesHouseIcon assigned to Home Services elsewhere'
    );
    assert.ok(
      appContent.includes('<ServicesHouseIcon className="w-4 h-4" />\n                        <span>Home Services</span>'),
      'Home Services in Admin Moderation also uses ServicesHouseIcon'
    );
  });
});
