import type { Metadata } from "next";
import { siteConfig } from "./site-config";

// Titles and descriptions of the pages that have their own (home-redesign
// RF-34), in place of the framework's default text. Kept as plain data so they
// can be tested without rendering the layout.
//
// Any page that does not name itself (the movie detail page, until the audit
// spec) gets the default title.

const NAME = siteConfig.name;

export const defaultMetadata: Metadata = {
  title: {
    default: NAME,
    template: `%s | ${NAME}`,
  },
  description:
    "Browse popular movies, filter them by genre and year, and search by title. Data from the TMDB API.",
};

// `absolute` skips the template: the home's title reads as a whole.
export const homeMetadata: Metadata = {
  title: { absolute: `${NAME}: browse popular movies` },
  description:
    "Discover popular movies, narrow them by genre, year and sort order, or search by title, with infinite scrolling. Powered by the TMDB API.",
};

// Completed by the template: "About | Movie-explorer".
export const aboutMetadata: Metadata = {
  title: "About",
  description:
    "About Movie-explorer, a movie browser built with Next.js, and the attribution to TMDB, the source of its data.",
};
