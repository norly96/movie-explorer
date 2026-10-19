import Image from "next/image";

// What TMDB's API terms of use (section 3) require of an application that uses
// its data: the notice, in or on the application, and TMDB's logo, which must be
// less prominent than the application's own name and mark and must not imply
// any endorsement (home-redesign RF-30). Both are used as TMDB gives them: the
// notice word for word, the logo unmodified.
export const TMDB_NOTICE =
  "This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.";

// Presentation only. The logo is small (24px high, next to a 20px site name and
// a 28px logo in the header) and the notice is body-small text.
export function TmdbAttribution() {
  return (
    <div className="flex flex-col items-start gap-4">
      <Image
        src="/tmdb-logo.svg"
        alt="TMDB"
        width={273}
        height={36}
        className="h-6 w-auto"
      />
      <p className="max-w-prose text-sm text-muted">{TMDB_NOTICE}</p>
    </div>
  );
}
