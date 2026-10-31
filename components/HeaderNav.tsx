"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The header's two navigation links, with the current page marked
// (home-redesign RF-2). It is the only client part of the header: it needs the
// pathname, and it is still rendered by the server with the right marking.
//
// The current page is shown by more than color: accent text, bolder text and a
// 2px accent underline (docs/design.md → SiteHeader), and it is exposed to
// assistive technology with aria-current. The other link reserves the same
// transparent underline so nothing shifts when the current page changes.
const LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
] as const;

export function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex items-stretch gap-6">
      {LINKS.map(({ href, label }) => {
        const current = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={`flex min-w-(--size-icon-button) items-center justify-center border-b-2 text-base ${
              current
                ? "border-accent font-semibold text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
