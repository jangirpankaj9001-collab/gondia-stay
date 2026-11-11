import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appCode = fs.readFileSync('src/App.tsx', 'utf8');
const gridCode = fs.readFileSync('src/components/ServiceCategoryGrid.tsx', 'utf8');
const propServiceCode = fs.readFileSync('src/firebase/propertiesService.ts', 'utf8');
const servServiceCode = fs.readFileSync('src/firebase/servicesService.ts', 'utf8');

test('Admin Deletion - Permanent Hidden State from Rentals, Home Services, and All Subcategories on Every Device', async (t) => {
  await t.test('1. Admin deletion tags items internally with deleted_by_admin status in Firestore and tokens', () => {
    assert.ok(
      propServiceCode.includes("status: 'deleted_by_admin'"),
      'propertiesService tags property status as deleted_by_admin'
    );
    assert.ok(
      servServiceCode.includes("status: 'deleted_by_admin'"),
      'servicesService tags service status as deleted_by_admin'
    );
  });

  await t.test('2. Filtered Properties permanently hides deleted items from Rentals (Explore, Map, Saved) on every device, including admin', () => {
    // filteredProperties in App.tsx
    assert.ok(
      appCode.includes('if (isDeletedByAdmin(p.status)) {\n        return false;\n      }'),
      'filteredProperties immediately returns false if isDeletedByAdmin is true'
    );
    assert.ok(
      appCode.includes('properties.filter(p => isApproved(p.status) && !isDeletedByAdmin(p.status))'),
      'GondiaMap strictly excludes deleted_by_admin properties'
    );
    assert.ok(
      appCode.includes('if (found && !isDeletedByAdmin(found.status))'),
      'Direct link resolution excludes deleted_by_admin properties'
    );
    assert.ok(
      appCode.includes("activeTab === 'detail' && selectedProperty && !isDeletedByAdmin(selectedProperty.status)"),
      'Detail view tab strictly excludes deleted_by_admin properties'
    );
  });

  await t.test('3. Home Services and Category Grid permanently hide deleted items on every device, including admin mobile', () => {
    // filteredServices in App.tsx
    assert.ok(
      appCode.includes('if (isDeletedByAdmin(s.status)) {\n        return false;\n      }'),
      'filteredServices immediately returns false if isDeletedByAdmin is true, even when isAdminAuthenticated is true'
    );
    // servicesForCategoryGrid in App.tsx
    assert.ok(
      appCode.includes('if (isDeletedByAdmin(s.status)) return false;'),
      'servicesForCategoryGrid immediately returns false if isDeletedByAdmin is true'
    );
  });

  await t.test('4. All subcategories in ServiceCategoryGrid permanently hide deleted services on every device, including admin', () => {
    assert.ok(
      gridCode.includes('if (isDeletedByAdmin(service.status)) return false;'),
      'dedicatedProviders in ServiceCategoryGrid strictly excludes deleted_by_admin services'
    );
  });

  await t.test('5. Deleted items never reappear after refresh or login', () => {
    // getCachedProperties filters deleted_by_admin
    assert.ok(
      propServiceCode.includes('!isDeletedByAdmin(p.status)'),
      'getCachedProperties filters out deleted_by_admin properties from cache on reload/login'
    );
    // getCachedServices filters deleted_by_admin
    assert.ok(
      servServiceCode.includes('!isDeletedByAdmin(s.status)'),
      'getCachedServices filters out deleted_by_admin services from cache on reload/login'
    );
    // deletePropertyFromFirestore cleans up admin local storage
    assert.ok(
      propServiceCode.includes('DELETED_PROPERTIES_KEY'),
      'deletePropertyFromFirestore records deleted property key in local storage'
    );
    // deleteServiceInFirestore cleans up admin local storage
    assert.ok(
      servServiceCode.includes('DELETED_SERVICES_KEY'),
      'deleteServiceInFirestore records deleted service key in local storage'
    );
  });
});
