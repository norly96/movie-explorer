import type { Metadata } from "next";
import { TmdbAttribution } from "../../components/TmdbAttribution";
import { aboutMetadata } from "../site-metadata";

export const metadata: Metadata = aboutMetadata;

// The About page (home-redesign RF-30). Its content is, for now, only what
// TMDB's terms require of an application that uses its data; anything else
// (links, how the project was built) is for a later spec. The main area comes
// from the root layout, so the page does not declare its own.
export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 lg:px-8">
      <h1 className="text-xl font-semibold text-foreground">About</h1>
      <TmdbAttribution />
    </div>
  );
}
