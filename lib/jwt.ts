import { jwtVerify, SignJWT } from "jose";

import { getEnv } from "@/lib/env";
import type { AuthTokenPayload } from "@/lib/types";

const ISSUER = "ytingbackend";
const AUDIENCE = "yting-mobile-app";

function getSecret(secret: string) {
  return new TextEncoder().encode(secret);
}

async function signToken(payload: Omit<AuthTokenPayload, "type"> & { type: "access" | "refresh" }, secret: string, expiresIn: string) {
  return new SignJWT({
    email: payload.email,
    isAdmin: payload.isAdmin,
    type: payload.type,
    username: payload.username,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret(secret));
}

export async function signAccessToken(payload: Omit<AuthTokenPayload, "type">) {
  const env = getEnv();

  return signToken({ ...payload, type: "access" }, env.JWT_SECRET, env.ACCESS_TOKEN_TTL);
}

export async function signRefreshToken(payload: Omit<AuthTokenPayload, "type">) {
  const env = getEnv();

  return signToken({ ...payload, type: "refresh" }, env.JWT_REFRESH_SECRET, env.REFRESH_TOKEN_TTL);
}

async function verifyToken(token: string, secret: string, expectedType: "access" | "refresh") {
  const verified = await jwtVerify(token, getSecret(secret), {
    audience: AUDIENCE,
    issuer: ISSUER,
  });

  const payload = verified.payload;

  if (payload.type !== expectedType || !payload.sub || !payload.email || !payload.username) {
    throw new Error("Invalid token payload");
  }

  return {
    email: String(payload.email),
    isAdmin: Boolean(payload.isAdmin),
    sub: String(payload.sub),
    type: expectedType,
    username: String(payload.username),
  } satisfies AuthTokenPayload;
}

export async function verifyAccessToken(token: string) {
  return verifyToken(token, getEnv().JWT_SECRET, "access");
}

export async function verifyRefreshToken(token: string) {
  return verifyToken(token, getEnv().JWT_REFRESH_SECRET, "refresh");
}

export function getBearerToken(authorizationHeader?: string | null) {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}
