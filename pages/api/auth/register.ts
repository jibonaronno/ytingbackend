import type { NextApiRequest, NextApiResponse } from "next";

import { registerUser } from "@/lib/auth";
import type { RegisterPayload } from "@/lib/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const result = await registerUser(req.body as RegisterPayload);
    return res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    const statusCode = message.includes("already exists") || message.includes("required") || message.includes("valid") ? 400 : 500;

    return res.status(statusCode).json({ error: message });
  }
}
