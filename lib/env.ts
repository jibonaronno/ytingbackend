interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  ACCESS_TOKEN_TTL: string;
  REFRESH_TOKEN_TTL: string;
}

let cachedEnv: EnvConfig | undefined;

export function getEnv(): EnvConfig {
  if (cachedEnv) {
    return cachedEnv;
  }

  const {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    JWT_SECRET,
    JWT_REFRESH_SECRET,
    ACCESS_TOKEN_TTL = "15m",
    REFRESH_TOKEN_TTL = "30d",
  } = process.env;

  const missing = [
    ["SUPABASE_URL", SUPABASE_URL],
    ["SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY],
    ["JWT_SECRET", JWT_SECRET],
    ["JWT_REFRESH_SECRET", JWT_REFRESH_SECRET],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }

  cachedEnv = {
    SUPABASE_URL: SUPABASE_URL as string,
    SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY as string,
    JWT_SECRET: JWT_SECRET as string,
    JWT_REFRESH_SECRET: JWT_REFRESH_SECRET as string,
    ACCESS_TOKEN_TTL,
    REFRESH_TOKEN_TTL,
  };

  return cachedEnv;
}
