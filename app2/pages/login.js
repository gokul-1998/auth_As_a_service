export default function Login() {
  const AUTH_BACKEND = process.env.NEXT_PUBLIC_AUTH_BACKEND || "http://127.0.0.1:8000";

  const handleGoogleLogin = () => {
    const redirectUri = `${window.location.origin}/dashboard`;
    const url = `${AUTH_BACKEND}/authorize?redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = url;
  };

  return (
    <main style={{ padding: 24, maxWidth: 420 }}>
      <h1>Login</h1>
      <button onClick={handleGoogleLogin}>Continue with Google</button>
    </main>
  );
}
