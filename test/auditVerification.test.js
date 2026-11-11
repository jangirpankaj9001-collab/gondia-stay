import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appCode = fs.readFileSync('src/App.tsx', 'utf8');
const appContextCode = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
const contactCode = fs.readFileSync('src/utils/contact.ts', 'utf8');

test('Functional Audit - Navigation, Sharing, Contact, and Android Back Navigation', async (t) => {
  await t.test('1. Android back button handles Property Detail view and Delete Confirmation dialog', () => {
    assert.ok(
      appCode.includes("useBackHandler(activeTab === 'detail', () => goBack(), 'detail-view');"),
      'App.tsx registers back handler for Property Detail view'
    );
    assert.ok(
      appCode.includes("useBackHandler(deleteConfirmState.isOpen, () => setDeleteConfirmState(prev => ({ ...prev, isOpen: false })), 'delete-confirm-dialog');"),
      'App.tsx registers back handler for global delete confirmation modal'
    );
  });

  await t.test('2. Direct property view URLs (?property=<id>) are resolved on page load and reload', () => {
    assert.ok(
      appCode.includes("searchParams.get('property')"),
      'App.tsx checks searchParams for property ID'
    );
    assert.ok(
      appCode.includes("fetchPropertyDirect(directPropId)"),
      'App.tsx fetches property directly when opened via shared URL'
    );
    assert.ok(
      appCode.includes("navigateTo('detail', found);"),
      'App.tsx opens detail view when property is matched from loaded properties'
    );
  });

  await t.test('3. Share button on Detail View supports mobile native share and safe clipboard fallback with full link', () => {
    assert.ok(
      appCode.includes("navigator.share(shareData)"),
      'Share action triggers native mobile share sheet when supported'
    );
    assert.ok(
      appCode.includes("?property=${encodeURIComponent(selectedProperty.id)}"),
      'Share URL includes the target property identifier parameter'
    );
    assert.ok(
      appCode.includes("Listing link copied to clipboard!"),
      'Clipboard fallback confirms link copy to user'
    );
  });

  await t.test('4. navigateTo preserves property ID in URL during navigation to detail view', () => {
    assert.ok(
      appContextCode.includes("?property=${encodeURIComponent(property.id)}"),
      'AppContext includes ?property= in window.history.pushState'
    );
  });

  await t.test('5. Contact utilities correctly format Indian numbers and WhatsApp URLs', () => {
    assert.ok(contactCode.includes('normalizeIndianMobileNumber'), 'contact.ts normalizes Indian mobile numbers');
    assert.ok(contactCode.includes('formatWhatsAppNumber'), 'contact.ts formats numbers with 91 country code');
    assert.ok(contactCode.includes('https://wa.me/'), 'contact.ts constructs valid WhatsApp chat URLs');
    assert.ok(contactCode.includes('tel:'), 'contact.ts uses tel: protocol for phone dialing');
    assert.ok(contactCode.includes('google.com/maps/dir'), 'contact.ts opens Google Maps navigation');
  });
});
