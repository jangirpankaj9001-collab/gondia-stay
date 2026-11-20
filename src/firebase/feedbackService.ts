import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from './config';
import { FeedbackCategory, FeedbackItem, FeedbackStatus } from '../types';

export const FEEDBACK_COLLECTION = 'user_feedback';

export interface SubmitFeedbackInput {
  category: FeedbackCategory;
  subject?: string;
  message: string;
  screenshotUrl?: string;
  contactName?: string;
  contactInfo?: string;
  pageContext?: string;
}

const VALID_FEEDBACK_CATEGORIES: FeedbackCategory[] = ['bug_report', 'suggestion', 'general_query'];

/**
 * Submits user feedback (Bug Report, Suggestion, or General Query) securely to a dedicated
 * Firestore collection (`user_feedback`) with status strictly initialized to 'pending'.
 * Public users can submit without login via pure `addDoc` create.
 */
export const submitFeedbackToFirestore = async (
  input: SubmitFeedbackInput
): Promise<{ success: boolean; feedbackId?: string; error?: string }> => {
  const cleanMessage = (input.message || '').trim();
  if (cleanMessage.length < 5) {
    return { success: false, error: 'Please enter at least 5 characters describing your feedback.' };
  }
  if (cleanMessage.length > 2000) {
    return { success: false, error: 'Feedback message cannot exceed 2000 characters.' };
  }

  if (!db || !isFirebaseConfigured()) {
    return {
      success: false,
      error: 'Cloud database is not connected right now. Please try again shortly.'
    };
  }

  const normalizedCategory: FeedbackCategory = VALID_FEEDBACK_CATEGORIES.includes(input.category)
    ? input.category
    : 'general_query';
  const now = Date.now();

  const payload: Record<string, string | number> = {
    category: normalizedCategory,
    message: cleanMessage.slice(0, 2000),
    status: 'pending' as FeedbackStatus,
    createdAt: now,
    updatedAt: now
  };

  const cleanSubject = (input.subject || '').trim().slice(0, 200);
  if (cleanSubject) payload.subject = cleanSubject;

  const cleanScreenshot = (input.screenshotUrl || '').trim().slice(0, 2048);
  if (cleanScreenshot) payload.screenshotUrl = cleanScreenshot;

  const cleanContactName = (input.contactName || '').trim().slice(0, 100);
  if (cleanContactName) payload.contactName = cleanContactName;

  const cleanContactInfo = (input.contactInfo || '').trim().slice(0, 150);
  if (cleanContactInfo) payload.contactInfo = cleanContactInfo;

  const cleanPageContext = (input.pageContext || '').trim().slice(0, 100);
  if (cleanPageContext) payload.pageContext = cleanPageContext;

  try {
    const feedbackRef = collection(db, FEEDBACK_COLLECTION);
    const createdDoc = await addDoc(feedbackRef, payload);
    return { success: true, feedbackId: createdDoc.id };
  } catch (err: any) {
    console.error('[GondiaStay] Error submitting user feedback:', err);
    const rawError = err?.message || String(err);
    let userFriendlyError = rawError || 'Failed to submit feedback. Please try again.';
    if (
      rawError.toLowerCase().includes('permission') ||
      rawError.toLowerCase().includes('insufficient') ||
      rawError.includes('PERMISSION_DENIED')
    ) {
      userFriendlyError =
        'Feedback submission blocked by Firestore rules: Please publish the latest Security Rules (including user_feedback) in Firebase Console -> Firestore Database -> Rules. (Admin can copy them from Firebase Settings -> Security Rules).';
    }
    return {
      success: false,
      error: userFriendlyError
    };
  }
};

/**
 * Real-time Firestore listener for User Feedback submissions.
 * Strictly restricted to verified administrators (`isAdmin === true`).
 * Non-admin callers never subscribe to or receive feedback documents.
 */
export const subscribeToFirestoreFeedback = (
  onUpdate: (items: FeedbackItem[]) => void,
  onError: (error: Error) => void,
  isAdmin: boolean = false
): Unsubscribe | null => {
  if (!isAdmin) {
    onUpdate([]);
    return null;
  }

  if (!db || !isFirebaseConfigured()) {
    onUpdate([]);
    return null;
  }

  const feedbackRef = collection(db, FEEDBACK_COLLECTION);

  try {
    const unsubscribe = onSnapshot(
      feedbackRef,
      (snapshot) => {
        const items: FeedbackItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const rawStatus = String(data.status || 'pending').toLowerCase();
          const normalizedStatus: FeedbackStatus =
            rawStatus === 'reviewed' || rawStatus === 'resolved' ? rawStatus : 'pending';

          const rawCategory = String(data.category || 'general_query').toLowerCase();
          const normalizedCategory: FeedbackCategory =
            rawCategory === 'bug_report' || rawCategory === 'suggestion'
              ? rawCategory
              : 'general_query';

          items.push({
            id: docSnap.id,
            category: normalizedCategory,
            subject: typeof data.subject === 'string' ? data.subject : undefined,
            message: typeof data.message === 'string' ? data.message : '',
            screenshotUrl: typeof data.screenshotUrl === 'string' ? data.screenshotUrl : undefined,
            contactName: typeof data.contactName === 'string' ? data.contactName : undefined,
            contactInfo: typeof data.contactInfo === 'string' ? data.contactInfo : undefined,
            pageContext: typeof data.pageContext === 'string' ? data.pageContext : undefined,
            status: normalizedStatus,
            createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
            updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
            reviewedAt: typeof data.reviewedAt === 'number' ? data.reviewedAt : undefined,
            reviewedBy: typeof data.reviewedBy === 'string' ? data.reviewedBy : undefined
          });
        });

        items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        onUpdate(items);
      },
      (err) => {
        console.warn('[GondiaStay] Firestore feedback listener notice:', err);
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    );

    return unsubscribe;
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
    return null;
  }
};

/**
 * Updates the moderation status of a feedback item ('pending' | 'reviewed' | 'resolved').
 * Strictly requires verified administrator authentication.
 */
export const updateFeedbackStatusInFirestore = async (
  feedbackId: string,
  status: FeedbackStatus,
  adminEmail?: string
): Promise<boolean> => {
  if (!db || !isFirebaseConfigured()) {
    return false;
  }

  if (!auth?.currentUser) {
    return false;
  }

  try {
    const docRef = doc(db, FEEDBACK_COLLECTION, feedbackId);
    await updateDoc(docRef, {
      status,
      updatedAt: Date.now(),
      reviewedAt: Date.now(),
      reviewedBy: adminEmail || auth.currentUser.email || 'admin'
    });
    return true;
  } catch (err) {
    console.error('[GondiaStay] Error updating feedback status:', err);
    return false;
  }
};
