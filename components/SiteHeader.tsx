import Link from "next/link";
import {
  siteConfig,
  visibleLinks,
  type SiteConfig,
  type SiteLink,
  type SiteLinkId,
} from "../app/site-config";
import { HeaderNav } from "./HeaderNav";
import { AuthorLogoIcon } from "./icons/AuthorLogoIcon";
import { ClapperboardIcon } from "./icons/ClapperboardIcon";
import { GitHubIcon } from "./icons/GitHubIcon";
import { LinkedInIcon } from "./icons/LinkedInIcon";

export interface SiteHeaderProps {
  config?: SiteConfig;
}

const ICONS: Record<SiteLinkId, typeof AuthorLogoIcon> = {
  site: AuthorLogoIcon,
  linkedin: LinkedInIcon,
  github: GitHubIcon,
};

function Brand({ name }: { name: string }) {
  return (
    <Link
      href="/"
      aria-label={`${name}, home`}
      className="flex items-center gap-2 text-foreground"
    >
      <ClapperboardIcon size={28} />
      {/* Hidden visually below `xs` (360px), where brand and icons no longer fit
          side by side; the logo and the link's accessible name remain. */}
      <span className="sr-only text-lg font-semibold xs:not-sr-only">{name}</span>
    </Link>
  );
}

function ExternalLinks({ links, gap }: { links: SiteLink[]; gap: string }) {
  return (
    <div className={`flex ${gap}`}>
      {links.map(({ id, label, href }) => {
        const Icon = ICONS[id];
        return (
          <a
            key={id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${label} (opens in a new tab)`}
            className="flex size-(--size-icon-button) items-center justify-center rounded-md border border-border text-muted hover:border-accent hover:text-accent"
          >
            <Icon size={20} />
          </a>
        );
      })}
    </div>
  );
}

// The header of every page (home-redesign RF-1, RF-3, RF-4), in two layouts of
// the same content and CSS shows one: below `lg` the brand and the external links
// share the first row and "Home" and "About" take the second; from `lg` it is one
// row. Rendering both, instead of reordering one with CSS, keeps the keyboard
// order equal to the visual order at every width; the hidden layout is
// display:none, so it is out of the tab order and the accessibility tree.
//
// It is not fixed (it scrolls away with the page) and draws no border: the faint
// tint is what sets it apart (docs/design.md → SiteHeader).
export function SiteHeader({ config = siteConfig }: SiteHeaderProps) {
  const links = visibleLinks(config);

  return (
    <header className="header-tint">
      <div data-variant="wide" className="hidden lg:block">
        <div className="mx-auto flex h-(--size-header) max-w-7xl items-center gap-8 px-8">
          <Brand name={config.name} />
          <div className="flex self-stretch">
            <HeaderNav />
          </div>
          <div className="ml-auto">
            <ExternalLinks links={links} gap="gap-2" />
          </div>
        </div>
      </div>

      <div data-variant="narrow" className="lg:hidden">
        <div className="flex h-(--size-header-narrow) items-center justify-between px-4">
          <Brand name={config.name} />
          <ExternalLinks links={links} gap="gap-1" />
        </div>
        <div className="flex h-(--size-control) px-4">
          <HeaderNav />
        </div>
      </div>
    </header>
  );
}
