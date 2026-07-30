import { hash, compare } from "bcryptjs";
import type { NextApiRequest } from "next";

import { createServerSupabaseClient } from "@/lib/supabase";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/jwt";
import { generateOtpCode, getOtpExpiryDate } from "@/lib/otp";
import type {
  DatabaseUserRecord,
  Json,
  LoginPayload,
  PublicUser,
  RegisterPayload,
  VerifyPhonePayload,
} from "@/lib/types";

const SALT_ROUNDS = 12;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCK_MINUTES = 15;

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPhone(value: string) {
  return /^\+?[0-9]{6,20}$/.test(value);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function normalizePhone(phoneNumber: string) {
  return phoneNumber.trim();
}

function sanitizeUser(user: DatabaseUserRecord): PublicUser {
  return {
    account_status: user.account_status,
    continent: user.continent,
    country: user.country,
    created_at: user.created_at,
    date_of_birth: user.date_of_birth,
    email: user.email,
    email_verified: user.email_verified,
    first_name: user.first_name,
    gender: user.gender,
    is_active: user.is_active,
    is_admin: user.is_admin,
    last_login: user.last_login,
    last_name: user.last_name,
    metadata: user.metadata,
    phone_country_code: user.phone_country_code,
    phone_number: user.phone_number,
    phone_verified: user.phone_verified,
    phone_verified_at: user.phone_verified_at,
    preferred_language: user.preferred_language,
    profile_picture_url: user.profile_picture_url,
    timezone: user.timezone,
    updated_at: user.updated_at,
    user_id: user.user_id,
    username: user.username,
  };
}

function validateRegistrationPayload(payload: RegisterPayload) {
  if (!payload.username || !payload.email || !payload.password || !payload.phoneNumber || !payload.phoneCountryCode || !payload.country || !payload.continent) {
    throw new Error("username, email, password, phoneNumber, phoneCountryCode, country, and continent are required");
  }

  if (!isEmail(payload.email)) {
    throw new Error("A valid email address is required");
  }

  if (payload.password.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }

  if (!isPhone(payload.phoneNumber)) {
    throw new Error("A valid phone number is required");
  }
}

async function createTokens(user: DatabaseUserRecord) {
  const tokenPayload = {
    email: user.email,
    isAdmin: user.is_admin,
    sub: user.user_id,
    username: user.username,
  };

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(tokenPayload),
    signRefreshToken(tokenPayload),
  ]);

  return { accessToken, refreshToken };
}

