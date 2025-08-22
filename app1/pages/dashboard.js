import { useEffect, useState } from "react";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const AUTH_BACKEND = process.env.NEXT_PUBLIC_AUTH_BACKEND || "http://127.0.0.1:8000";

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`${AUTH_BACKEND}/userinfo`, {
          credentials: "include",
        });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch (e) {
        setError("Failed to load user info");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [AUTH_BACKEND]);

  if (loading) return <main style={{ padding: 24 }}><p>Loading...</p></main>;
  if (error) return <main style={{ padding: 24 }}><p style={{ color: '#b00020' }}>{error}</p></main>;

  return (
    <main style={{ padding: 24 }}>
      <h1>Dashboard</h1>
      {user ? (
        <>
          <p>Authenticated as: <b>{user.name || user.email || user.sub}</b></p>
          <pre style={{ background: '#f5f5f5', padding: 12 }}>
            {JSON.stringify(user, null, 2)}
          </pre>
        </>
      ) : (
        <p>No user info</p>
      )}
    </main>
  );
}
