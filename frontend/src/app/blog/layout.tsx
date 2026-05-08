import type { ReactNode } from "react";

export default function BlogLayout({ children }: { children: ReactNode }) {
  return <section style={{ display: "grid", gap: 24 }}>{children}</section>;
}
