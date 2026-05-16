"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

export function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const active = pathname != null && (pathname === href || (href !== "/" && pathname.startsWith(href)));

  return (
    <Link
      href={href}
      style={{
        color: active ? "#00ffb4" : "#64748b",
        textDecoration: "none",
        textTransform: "uppercase" as const,
        fontSize: 12,
        letterSpacing: "0.08em",
        fontWeight: active ? 700 : 400,
        position: "relative" as const,
        paddingBottom: 2,
        transition: "color 0.15s",
      }}
    >
      {children}
      {active && (
        <span
          style={{
            position: "absolute",
            bottom: -2,
            left: 0,
            right: 0,
            height: 1,
            background: "#00ffb4",
            boxShadow: "0 0 8px rgba(0,255,180,0.6)",
          }}
        />
      )}
    </Link>
  );
}
