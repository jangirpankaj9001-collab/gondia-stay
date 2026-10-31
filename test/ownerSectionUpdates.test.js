import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Owner Section Property Actions & Reapproval Workflow (User Request 8)', async (t) => {
  const appContent = fs.readFileSync('src/App.tsx', 'utf8');
  const addPropertyContent = fs.readFileSync('src/components/AddPropertyModal.tsx', 'utf8');
  const propertiesServiceContent = fs.readFileSync('src/firebase/propertiesService.ts', 'utf8');
  const appContextContent = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

  await t.test('1. Owner-listed properties: green Approved button is removed', () => {
    // In App.tsx owner listings section, ensure the green Approved button is removed
    assert.ok(
      !appContent.includes('bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-300'),
      'Green Approved button should be removed from owner properties in App.tsx'
    );
  });

  await t.test('2. Owner-listed properties: Edit Link is replaced with functional Edit button beside Delete', () => {
    // Ensure "Edit Link" button is removed from owner properties
    assert.ok(
      !appContent.includes('<span>Edit Link</span>'),
      '"Edit Link" button should be removed from owner properties'
    );
    // Ensure functional Edit button is rendered with Edit3 icon beside Delete
    assert.ok(
      appContent.includes('handleEditClick(property, myListingTokens[property.id])'),
      'Edit button must trigger handleEditClick with property and private edit token'
    );
    assert.ok(
      appContent.includes('title="Edit Listing Details"'),
      'Functional Edit button has descriptive title'
    );
  });

  await t.test('3. When editing, shows "Submit for Reapproval" instead of "Pending Approval"', () => {
    assert.ok(
      addPropertyContent.includes('<span>Submit for Reapproval</span>'),
      'Modal submit button must display "Submit for Reapproval" when editing as owner'
    );
  });

  await t.test('4. Dedicated popup explains reapproval and existing listing visibility', () => {
    const expectedPopupText = 'Your property has been submitted for reapproval. Updated details will appear publicly once approved by the admin & previously approved listing will be publicly visible with its original details until the edited version is approved';
    
    assert.ok(
      addPropertyContent.includes('showReapprovalPopup'),
      'AddPropertyModal manages showReapprovalPopup state'
    );
    assert.ok(
      addPropertyContent.includes(expectedPopupText.replace('&', '&amp;')) || addPropertyContent.includes(expectedPopupText),
      'Popup modal must contain the exact requested notification text'
    );
  });

  await t.test('5. Automatic replacement of old public listing upon admin approval', () => {
    // In propertiesService.ts, check that approval merges pendingEdit into the document and sets status to approved
    assert.ok(
      propertiesServiceContent.includes('moderatePropertyEditInFirestore'),
      'propertiesService exports moderatePropertyEditInFirestore'
    );
    assert.ok(
      propertiesServiceContent.includes('status: \'approved\''),
      'Approving edit sets listing status to approved'
    );
    assert.ok(
      propertiesServiceContent.includes('hasPendingEdit: false'),
      'Approving edit resets hasPendingEdit flag'
    );
    assert.ok(
      appContextContent.includes('moderatePropertyEdit'),
      'AppContext provides moderatePropertyEdit handler'
    );
  });
});
