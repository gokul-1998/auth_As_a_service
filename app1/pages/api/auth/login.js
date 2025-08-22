import cookie from "cookie";

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://127.0.0.1:8000";
const COOKIE_NAME = process.env.COOKIE_NAME || "token_app1";
const COOKIE_MAX_AGE = parseInt(process.env.COOKIE_MAX_AGE || "1800", 10); // 30m
const COOKIE_SECURE = (process.env.COOKIE_SECURE || "false").toLowerCase() === "true";
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || (COOKIE_SECURE ? "none" : "lax");
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined; // e.g., .mycompany.com

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "Missing credentials" });

    const response = await fetch(`${AUTH_SERVICE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username, password }).toString(),
    });
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data?.detail || "Login failed" });
    }

    const serialized = cookie.serialize(COOKIE_NAME, data.access_token, {
      httpOnly: true,
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      sameSite: COOKIE_SAMESITE,
      secure: COOKIE_SECURE,
      domain: COOKIE_DOMAIN,
    });

    res.setHeader("Set-Cookie", serialized);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("/api/auth/login error", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
