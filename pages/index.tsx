const endpoints = [
  "POST /api/auth/register",
  "POST /api/auth/login",
  "POST /api/auth/verify-phone",
  "POST /api/auth/refresh-token",
  "GET /api/users/profile",
  "GET /api/users/[id]",
  "GET /api/health",
];

export default function HomePage() {
  return (
    <main style={{ fontFamily: "Arial, sans-serif", margin: "0 auto", maxWidth: 860, padding: "48px 24px" }}>
      <h1>ytingbackend</h1>
      <p>Vercel-ready Next.js backend for Yting mobile APIs.</p>
      <h2>Available endpoints</h2>
      <ul>
        {endpoints.map((endpoint) => (
          <li key={endpoint}>{endpoint}</li>
        ))}
      </ul>
      <p>See /instructionA.md in the repository for local setup, deployment, and API testing steps.</p>
    </main>
  );
}
