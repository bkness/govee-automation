import Link from "next/link";

type PostSummary = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tag: string;
};

const NEON = "#00ffb4";
const CARD_BG = "rgba(15,25,40,0.85)";
const CARD_BORDER = "rgba(255,255,255,0.06)";

const TAG_COLORS: Record<string, string> = {
  backend: "#00ffb4",
  frontend: "#00b4ff",
  infra: "#b47fff",
  auth: "#ff9a3c",
};

export function Post({ post }: { post: PostSummary }) {
  const tagColor = TAG_COLORS[post.tag] ?? NEON;

  return (
    <article
      style={{
        padding: "20px 24px",
        borderRadius: 14,
        background: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        backdropFilter: "blur(12px)",
        display: "grid",
        gap: 10,
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        transition: "border-color 0.2s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{
          fontSize: 10,
          padding: "3px 8px",
          borderRadius: 6,
          border: `1px solid ${tagColor}44`,
          background: `${tagColor}11`,
          color: tagColor,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontFamily: "inherit",
        }}>
          {post.tag}
        </span>
        <span style={{ fontSize: 11, color: "#334155", letterSpacing: "0.06em" }}>
          {post.date}
        </span>
      </div>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: "system-ui, sans-serif", color: "#e2e8f0" }}>
        <Link href={`/blog/${post.slug}`} style={{ color: "inherit", textDecoration: "none" }}>
          {post.title}
        </Link>
      </h2>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: "#64748b", fontFamily: "system-ui, sans-serif" }}>
        {post.summary}
      </p>
      <Link href={`/blog/${post.slug}`} style={{
        fontSize: 11,
        color: NEON,
        textDecoration: "none",
        letterSpacing: "0.08em",
        opacity: 0.7,
      }}>
        Read note ›
      </Link>
    </article>
  );
}
