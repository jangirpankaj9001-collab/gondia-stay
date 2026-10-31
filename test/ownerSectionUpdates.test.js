import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Owner Section Property & Service Reapproval Workflow (User Requests 8 & 9)', async (t) => {
  const appContent = fs.readFileSync('src/App.tsx', 'utf8');
  const addPropertyContent = fs.readFileSync('src/components/AddPropertyModal.tsx', 'utf8');
  const addServiceContent = fs.readFileSync('src/components/AddServiceModal.tsx', 'utf8');
  const propertiesServiceContent = fs.readFileSync('src/firebase/propertiesService.ts', 'utf8');
  const servicesServiceContent = fs.readFileSync('src/firebase/servicesService.ts', 'utf8');
  const appContextContent = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

  await t.test('1. Owner-listed properties: green Approved button is removed', () => {
    assert.ok(
      !appContent.includes('bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-300'),
      'Green Approved button should be removed from owner properties in App.tsx'
    );
  });

  await t.test('2. Owner-listed properties: Edit Link is replaced with functional Edit button beside Delete', () => {
    assert.ok(
      !appContent.includes('<span>Edit Link</span>'),
      '"Edit Link" button should be removed from owner properties'
    );
    assert.ok(
      appContent.includes('handleEditClick(property, myListingTokens[property.id])'),
      'Edit button must trigger handleEditClick with property and private edit token'
    );
    assert.ok(
      appContent.includes('title="Edit Listing Details"'),
      'Functional Edit button has descriptive title'
    );
  });

  await t.test('3. Property Modal: Button shows "Submit for Reapproval", then changes to "Submitted"', () => {
    assert.ok(
      addPropertyContent.includes('<span>Submit for Reapproval</span>'),
      'Modal submit button must display "Submit for Reapproval" initially when editing as owner'
    );
    assert.ok(
      addPropertyContent.includes('<span>Submitted</span>'),
      'Modal submit button must display "Submitted" after owner taps submit'
    );
    assert.ok(
      addPropertyContent.includes('isReapprovalSubmitted'),
      'Modal manages isReapprovalSubmitted state'
    );
  });

  await t.test('4. Property Modal: Popup displays exact confirmation message', () => {
    const expectedPropertyPopupText = 'Your property has been submitted for reapproval. Updated details will appear publicly once approved by the admin.';
    
    assert.ok(
      addPropertyContent.includes('showReapprovalPopup'),
      'AddPropertyModal manages showReapprovalPopup state'
    );
    assert.ok(
      addPropertyContent.includes(expectedPropertyPopupText),
      'Property popup modal must contain exact requested confirmation message'
    );
  });

  await t.test('5. Service Modal: Button shows "Submit for Reapproval", then changes to "Submitted"', () => {
    assert.ok(
      addServiceContent.includes('<span>Submit for Reapproval</span>'),
      'Service modal submit button must display "Submit for Reapproval" initially when editing as owner'
    );
    assert.ok(
      addServiceContent.includes('<span>Submitted</span>'),
      'Service modal submit button must display "Submitted" after owner taps submit'
    );
    assert.ok(
      addServiceContent.includes('isReapprovalSubmitted'),
      'Service modal manages isReapprovalSubmitted state'
    );
  });

  await t.test('6. Service Modal: Popup displays exact confirmation message', () => {
    const expectedServicePopupText = 'Your service has been submitted for reapproval. Updated details will appear publicly once approved by the admin.';
    
    assert.ok(
      addServiceContent.includes('showReapprovalPopup'),
      'AddServiceModal manages showReapprovalPopup state'
    );
    assert.ok(
      addServiceContent.includes(expectedServicePopupText),
      'Service popup modal must contain exact requested confirmation message'
    );
  });

  await t.test('7. Old approved listings remain public until updated version is approved', () => {
    // Properties: live listing is untouched, pendingEdit stores proposed changes
    assert.ok(
      propertiesServiceContent.includes('pendingEdit'),
      'propertiesService retains pendingEdit for unmoderated changes'
    );
    assert.ok(
      propertiesServiceContent.includes('hasPendingEdit: false'),
      'Approving property edit resets hasPendingEdit flag'
    );

    // Services: provider editing approved service stores in pendingEdit, keeping live listing intact
    assert.ok(
      servicesServiceContent.includes('pendingEdit: pendingData'),
      'servicesService stores edits in pendingEdit while live service remains approved'
    );
    assert.ok(
      appContextContent.includes('moderatePropertyEdit') && appContextContent.includes('moderateServiceEdit'),
      'AppContext provides handlers to moderate pending edits'
    );
  });

  await t.test('8. In Owner → My Home Services, remove the "Pending Approval" button', () => {
    // Check that My Home Services block does not render the "Pending Approval" button
    const myHomeServicesSection = appContent.slice(
      appContent.indexOf('My Home Services'),
      appContent.indexOf('ownerSubTab === \'moderation\'')
    );
    assert.ok(
      !myHomeServicesSection.includes('<span>Pending Approval</span>'),
      'My Home Services must not render the "Pending Approval" button'
    );
  });
});
