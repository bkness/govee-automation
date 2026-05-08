"use client";

import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";

type HoverPrefetchLinkProps = LinkProps & {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export default function HoverPrefetchLink({
  children,
  className,
  style,
  ...props
}: HoverPrefetchLinkProps) {
  return (
    <Link {...props} className={className} style={style} prefetch={false}>
      {children}
    </Link>
  );
}
