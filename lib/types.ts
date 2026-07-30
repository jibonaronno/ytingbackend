export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface DatabaseUserRecord {
  user_id: string;
  username: string;
  email: string;
  password_hash: string;
  phone_number: string;
  phone_country_code: string;
  phone_verified: boolean;
  phone_verification_token: string | null;
  phone_verification_attempts: number;
  email_verified: boolean;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  profile_picture_url: string | null;
  country: string;
  continent: string;
  timezone: string | null;
  preferred_language: string;
  account_status: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  phone_verified_at: string | null;
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  failed_login_attempts: number;
  account_locked_until: string | null;
  metadata: Json | null;
}

export interface PhoneVerificationTokenRecord {
  token_id: string;
  user_id: string;
  otp_code: string;
  is_used: boolean;
  expires_at: string;
  created_at: string;
}

export interface LoginAuditLogRecord {
  log_id: string;
  user_id: string;
  login_time: string;
  ip_address: string | null;
  device_info: Json | null;
  success: boolean | null;
  failure_reason: string | null;
  continent: string | null;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: DatabaseUserRecord;
        Insert: Partial<DatabaseUserRecord> & {
          username: string;
          email: string;
          password_hash: string;
          phone_number: string;
          phone_country_code: string;
          country: string;
          continent: string;
        };
        Update: Partial<DatabaseUserRecord>;
        Relationships: [];
      };
      phone_verification_tokens: {
        Row: PhoneVerificationTokenRecord;
        Insert: Partial<PhoneVerificationTokenRecord> & {
          user_id: string;
          otp_code: string;
          expires_at: string;
        };
        Update: Partial<PhoneVerificationTokenRecord>;
        Relationships: [];
      };
      login_audit_log: {
        Row: LoginAuditLogRecord;
        Insert: Partial<LoginAuditLogRecord> & {
          user_id: string;
        };
        Update: Partial<LoginAuditLogRecord>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export interface PublicUser {
  user_id: string;
  username: string;
  email: string;
  phone_number: string;
  phone_country_code: string;
  phone_verified: boolean;
  email_verified: boolean;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  profile_picture_url: string | null;
  country: string;
  continent: string;
  timezone: string | null;
  preferred_language: string;
  account_status: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  phone_verified_at: string | null;
  metadata: Json | null;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  username: string;
  isAdmin: boolean;
  type: "access" | "refresh";
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  phoneNumber: string;
  phoneCountryCode: string;
  country: string;
  continent: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  timezone?: string;
  preferredLanguage?: string;
  metadata?: Json;
}

export interface LoginPayload {
  identifier: string;
  password: string;
  deviceInfo?: Json;
  continent?: string;
}

export interface RefreshTokenPayload {
  refreshToken: string;
}

export interface VerifyPhonePayload {
  userId?: string;
  otpCode: string;
}
