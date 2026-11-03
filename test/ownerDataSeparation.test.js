import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Strict Owner-Wise Data Separation (User Request 10)', async (t) => {
  const appContext = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
  const app = fs.readFileSync('src/App.tsx', 'utf8');

  await t.test('1. isPropertyOwner strictly checks owner credentials without admin bypass', () => {
    // Locate isPropertyOwner function body
    const propOwnerMatch = appContext.match(/const isPropertyOwner = useCallback\(\(property: PropertyListing\): boolean => \{([\s\S]*?)\},/);
    assert.ok(propOwnerMatch, 'isPropertyOwner function exists in AppContext');
    const body = propOwnerMatch[1];
    
    // Ensure no short-circuiting admin return true
    assert.ok(!body.includes('if (isAdminAuthenticated) return true;'), 'isPropertyOwner must NOT return true for admin');
    
    // Ensure device/owner tokens and IDs are checked
    assert.ok(body.includes('currentOwner.id && property.ownerId && property.ownerId === currentOwner.id'), 'Matches currentOwner.id');
    assert.ok(body.includes('myListingTokens[property.id]'), 'Matches device edit token');
    assert.ok(body.includes('myPropertyIds.includes(property.id)'), 'Matches device registered property ID');
  });

  await t.test('2. isServiceOwner strictly checks owner credentials without admin bypass', () => {
    // Locate isServiceOwner function body
    const srvOwnerMatch = appContext.match(/const isServiceOwner = useCallback\(\(service: ServiceItem\): boolean => \{([\s\S]*?)\},/);
    assert.ok(srvOwnerMatch, 'isServiceOwner function exists in AppContext');
    const body = srvOwnerMatch[1];

    // Ensure no short-circuiting admin return true
    assert.ok(!body.includes('if (isAdminAuthenticated) return true;'), 'isServiceOwner must NOT return true for admin');

    // Ensure device/owner tokens and IDs are checked
    assert.ok(body.includes('currentOwner.id && service.ownerId && service.ownerId === currentOwner.id'), 'Matches currentOwner.id');
    assert.ok(body.includes('myServiceTokens[service.id]'), 'Matches device service token');
    assert.ok(body.includes('myServiceIds.includes(service.id)'), 'Matches device registered service ID');
  });

  await t.test('3. myProperties in App.tsx filters strictly by isPropertyOwner even when admin is authenticated', () => {
    const myPropertiesMatch = app.match(/const myProperties = useMemo\(\(\) => \{([\s\S]*?)\}, \[properties, isPropertyOwner\]\);/);
    assert.ok(myPropertiesMatch, 'myProperties useMemo exists with [properties, isPropertyOwner] dependencies');
    const body = myPropertiesMatch[1];

    // Must not return all properties when admin is authenticated
    assert.ok(!body.includes('if (isAdminAuthenticated) return properties;'), 'myProperties must NOT return all properties for admin');
    assert.ok(body.includes('return properties.filter(p => isPropertyOwner(p));'), 'myProperties filters strictly by isPropertyOwner');
  });

  await t.test('4. myOwnerServices in App.tsx filters strictly by isServiceOwner', () => {
    assert.ok(
      app.includes('const myOwnerServices = services.filter(s => isServiceOwner(s));'),
      'myOwnerServices filters strictly using isServiceOwner'
    );
  });

  await t.test('5. Admin retains separate access to all listings through the Admin Panel', () => {
    // Admin panel moderation lists
    assert.ok(app.includes('properties.filter(p => isPending(p.status))'), 'Admin panel accesses all pending properties');
    assert.ok(app.includes('properties.filter(p => isApproved(p.status))'), 'Admin panel accesses all approved properties');
    assert.ok(app.includes('properties.filter(p => (p.status || \'\').toLowerCase() === \'rejected\')'), 'Admin panel accesses all rejected properties');
    assert.ok(app.includes('services.filter(s => isPending(s.status))'), 'Admin panel accesses all pending services');
    assert.ok(app.includes('services.filter(s => isApproved(s.status))'), 'Admin panel accesses all approved services');
    
    // Admin moderation actions retain admin overrides
    assert.ok(appContext.includes('!isAdminAuthenticated && targetProp && !isPropertyOwner(targetProp)'), 'Admin can delete any property in moderation');
    assert.ok(appContext.includes('!isAdminAuthenticated && targetService && !isServiceOwner(targetService)'), 'Admin can delete or edit any service in moderation');
  });
});
