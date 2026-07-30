import type { NextApiRequest, NextApiResponse } from "next";

import { getUserById } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const requesterIdHeader = req.headers["x-user-id"];
  const requesterAdminHeader = req.headers["x-user-admin"];
  const requesterId = Array.isArray(requesterIdHeader) ? requesterIdHeader[0] : requesterIdHeader;
  const requesterIsAdmin = (Array.isArray(requesterAdminHeader) ? requesterAdminHeader[0] : requesterAdminHeader) === "true";
  const requestedId = typeof req.query.id === "string" ? req.query.id : req.query.id?.[0];

  if (!requesterId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!requestedId) {
    return res.status(400).json({ error: "User id is required" });
  }

  if (!requesterIsAdmin && requesterId !== requestedId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const user = await getUserById(requestedId);
    return res.status(200).json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load user";
    return res.status(500).json({ error: message });
  }
}
