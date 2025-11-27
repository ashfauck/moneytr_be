import { Request } from 'express';

// User types
export interface UserPayload {
  userId: string;
  phoneNumber: string;
  accountStatus: string;
}

// Extend Express Request type with user
export interface AuthRequest extends Request {
  user?: UserPayload;
  body: any;
  params: any;
  query: any;
  headers: any;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  timestamp: string;
}

// Device types
export interface DeviceInfo {
  deviceId: string;
  deviceToken?: string;
  platform: 'ios' | 'android' | 'web';
  deviceInfo: string;
  appVersion?: string;
}

// Step auth types
export interface ValidatePhoneRequest {
  phoneNumber: string;
}

export interface VerifyPinRequest {
  tempToken: string;
  pin: string;
  deviceId?: string;
  deviceToken?: string;
}

export interface SetupPinRequest {
  tempToken: string;
  pin: string;
  confirmPin: string;
}

export interface CompleteProfileRequest {
  tempToken: string;
  name?: string;
  email?: string;
}

export interface ReauthRequest {
  pin?: string;
  authType: 'pin' | 'biometric';
  challengeId?: string;
  signature?: string;
  publicKey?: string;
}

// Biometric types
export interface BiometricChallengeRequest {
  phoneNumber: string;
}

export interface BiometricEnrollRequest {
  publicKey: string;
  biometryType: string;
  deviceId?: string;
}

export interface BiometricVerifyRequest {
  challengeId: string;
  signature: string;
  publicKey: string;
}

// Webhook types
export interface WebhookAuthNotifyRequest {
  phoneNumber: string;
  requesterId: string;
  requesterName: string;
  requesterOrganization: string;
  requestType: 'LOGIN' | 'DOCUMENT_VERIFICATION' | 'PAYMENT_AUTHORIZATION';
  requestedPermissions: string[];
  description: string;
  expiresInMinutes?: number;
}

export interface WebhookApproveRequest {
  requestId: string;
  pin: string;
}

export interface WebhookRejectRequest {
  requestId: string;
}

// Session types
export interface SessionInfo {
  id: string;
  deviceInfo: string;
  ipAddress: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

// User profile types
export interface UpdateProfileRequest {
  name?: string;
  email?: string;
}

export interface ChangePinRequest {
  currentPin: string;
  newPin: string;
  confirmPin: string;
}
