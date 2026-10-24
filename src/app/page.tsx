import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 15% 10%, rgba(37, 99, 235, 0.10), transparent 28%), radial-gradient(circle at 85% 5%, rgba(59, 130, 246, 0.08), transparent 24%), linear-gradient(180deg, #eef4ff 0%, #f8fafc 48%, #ffffff 100%)",
        color: "#0f172a",
        padding: "48px 24px",
      }}
    >
      <div
        style={{
          maxWidth: "960px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "24px",
            marginBottom: "72px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontWeight: 800,
              fontSize: "24px",
            }}
          >
            <img
              src="/icon.svg"
              alt="Minderra"
              width="40"
              height="40"
              style={{ borderRadius: "10px" }}
            />
            Minderra
          </div>

          <Link
            href="/login"
            style={{
              textDecoration: "none",
              padding: "10px 18px",
              borderRadius: "10px",
              background: "#0f172a",
              color: "white",
              fontWeight: 700,
            }}
          >
            Sign in
          </Link>
        </header>

        <section
          style={{
            maxWidth: "760px",
            marginBottom: "72px",
          }}
        >
          <p
            style={{
              marginBottom: "16px",
              color: "#2563eb",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontSize: "14px",
            }}
          >
            Personal information guard
          </p>

          <h1
            style={{
              fontSize: "clamp(42px, 7vw, 72px)",
              lineHeight: 1.02,
              margin: 0,
              letterSpacing: "-0.04em",
            }}
          >
            Your personal money, time, and information guard.
          </h1>

          <p
            style={{
              marginTop: "24px",
              fontSize: "20px",
              lineHeight: 1.6,
              color: "#475569",
              maxWidth: "680px",
            }}
          >
            Minderra helps you keep track of expenses, tasks, messages, and
            connected services from one protected personal dashboard.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              marginTop: "32px",
            }}
          >
            <Link
              href="/signup"
              style={{
                display: "inline-block",
                textDecoration: "none",
                padding: "13px 20px",
                borderRadius: "10px",
                background: "#2563eb",
                color: "white",
                fontWeight: 800,
              }}
            >
              Create an account
            </Link>

            <Link
              href="/login"
              style={{
                display: "inline-block",
                textDecoration: "none",
                padding: "13px 20px",
                borderRadius: "10px",
                background: "white",
                color: "#0f172a",
                border: "1px solid #cbd5e1",
                fontWeight: 800,
              }}
            >
              Sign in
            </Link>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "72px",
          }}
        >
          {[
            {
              title: "Money",
              text: "Track expenses and organize the financial activity you choose to connect.",
            },
            {
              title: "Time",
              text: "Turn information and messages into practical tasks and reminders.",
            },
            {
              title: "Information",
              text: "Bring supported services together while keeping access behind your account.",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "16px",
                padding: "24px",
              }}
            >
              <h2 style={{ marginTop: 0 }}>{item.title}</h2>
              <p
                style={{
                  marginBottom: 0,
                  color: "#475569",
                  lineHeight: 1.6,
                }}
              >
                {item.text}
              </p>
            </div>
          ))}
        </section>

        <footer
          style={{
            borderTop: "1px solid #e2e8f0",
            paddingTop: "24px",
            display: "flex",
            flexWrap: "wrap",
            gap: "20px",
            color: "#64748b",
          }}
        >
          <Link href="/privacy" style={{ color: "inherit" }}>
            Privacy Policy
          </Link>

          <Link href="/terms" style={{ color: "inherit" }}>
            Terms of Service
          </Link>

          <a
            href="https://t.me/+ZWWQ5O-a0c9lNDU0"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#0369a1",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Join our Telegram Community ↗
          </a>
        </footer>
      </div>
    </main>
  );
}
