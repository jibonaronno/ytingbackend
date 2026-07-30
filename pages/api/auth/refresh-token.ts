import type { NextApiRequest, NextApiResponse } from "next";

import { refreshUserSession } from "@/lib/auth";
import type { RefreshTokenPayload } from "@/lib/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { refreshToken } = req.body as RefreshTokenPayload;
    const result = await refreshUserSession(refreshToken);

    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token refresh failed";
    const statusCode = message.includes("required") || message.includes("inactive") || message.includes("token") ? 400 : 500;

    return res.status(statusCode).json({ error: message });
  }
}