async function findUserByIdentifier(identifier: string) {
  const supabase = createServerSupabaseClient();
  const trimmed = identifier.trim();

  let query = supabase.from("users").select("*").limit(1);

  if (isEmail(trimmed)) {
    query = query.eq("email", normalizeEmail(trimmed));
  } else if (isPhone(trimmed)) {
    query = query.eq("phone_number", normalizePhone(trimmed));
  } else {
    query = query.eq("username", normalizeUsername(trimmed));
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function recordLoginAttempt(userId: string, success: boolean, failureReason: string | null, ipAddress?: string, deviceInfo?: Json, continent?: string) {
  const supabase = createServerSupabaseClient();

  await supabase.from("login_audit_log").insert({
    continent: continent ?? null,
    device_info: deviceInfo ?? null,
    failure_reason: failureReason,
    ip_address: ipAddress ?? null,
    success,
    user_id: userId,
  });
}

async function handleFailedLogin(user: DatabaseUserRecord, failureReason: string, ipAddress?: string, deviceInfo?: Json, continent?: string) {
  const attempts = (user.failed_login_attempts ?? 0) + 1;
  const shouldLock = attempts >= MAX_FAILED_LOGIN_ATTEMPTS;
  const lockedUntil = shouldLock ? new Date(Date.now() + ACCOUNT_LOCK_MINUTES * 60 * 1000).toISOString() : null;
  const supabase = createServerSupabaseClient();

  await supabase
    .from("users")
    .update({
      account_locked_until: lockedUntil,
      failed_login_attempts: attempts,
    })
    .eq("user_id", user.user_id);

  await recordLoginAttempt(user.user_id, false, failureReason, ipAddress, deviceInfo, continent).catch(() => undefined);
}

export async function registerUser(payload: RegisterPayload) {
  validateRegistrationPayload(payload);

  const supabase = createServerSupabaseClient();
  const otpCode = generateOtpCode();
  const passwordHash = await hash(payload.password, SALT_ROUNDS);

  const { data: user, error } = await supabase
    .from("users")
    .insert({
      continent: payload.continent.trim(),
      country: payload.country.trim(),
      date_of_birth: payload.dateOfBirth ?? null,
      email: normalizeEmail(payload.email),
      first_name: payload.firstName?.trim() || null,
      gender: payload.gender?.trim() || null,
      last_name: payload.lastName?.trim() || null,
      metadata: payload.metadata ?? null,
      password_hash: passwordHash,
      phone_country_code: payload.phoneCountryCode.trim(),
      phone_number: normalizePhone(payload.phoneNumber),
      phone_verification_token: otpCode,
      preferred_language: payload.preferredLanguage?.trim() || "en",
      timezone: payload.timezone?.trim() || null,
      username: normalizeUsername(payload.username),
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A user with the same email, username, or phone number already exists");
    }

    throw error;
  }

  const expiresAt = getOtpExpiryDate().toISOString();
  const { error: otpError } = await supabase.from("phone_verification_tokens").insert({
    expires_at: expiresAt,
    otp_code: otpCode,
    user_id: user.user_id,
  });

  if (otpError) {
    throw otpError;
  }

  const tokens = await createTokens(user);

  return {
    ...tokens,
    phoneVerification: {
      expiresAt,
      otpCode: process.env.NODE_ENV === "production" ? undefined : otpCode,
      phoneVerified: user.phone_verified,
    },
    user: sanitizeUser(user),
  };
}

export async function loginUser(payload: LoginPayload, requestMeta?: { ipAddress?: string; deviceInfo?: Json; continent?: string }) {
  if (!payload.identifier || !payload.password) {
    throw new Error("identifier and password are required");
  }

  const user = await findUserByIdentifier(payload.identifier);

  if (!user) {
    throw new Error("Invalid credentials");
  }

  if (!user.is_active || user.account_status !== "active") {
    await recordLoginAttempt(user.user_id, false, "inactive_account", requestMeta?.ipAddress, payload.deviceInfo, payload.continent ?? requestMeta?.continent).catch(() => undefined);
    throw new Error("Account is inactive");
  }

  if (user.account_locked_until && new Date(user.account_locked_until).getTime() > Date.now()) {
    await recordLoginAttempt(user.user_id, false, "account_locked", requestMeta?.ipAddress, payload.deviceInfo, payload.continent ?? requestMeta?.continent).catch(() => undefined);
    throw new Error("Account is temporarily locked");
  }

  const passwordMatches = await compare(payload.password, user.password_hash);

  if (!passwordMatches) {
    await handleFailedLogin(user, "invalid_password", requestMeta?.ipAddress, payload.deviceInfo, payload.continent ?? requestMeta?.continent);
    throw new Error("Invalid credentials");
  }

  const supabase = createServerSupabaseClient();
  const { error: updateError } = await supabase
    .from("users")
    .update({
      account_locked_until: null,
      failed_login_attempts: 0,
      last_login: new Date().toISOString(),
    })
    .eq("user_id", user.user_id);

  if (updateError) {
    throw updateError;
  }

  await recordLoginAttempt(user.user_id, true, null, requestMeta?.ipAddress, payload.deviceInfo, payload.continent ?? requestMeta?.continent).catch(() => undefined);

  const refreshedUser = {
    ...user,
    account_locked_until: null,
    failed_login_attempts: 0,
    last_login: new Date().toISOString(),
  };

  const tokens = await createTokens(refreshedUser);

  return {
    ...tokens,
    user: sanitizeUser(refreshedUser),
  };
}

export async function refreshUserSession(refreshToken: string) {
  if (!refreshToken) {
    throw new Error("refreshToken is required");
  }

  const payload = await verifyRefreshToken(refreshToken);
  const supabase = createServerSupabaseClient();
  const { data: user, error } = await supabase.from("users").select("*").eq("user_id", payload.sub).single();

  if (error) {
    throw error;
  }

  if (!user.is_active || user.account_status !== "active") {
    throw new Error("Account is inactive");
  }

  const tokens = await createTokens(user);

  return {
    ...tokens,
    user: sanitizeUser(user),
  };
}

export async function verifyPhoneCode(payload: VerifyPhonePayload) {
  if (!payload.userId || !payload.otpCode) {
    throw new Error("userId and otpCode are required");
  }

  const supabase = createServerSupabaseClient();
  const { data: token, error: tokenError } = await supabase
    .from("phone_verification_tokens")
    .select("*")
    .eq("user_id", payload.userId)
    .eq("is_used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (tokenError) {
    throw tokenError;
  }

  if (!token) {
    throw new Error("No active verification code found");
  }

  if (new Date(token.expires_at).getTime() < Date.now()) {
    throw new Error("Verification code has expired");
  }

  if (token.otp_code !== payload.otpCode.trim()) {
    const { data: user } = await supabase.from("users").select("phone_verification_attempts").eq("user_id", payload.userId).single();

    await supabase
      .from("users")
      .update({
        phone_verification_attempts: (user?.phone_verification_attempts ?? 0) + 1,
      })
      .eq("user_id", payload.userId);

    throw new Error("Invalid verification code");
  }

  const verifiedAt = new Date().toISOString();

  const [{ error: updateTokenError }, { data: user, error: userError }] = await Promise.all([
    supabase.from("phone_verification_tokens").update({ is_used: true }).eq("token_id", token.token_id),
    supabase
      .from("users")
      .update({
        phone_verification_attempts: 0,
        phone_verification_token: null,
        phone_verified: true,
        phone_verified_at: verifiedAt,
      })
      .eq("user_id", payload.userId)
      .select("*")
      .single(),
  ]);

  if (updateTokenError) {
    throw updateTokenError;
  }

  if (userError) {
    throw userError;
  }

  return {
    message: "Phone number verified successfully",
    user: sanitizeUser(user),
  };
}

export async function getUserById(userId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("users").select("*").eq("user_id", userId).single();

  if (error) {
    throw error;
  }

  return sanitizeUser(data);
}

export function getRequestMeta(req: NextApiRequest) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const ipAddress = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(",")[0]?.trim();
  const userAgent = req.headers["user-agent"];

  return {
    deviceInfo: userAgent ? ({ userAgent } as Json) : undefined,
    ipAddress,
  };
}
