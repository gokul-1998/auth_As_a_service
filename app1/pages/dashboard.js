export async function getServerSideProps({ req }) {
  // Fetch user via our API proxy which reads the HttpOnly cookie
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(base + "/api/me", {
    headers: { cookie: req.headers.cookie || "" },
  });

  if (res.status === 401) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const data = await res.json();
  return { props: { user: data?.user || null } };
}

export default function Dashboard({ user }) {
  return (
    <main style={{ padding: 24 }}>
      <h1>Dashboard</h1>
      <p>Authenticated as: <b>{user}</b></p>
      <form method="post" action="/api/auth/logout">
        <button type="submit">Logout</button>
      </form>
    </main>
  );
}
