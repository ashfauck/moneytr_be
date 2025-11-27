import admin from 'firebase-admin';
import config from '../utils/config';
import logger from '../utils/logger';

// Initialize Firebase Admin
let firebaseApp: admin.app.App | null = null;

export function initializeFirebase(): admin.app.App {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        privateKey: config.firebase.privateKey,
        clientEmail: config.firebase.clientEmail,
      }),
    });

    logger.info('✅ Firebase Admin initialized successfully');
    return firebaseApp;
  } catch (error) {
    logger.error('❌ Firebase initialization failed:', error);
    throw error;
  }
}

/**
 * Send push notification to a device
 */
export async function sendPushNotification(
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<string> {
  try {
    if (!firebaseApp) {
      initializeFirebase();
    }

    const message: admin.messaging.Message = {
      token: deviceToken,
      notification: {
        title,
        body,
      },
      data: data || {},
    };

    const response = await admin.messaging().send(message);
    logger.info(`Push notification sent successfully: ${response}`);
    return response;
  } catch (error) {
    logger.error('Failed to send push notification:', error);
    throw error;
  }
}

/**
 * Send push notification to multiple devices
 */
export async function sendMulticastNotification(
  deviceTokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<admin.messaging.BatchResponse> {
  try {
    if (!firebaseApp) {
      initializeFirebase();
    }

    const message: admin.messaging.MulticastMessage = {
      tokens: deviceTokens,
      notification: {
        title,
        body,
      },
      data: data || {},
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    logger.info(
      `Multicast notification sent: ${response.successCount} success, ${response.failureCount} failures`,
    );
    return response;
  } catch (error) {
    logger.error('Failed to send multicast notification:', error);
    throw error;
  }
}

/**
 * Send auth request notification
 */
export async function sendAuthRequestNotification(
  deviceToken: string,
  requesterName: string,
  requesterOrganization: string,
  verificationNumber: number,
): Promise<string> {
  return sendPushNotification(
    deviceToken,
    'Authentication Request',
    `${requesterName} from ${requesterOrganization} is requesting authentication. Verification: ${verificationNumber}`,
    {
      type: 'AUTH_REQUEST',
      verificationNumber: verificationNumber.toString(),
      requesterName,
      requesterOrganization,
    },
  );
}

/**
 * Send auth response notification
 */
export async function sendAuthResponseNotification(
  deviceToken: string,
  approved: boolean,
  userName: string,
): Promise<string> {
  const title = approved ? 'Request Approved' : 'Request Rejected';
  const body = approved
    ? `${userName} has approved your authentication request`
    : `${userName} has rejected your authentication request`;

  return sendPushNotification(deviceToken, title, body, {
    type: 'AUTH_RESPONSE',
    status: approved ? 'APPROVED' : 'REJECTED',
  });
}
