// The site's name and the three external links of the header (home-redesign
// RF-3). The addresses are the maintainer's own and are filled in later; while
// one is empty its link is simply not shown, so no dead link is ever
// published.

export type SiteLinkId = "site" | "linkedin" | "github";

export interface SiteConfig {
  name: string;
  links: Record<SiteLinkId, string>; // "" until the maintainer fills it in
}

export interface SiteLink {
  id: SiteLinkId;
  label: string;
  href: string;
}

export const siteConfig: SiteConfig = {
  name: "Movie-explorer",
  links: {
    site: "",
    linkedin: "",
    github: "",
  },
};

// The order the links appear in the header.
const LINKS: { id: SiteLinkId; label: string }[] = [
  { id: "site", label: "Author's site" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "github", label: "GitHub" },
];

// A complete https address: the scheme, two slashes and a host. Anything else
// (empty, another scheme, no scheme, no host) is not published.
function isCompleteHttpsAddress(address: string): boolean {
  if (!/^https:\/\//i.test(address)) return false;
  try {
    return new URL(address).hostname !== "";
  } catch {
    return false;
  }
}

export function visibleLinks(config: SiteConfig): SiteLink[] {
  return LINKS.flatMap(({ id, label }) => {
    const href = config.links[id].trim();
    return isCompleteHttpsAddress(href) ? [{ id, label, href }] : [];
  });
}
