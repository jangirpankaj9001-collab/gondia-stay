import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Feedback & Report a Problem Feature Verification', async (t) => {
  const headerContent = fs.readFileSync('src/components/Header.tsx', 'utf8');
  const feedbackModalContent = fs.readFileSync('src/components/FeedbackModal.tsx', 'utf8');
  const feedbackServiceContent = fs.readFileSync('src/firebase/feedbackService.ts', 'utf8');
  const appContextContent = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
  const appContent = fs.readFileSync('src/App.tsx', 'utf8');
  const rulesContent = fs.readFileSync('firestore.rules', 'utf8');
  const firebaseModalContent = fs.readFileSync('src/components/FirebaseModal.tsx', 'utf8');
  const typesContent = fs.readFileSync('src/types/index.ts', 'utf8');

  await t.test('1. Types define FeedbackCategory, FeedbackStatus, and FeedbackItem', () => {
    assert.ok(
      typesContent.includes("export type FeedbackCategory = 'bug_report' | 'suggestion' | 'general_query';"),
      'FeedbackCategory type must define bug_report, suggestion, and general_query'
    );
    assert.ok(
      typesContent.includes("export type FeedbackStatus = 'pending' | 'reviewed' | 'resolved';"),
      'FeedbackStatus type must define pending, reviewed, and resolved'
    );
    assert.ok(
      typesContent.includes('export interface FeedbackItem'),
      'FeedbackItem interface must be exported'
    );
  });

  await t.test('2. Hamburger menu includes "Feedback & Report a Problem" option', () => {
    const drawerStart = headerContent.indexOf('{mobileMenuOpen && (');
    assert.ok(drawerStart !== -1, 'Header must render hamburger drawer menu');
    const drawerSection = headerContent.slice(drawerStart);
    assert.ok(
      drawerSection.includes('Feedback & Report a Problem'),
      'Hamburger menu must contain "Feedback & Report a Problem" option'
    );
    assert.ok(
      drawerSection.includes('setIsFeedbackModalOpen(true)'),
      'Clicking feedback menu option opens FeedbackModal'
    );
  });

  await t.test('3. FeedbackModal supports Bug Reports, Suggestions, General Queries & optional screenshot', () => {
    assert.ok(
      feedbackModalContent.includes("id: 'bug_report'") && feedbackModalContent.includes("label: 'Bug Report'"),
      'FeedbackModal must support Bug Report category'
    );
    assert.ok(
      feedbackModalContent.includes("id: 'suggestion'") && feedbackModalContent.includes("label: 'Suggestion'"),
      'FeedbackModal must support Suggestion category'
    );
    assert.ok(
      feedbackModalContent.includes("id: 'general_query'") && feedbackModalContent.includes("label: 'General Query'"),
      'FeedbackModal must support General Query category'
    );
    assert.ok(
      feedbackModalContent.includes('accept="image/*"') && feedbackModalContent.includes('uploadImageToCloudinary'),
      'FeedbackModal must allow optional screenshot upload'
    );
    assert.ok(
      feedbackModalContent.includes("'gondiastay_feedback'"),
      'Feedback screenshot upload uses dedicated gondiastay_feedback folder'
    );
  });

  await t.test('4. Feedback is stored in separate Firestore collection user_feedback with admin-only read/manage', () => {
    assert.ok(
      feedbackServiceContent.includes("export const FEEDBACK_COLLECTION = 'user_feedback';"),
      'feedbackService must use dedicated user_feedback collection'
    );
    assert.ok(
      feedbackServiceContent.includes("status: 'pending'"),
      'New feedback submissions must initialize status to pending'
    );
    assert.ok(
      feedbackServiceContent.includes('if (!isAdmin)'),
      'subscribeToFirestoreFeedback must guard against non-admin subscriptions'
    );
  });

  await t.test('5. Firestore rules enforce admin-only read/update/delete and strict create validation on user_feedback', () => {
    assert.ok(
      rulesContent.includes('match /user_feedback/{feedbackId}'),
      'firestore.rules must define /user_feedback/{feedbackId} rule block'
    );
    const fbRuleBlock = rulesContent.slice(rulesContent.indexOf('match /user_feedback/{feedbackId}'));
    assert.ok(
      fbRuleBlock.includes('allow read: if isAdmin();'),
      'Only admin can read user_feedback'
    );
    assert.ok(
      fbRuleBlock.includes("request.resource.data.status == 'pending'"),
      'Created feedback must enforce status == pending'
    );
    assert.ok(
      fbRuleBlock.includes("request.resource.data.category in ['bug_report', 'suggestion', 'general_query']"),
      'Created feedback must validate category'
    );
    assert.ok(
      fbRuleBlock.includes('allow update, delete: if isAdmin();'),
      'Only admin can update or delete user_feedback'
    );
    assert.ok(
      firebaseModalContent.includes('match /user_feedback/{feedbackId}') &&
      firebaseModalContent.includes('allow read: if isAdmin();') &&
      firebaseModalContent.includes('allow update, delete: if isAdmin();'),
      'FirebaseModal FIRESTORE_RULES_TEXT must stay in sync with firestore.rules'
    );
  });

  await t.test('6. AppContext gates feedback subscription and status updates strictly behind isAdminAuthenticated', () => {
    assert.ok(
      appContextContent.includes('if (!isAdminAuthenticated || !isFirebaseConfigured()) {\n      setFeedbackItems([]);'),
      'AppContext must clear and skip feedback subscription when not admin'
    );
    assert.ok(
      appContextContent.includes('if (!isAdminAuthenticated) {\n      showToast("Admin verification required to manage user feedback.");'),
      'AppContext must block non-admin calls to updateFeedbackStatus'
    );
  });

  await t.test('7. Admin Panel displays "User Feedback" section with Pending, Reviewed, and Resolved options', () => {
    assert.ok(
      appContent.includes('<span>User Feedback</span>'),
      'Admin Panel must include User Feedback section tab'
    );
    assert.ok(
      appContent.includes("adminModerationSection === 'feedback' && isAdminAuthenticated"),
      'User Feedback section must render strictly when admin is authenticated'
    );
    const feedbackSection = appContent.slice(
      appContent.indexOf("adminModerationSection === 'feedback' && isAdminAuthenticated")
    );
    assert.ok(
      feedbackSection.includes('Pending') &&
      feedbackSection.includes('Reviewed') &&
      feedbackSection.includes('Resolved'),
      'User Feedback section must support Pending, Reviewed, and Resolved status filters and actions'
    );
    assert.ok(
      feedbackSection.includes('updateFeedbackStatus(fb.id, targetStatus)'),
      'Admin can update feedback status to pending, reviewed, or resolved'
    );
  });
});
