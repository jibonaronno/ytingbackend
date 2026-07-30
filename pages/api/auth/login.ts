import type { NextApiRequest, NextApiResponse } from "next";

import { getRequestMeta, loginUser } from "@/lib/auth";
import type { LoginPayload } from "@/lib/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = req.body as LoginPayload;
    const result = await loginUser(payload, {
      ...getRequestMeta(req),
      continent: payload.continent,
    });

    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    const statusCode = message.includes("required") || message.includes("Invalid credentials") || message.includes("inactive") || message.includes("locked") ? 400 : 500;

    return res.status(statusCode).json({ error: message });
  }
}
