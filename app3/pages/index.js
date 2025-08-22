export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>App1</h1>
      <p>Welcome. Try the Dashboard (protected) or Login.</p>
      <ul>
        <li><a href="/login">Login</a></li>
        <li><a href="/dashboard">Dashboard</a></li>
      </ul>
    </main>
  );
}
