import Link from "next/link";

type PostSummary = {
  slug: string;
  title: string;
  summary: string;
};

export function Post({ post }: { post: PostSummary }) {
  return (
    <article
      style={{
        padding: 18,
        borderRadius: 18,
        background: "rgba(255, 248, 239, 0.72)",
        border: "1px solid rgba(31, 20, 8, 0.12)",
      }}
    >
      <h2 style={{ margin: "0 0 8px", fontSize: 24 }}>
        <Link href={`/blog/${post.slug}`} style={{ color: "inherit" }}>
          {post.title}
        </Link>
      </h2>
      <p style={{ margin: 0, lineHeight: 1.6 }}>{post.summary}</p>
    </article>
  );
}
