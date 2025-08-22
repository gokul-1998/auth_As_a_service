import cookie from "cookie";

const COOKIE_NAME = process.env.COOKIE_NAME || "token";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const serialized = cookie.serialize(COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
    sameSite: process.env.COOKIE_SAMESITE || "lax",
    secure: (process.env.COOKIE_SECURE || "false").toLowerCase() === "true",
    domain: COOKIE_DOMAIN,
  });
  res.setHeader("Set-Cookie", serialized);
  return res.status(200).json({ success: true });
}
