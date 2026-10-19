import { describe, expect, it } from "vitest";
import { siteConfig, visibleLinks, type SiteConfig } from "./site-config";

const EMPTY: SiteConfig = {
  name: "Movie-explorer",
  links: { site: "", linkedin: "", github: "" },
};

function withLinks(links: Partial<SiteConfig["links"]>): SiteConfig {
  return { ...EMPTY, links: { ...EMPTY.links, ...links } };
}

describe("visibleLinks (RF-3)", () => {
  it("returns nothing while every address is empty", () => {
    expect(visibleLinks(EMPTY)).toEqual([]);
  });

  it("returns the three links in a fixed order: site, LinkedIn, GitHub", () => {
    const links = visibleLinks(
      withLinks({
        github: "https://github.com/example",
        site: "https://example.dev",
        linkedin: "https://www.linkedin.com/in/example",
      })
    );

    expect(links.map((link) => link.id)).toEqual(["site", "linkedin", "github"]);
    expect(links.map((link) => link.href)).toEqual([
      "https://example.dev",
      "https://www.linkedin.com/in/example",
      "https://github.com/example",
    ]);
  });

  it("gives each link a label", () => {
    const links = visibleLinks(
      withLinks({
        site: "https://example.dev",
        linkedin: "https://www.linkedin.com/in/example",
        github: "https://github.com/example",
      })
    );

    expect(links.map((link) => link.label)).toEqual([
      "Author's site",
      "LinkedIn",
      "GitHub",
    ]);
  });

  it("hides only the links whose address is empty", () => {
    const links = visibleLinks(withLinks({ github: "https://github.com/example" }));

    expect(links.map((link) => link.id)).toEqual(["github"]);
  });

  it("ignores spaces around an address", () => {
    const links = visibleLinks(withLinks({ site: "  https://example.dev  " }));

    expect(links.map((link) => link.href)).toEqual(["https://example.dev"]);
  });

  it.each([
    ["only spaces", "   "],
    ["http, not https", "http://example.dev"],
    ["a javascript: address", "javascript:alert(1)"],
    ["a data: address", "data:text/html,hi"],
    ["no scheme", "example.dev"],
    ["a scheme-relative address", "//example.dev"],
    ["https with no host", "https://"],
    ["https with a single slash", "https:/example.dev"],
    ["text that is not an address", "not a url"],
    ["a mailto: address", "mailto:me@example.dev"],
  ])("hides an address that is %s", (_label, address) => {
    expect(visibleLinks(withLinks({ site: address }))).toEqual([]);
  });

  it("keeps https in upper case, which browsers treat the same", () => {
    expect(
      visibleLinks(withLinks({ site: "HTTPS://example.dev" })).map((l) => l.id)
    ).toEqual(["site"]);
  });
});

describe("siteConfig", () => {
  it("names the site and has an entry for each of the three links", () => {
    expect(siteConfig.name).toBe("Movie-explorer");
    expect(Object.keys(siteConfig.links).sort()).toEqual([
      "github",
      "linkedin",
      "site",
    ]);
  });

  it("only ever produces https links, whatever the maintainer has filled in", () => {
    for (const link of visibleLinks(siteConfig)) {
      expect(link.href.toLowerCase().startsWith("https://")).toBe(true);
    }
  });
});
