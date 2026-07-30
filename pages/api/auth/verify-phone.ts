import type { NextApiRequest, NextApiResponse } from "next";

import { verifyPhoneCode } from "@/lib/auth";
import { getBearerToken, verifyAccessToken } from "@/lib/jwt";
import type { VerifyPhonePayload } from "@/lib/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body as VerifyPhonePayload;
    const bearerToken = getBearerToken(req.headers.authorization);
    const verifiedToken = bearerToken ? await verifyAccessToken(bearerToken) : null;
    const result = await verifyPhoneCode({
      otpCode: body.otpCode,
      userId: body.userId ?? verifiedToken?.sub,
    });

    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Phone verification failed";
    const statusCode = message.includes("required") || message.includes("expired") || message.includes("Invalid") || message.includes("No active") ? 400 : 500;

    return res.status(statusCode).json({ error: message });
  }
}
