import "server-only";
import { getTmdbConfig } from "./tmdb-config";
import {
  TmdbMovieDetailRawSchema,
  toMovieDetail,
  type MovieDetail,
} from "./schemas/movie-detail-schema";

export type MovieDetailErrorReason =
  | "not_found"
  | "network"
  | "http"
  | "invalid_response";

export interface MovieDetailError {
  reason: MovieDetailErrorReason;
  status?: number; // present when reason === "http"
}

export type MovieDetailResult =
  | { ok: true; data: MovieDetail }
  | { ok: false; error: MovieDetailError };

type RawFetchResult =
  | { ok: true; raw: unknown }
  | { ok: false; error: MovieDetailError };

async function fetchMovieDetailRaw(
  id: number,
  baseUrl: string,
  accessToken: string,
  language: string | null
): Promise<RawFetchResult> {
  const languageParam = language ? `&language=${language}` : "";

  let response: Response;
  try {
    response = await fetch(
      `${baseUrl}/movie/${id}?append_to_response=credits,videos,images${languageParam}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        // A movie's cast/trailer/images change far less often than a
        // "popular" ranking (plan.md decision #9).
        next: { revalidate: 86400 },
      }
    );
  } catch {
    return { ok: false, error: { reason: "network" } };
  }

  if (response.status === 404) {
    return { ok: false, error: { reason: "not_found" } };
  }

  if (!response.ok) {
    return { ok: false, error: { reason: "http", status: response.status } };
  }

  try {
    return { ok: true, raw: await response.json() };
  } catch {
    return { ok: false, error: { reason: "invalid_response" } };
  }
}

// Doesn't catch getTmdbConfig()'s throw: same reasoning as
// tmdb-service.ts — a missing env var is a configuration bug, left
// to app/error.tsx's full-page boundary.
export async function getMovieDetails(
  id: number
): Promise<MovieDetailResult> {
  const { accessToken, baseUrl, imageBaseUrl } = getTmdbConfig();

  const primary = await fetchMovieDetailRaw(id, baseUrl, accessToken, "en-US");
  if (!primary.ok) return primary;

  const parsed = TmdbMovieDetailRawSchema.safeParse(primary.raw);
  if (!parsed.success) {
    return { ok: false, error: { reason: "invalid_response" } };
  }

  let movie = toMovieDetail(parsed.data, imageBaseUrl);

  // RF-4's language fallback: only fired when en-US has no qualifying
  // trailer. Its response goes through the same schema as the
  // primary request — not a special, unvalidated case. A failure
  // here never fails the overall result; trailerKey just stays null.
  if (movie.trailerKey === null) {
    const fallback = await fetchMovieDetailRaw(id, baseUrl, accessToken, null);
    if (fallback.ok) {
      const fallbackParsed = TmdbMovieDetailRawSchema.safeParse(fallback.raw);
      if (fallbackParsed.success) {
        movie = {
          ...movie,
          trailerKey: toMovieDetail(fallbackParsed.data, imageBaseUrl)
            .trailerKey,
        };
      }
    }
  }

  return { ok: true, data: movie };
}
