import type { NextApiRequest, NextApiResponse } from "next";

import { getUserById } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userIdHeader = req.headers["x-user-id"];
  const userId = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const user = await getUserById(userId);
    return res.status(200).json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load profile";
    return res.status(500).json({ error: message });
  }
}
