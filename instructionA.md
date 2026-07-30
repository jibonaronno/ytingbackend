# ytingbackend instructions

## 1. What this backend provides

This repository is a Next.js + TypeScript backend designed to deploy directly to Vercel and serve a mobile app over REST.

Implemented endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/verify-phone`
- `POST /api/auth/refresh-token`
- `GET /api/users/profile`
- `GET /api/users/[id]`
- `GET /api/health`

Core features:

- Type-safe TypeScript auth helpers
- Supabase/PostgreSQL persistence using your existing `users`, `phone_verification_tokens`, and `login_audit_log` tables
- JWT access + refresh tokens
- Next.js middleware that protects `/api/users/*`
- Vercel-ready serverless API routes

## 2. Project structure

```text
ytingbackend/
├── pages/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── register.ts
│   │   │   ├── login.ts
│   │   │   ├── verify-phone.ts
│   │   │   └── refresh-token.ts
│   │   ├── users/
│   │   │   ├── [id].ts
│   │   │   └── profile.ts
│   │   └── health.ts
├── lib/
│   ├── auth.ts
│   ├── env.ts
│   ├── jwt.ts
│   ├── otp.ts
│   ├── supabase.ts
│   └── types.ts
├── middleware.ts
├── .env.example
├── vercel.json
└── package.json
```

## 3. Environment variables

Copy `.env.example` to `.env.local`.

```bash
cp .env.example .env.local
```

Fill in these values:

- `SUPABASE_URL` = your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` = service role key from Supabase
- `JWT_SECRET` = long random secret for access tokens
- `JWT_REFRESH_SECRET` = different long random secret for refresh tokens
- `ACCESS_TOKEN_TTL` = default `15m`
- `REFRESH_TOKEN_TTL` = default `30d`

> Do not commit `.env.local`.

## 4. Install and run locally

Minimal commands:

```bash
npm install
npm run dev
```

The backend will be available at:

- `http://localhost:3000/api/health`

## 5. Build and lint

```bash
npm run lint
npm run build
```

## 6. Deploy to Vercel

### Option A: Git-based deployment (recommended)
1. Push this repository to GitHub.
2. Import the repository into Vercel.
3. Add the environment variables from section 3 in the Vercel project settings.
4. Deploy.

### Option B: Vercel CLI

```bash
npm install -g vercel
vercel
vercel --prod
```

When prompted, link the project and set the same environment variables in Vercel.

## 7. REST API request examples

### Health check

```bash
curl http://localhost:3000/api/health
```

### Register

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "demo-user",
    "email": "demo@example.com",
    "password": "StrongPass123!",
    "phoneNumber": "+15550001111",
    "phoneCountryCode": "+1",
    "country": "United States",
    "continent": "North America",
    "firstName": "Demo",
    "lastName": "User",
    "preferredLanguage": "en"
  }'
```

Expected result:
- user record is created in Supabase
- phone OTP token is created in `phone_verification_tokens`
- access token + refresh token are returned
- in non-production mode, the response also includes the OTP for easier local testing

### Verify phone

```bash
curl -X POST http://localhost:3000/api/auth/verify-phone \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_FROM_REGISTER_RESPONSE",
    "otpCode": "OTP_FROM_REGISTER_RESPONSE"
  }'
```

You can also send a bearer token from registration/login and omit `userId`.

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "demo@example.com",
    "password": "StrongPass123!"
  }'
```

`identifier` supports:
- email
- username
- phone number

### Refresh token

```bash
curl -X POST http://localhost:3000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### Get current profile

```bash
curl http://localhost:3000/api/users/profile \
  -H "Authorization: ******"
```

### Get user by id

```bash
curl http://localhost:3000/api/users/USER_ID \
  -H "Authorization: ******"
```

Notes:
- non-admin users can only fetch their own record
- admins can fetch other users

## 8. Database notes

This backend expects the following Supabase tables to exist:

- `users`
- `phone_verification_tokens`
- `login_audit_log`

Your provided SQL schema matches what this backend uses.

## 9. Security behavior

- Passwords are hashed with `bcryptjs`
- JWTs are signed with separate access/refresh secrets
- `/api/users/*` routes are protected by Next.js middleware
- Failed logins are tracked
- Accounts are temporarily locked after repeated failed logins
- Sensitive database fields like `password_hash` are never returned in API responses

## 10. Suggested production rollout order

1. Deploy backend to Vercel
2. Configure Vercel environment variables
3. Test `/api/health`
4. Test `/api/auth/register`
5. Test `/api/auth/verify-phone`
6. Test `/api/auth/login`
7. Test `/api/users/profile`
8. Connect the mobile app to the deployed Vercel URL
