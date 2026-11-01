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
      appContent.indexOf('My Home Services Section'),
      appContent.indexOf('{/* Sub-tab 2: Admin Approval Workflow */}')
    );
    assert.ok(
      !myHomeServicesSection.includes('<span>Pending Approval</span>'),
      'My Home Services must not render the "Pending Approval" button'
    );
  });

  await t.test('9. In Owner → My Properties and My Home Services, show "Pending Approval" label and no "Pending Verification"', () => {
    assert.ok(
      !appContent.includes('Pending Verification'),
      'App.tsx should no longer contain "Pending Verification"'
    );

    const myPropertiesSection = appContent.slice(
      appContent.indexOf('My Properties ('),
      appContent.indexOf('My Home Services Section')
    );
    const myHomeServicesSection = appContent.slice(
      appContent.indexOf('My Home Services Section'),
      appContent.indexOf('{/* Sub-tab 2: Admin Approval Workflow */}')
    );

    assert.ok(
      myPropertiesSection.includes("isPending(property.status) ? 'Pending Approval' : 'Rejected'"),
      'My Properties status badge must display "Pending Approval" for pending items'
    );
    assert.ok(
      myHomeServicesSection.includes("isPending(srv.status) ? 'Pending Approval' : 'Rejected'"),
      'My Home Services status badge must display "Pending Approval" for pending items'
    );
  });

  await t.test('10. In Owner → My Home Services, remove the "Approved ✓" button completely from each service card', () => {
    const myHomeServicesSection = appContent.slice(
      appContent.indexOf('My Home Services Section'),
      appContent.indexOf('{/* Sub-tab 2: Admin Approval Workflow */}')
    );
    assert.ok(
      !myHomeServicesSection.includes('Approved ✓'),
      'My Home Services cards must not render the "Approved ✓" button'
    );
  });

  await t.test('11. Newly submitted property or service immediately appears in owner section with "Pending Approval", and updates to "Approved · Live" once approved', () => {
    const myPropertiesSection = appContent.slice(
      appContent.indexOf('My Properties ('),
      appContent.indexOf('My Home Services Section')
    );
    const myHomeServicesSection = appContent.slice(
      appContent.indexOf('My Home Services Section'),
      appContent.indexOf('{/* Sub-tab 2: Admin Approval Workflow */}')
    );

    // 1. Both sections display "Approved · Live" once approved
    assert.ok(
      myPropertiesSection.includes("isApproved(property.status) ? 'Approved · Live' : isPending(property.status) ? 'Pending Approval' : 'Rejected'"),
      'My Properties must display "Approved · Live" once approved and "Pending Approval" when pending'
    );
    assert.ok(
      myHomeServicesSection.includes("isApproved(srv.status) ? 'Approved · Live' : isPending(srv.status) ? 'Pending Approval' : 'Rejected'"),
      'My Home Services must display "Approved · Live" once approved and "Pending Approval" when pending'
    );

    // 2. AppContext maintains submitted properties & services persistence and real-time merging
    assert.ok(
      appContextContent.includes('getSubmittedProperties') && appContextContent.includes('saveSubmittedProperty'),
      'AppContext manages submitted properties persistence'
    );
    assert.ok(
      appContextContent.includes('getSubmittedServices') && appContextContent.includes('saveSubmittedService'),
      'AppContext manages submitted services persistence'
    );
    assert.ok(
      appContextContent.includes('updateSubmittedPropertyStatus') && appContextContent.includes('updateSubmittedServiceStatus'),
      'AppContext updates submitted listing status upon approval'
    );
  });

  await t.test('12. In Owner Section: My Properties and My Home Services render side-by-side Edit and red Delete buttons', () => {
    const myPropertiesSection = appContent.slice(
      appContent.indexOf('My Properties ('),
      appContent.indexOf('My Home Services Section')
    );
    const myHomeServicesSection = appContent.slice(
      appContent.indexOf('My Home Services Section'),
      appContent.indexOf('{/* Sub-tab 2: Admin Approval Workflow */}')
    );

    // 1. My Properties has Edit button and red Delete button side by side
    assert.ok(
      myPropertiesSection.includes('handleEditClick(property, myListingTokens[property.id])'),
      'My Properties has Edit button passing private listing token'
    );
    assert.ok(
      myPropertiesSection.includes('<span>Delete</span>') && myPropertiesSection.includes('bg-rose-600'),
      'My Properties has red Delete button with <span>Delete</span> text'
    );

    // 2. My Home Services has Edit and red Delete buttons side by side
    assert.ok(
      myHomeServicesSection.includes('setServiceToEdit(srv)') && myHomeServicesSection.includes('setIsAddServiceModalOpen(true)'),
      'My Home Services has Edit button opening service modal for respective service'
    );
    assert.ok(
      myHomeServicesSection.includes('deleteService(srv.id)') && myHomeServicesSection.includes('bg-rose-600'),
      'My Home Services has red Delete button with deleteService for respective service'
    );
    assert.ok(
      myHomeServicesSection.includes('<span>Edit</span>') && myHomeServicesSection.includes('<span>Delete</span>'),
      'My Home Services renders both Edit and Delete buttons'
    );

    // 3. Security: Only respective owner or admin can edit/delete
    assert.ok(
      appContextContent.includes('isServiceOwner(targetService)'),
      'deleteService gates deletion behind isServiceOwner and admin'
    );
    assert.ok(
      appContent.includes('isServiceOwner(s)'),
      'My Home Services only lists services owned by the current user'
    );
  });
});



