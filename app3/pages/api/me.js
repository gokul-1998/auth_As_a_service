const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://127.0.0.1:8000";
const COOKIE_NAME = process.env.COOKIE_NAME || "token";

export default async function handler(req, res) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/me?token=${encodeURIComponent(token)}`);
    const data = await response.json();

    if (!response.ok) return res.status(401).json({ error: data?.detail || "Invalid token" });

    return res.status(200).json({ user: data.user });
  } catch (err) {
    console.error("/api/me error", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
