import "server-only";
import { getTmdbConfig } from "./tmdb-config";
import {
  TmdbPopularResponseRawSchema,
  toMovie,
  type Movie,
} from "./schemas/movie-schema";

export type TmdbServiceErrorReason = "network" | "http" | "invalid_response";

export interface TmdbServiceError {
  reason: TmdbServiceErrorReason;
  status?: number; // present when reason === "http"
}

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: TmdbServiceError };

// Doesn't catch getTmdbConfig()'s throw: a missing/invalid env var is
// a configuration bug, not a "request failed" per RF-5 — it never
// reaches the network, so it's left to app/error.tsx's full-page
// boundary instead of becoming a ServiceResult (see plan.md's risks).
export async function getPopularMovies(): Promise<ServiceResult<Movie[]>> {
  const { accessToken, baseUrl, imageBaseUrl } = getTmdbConfig();

  let response: Response;
  try {
    response = await fetch(
      `${baseUrl}/movie/popular?language=en-US&page=1`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        // Popular movies change slowly; revalidate at most hourly
        // instead of fetching on every request (plan.md decision #5).
        next: { revalidate: 3600 },
      }
    );
  } catch {
    return { ok: false, error: { reason: "network" } };
  }

  if (!response.ok) {
    return { ok: false, error: { reason: "http", status: response.status } };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { ok: false, error: { reason: "invalid_response" } };
  }

  const parsed = TmdbPopularResponseRawSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: { reason: "invalid_response" } };
  }

  const movies = parsed.data.results.map((raw) => toMovie(raw, imageBaseUrl));
  return { ok: true, data: movies };
}
