import Link from "next/link";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "Georgia, Times New Roman, serif",
          background:
            "radial-gradient(circle at top, #f7efe4 0%, #efe2cf 42%, #d5c2a6 100%)",
          color: "#1f1408",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "24px 20px 48px",
          }}
        >
          <nav
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              marginBottom: 32,
            }}
          >
            <Link
              href="/"
              style={{
                color: "inherit",
                textDecoration: "none",
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              Govee Automation
            </Link>
            <div style={{ display: "flex", gap: 16, fontSize: 16 }}>
              <Link href="/dashboard" style={{ color: "inherit" }}>
                Dashboard
              </Link>
              <Link href="/blog" style={{ color: "inherit" }}>
                Notes
              </Link>
            </div>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
