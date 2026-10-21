import type { Metadata } from "next";
import { ExplorerClient } from "./ExplorerClient";
import { resolveExplorePage } from "./resolve-explore-page";
import { homeMetadata } from "./site-metadata";

export const metadata: Metadata = homeMetadata;

// Server Component: parses the URL, fetches the genre list and the first
// page in parallel, and hands both to the client explorer so the initial
// view is server-rendered (constitution §3).
export default async function Home({ searchParams }: PageProps<"/">) {
  const { genres, initial } = await resolveExplorePage(await searchParams);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-(--back-to-top-reserve) pt-8 lg:px-8">
      <ExplorerClient genres={genres} initial={initial} />
    </div>
  );
}
