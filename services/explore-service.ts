import "server-only";
import type { ZodType } from "zod";
import type { SortOption } from "../app/explore-params";
import { getTmdbConfig } from "./tmdb-config";
import {
  TmdbGenreListRawSchema,
  type Genre,
} from "./schemas/genre-schema";
import {
  TmdbPopularResponseRawSchema,
  toMovie,
  type Movie,
} from "./schemas/movie-schema";
import type { ServiceResult } from "./tmdb-service";

export interface MoviePage {
  movies: Movie[];
  page: number;
  totalPages: number;
}

// plan.md D8: without a floor, a handful of 10/10 votes on an obscure
// title would outrank genuinely well-reviewed movies.
export const MIN_VOTE_COUNT_FOR_RATING_SORT = 200;

const GENRES_REVALIDATE_SECONDS = 86400;
const MOVIES_REVALIDATE_SECONDS = 3600;

// Like tmdb-service.ts, doesn't catch getTmdbConfig()'s throw: a missing
// env var is a configuration bug, not a "request failed".
async function tmdbGet<TRaw>(
  path: string,
  params: Record<string, string>,
  schema: ZodType<TRaw>,
  revalidate: number,
  signal?: AbortSignal
): Promise<ServiceResult<TRaw>> {
  const { accessToken, baseUrl } = getTmdbConfig();
  const query = new URLSearchParams({ language: "en-US", ...params });

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}?${query}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      next: { revalidate },
      signal,
    });
  } catch {
    // Includes an aborted signal: a superseded request is not a result.
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

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: { reason: "invalid_response" } };
  }
  return { ok: true, data: parsed.data };
}

async function getMoviePage(
  path: string,
  params: Record<string, string>,
  signal?: AbortSignal
): Promise<ServiceResult<MoviePage>> {
  const result = await tmdbGet(
    path,
    params,
    TmdbPopularResponseRawSchema,
    MOVIES_REVALIDATE_SECONDS,
    signal
  );
  if (!result.ok) return result;

  const { imageBaseUrl } = getTmdbConfig();
  return {
    ok: true,
    data: {
      movies: result.data.results.map((raw) => toMovie(raw, imageBaseUrl)),
      page: result.data.page,
      totalPages: result.data.total_pages,
    },
  };
}

export async function getGenres(): Promise<ServiceResult<Genre[]>> {
  const result = await tmdbGet(
    "/genre/movie/list",
    {},
    TmdbGenreListRawSchema,
    GENRES_REVALIDATE_SECONDS
  );
  return result.ok ? { ok: true, data: result.data.genres } : result;
}

export function getPopularMoviesPage(
  page: number,
  signal?: AbortSignal
): Promise<ServiceResult<MoviePage>> {
  return getMoviePage("/movie/popular", { page: String(page) }, signal);
}

export function getDiscoverMovies(
  filters: {
    genreId: number | null;
    year: number | null;
    sort: SortOption | null;
  },
  page: number,
  signal?: AbortSignal
): Promise<ServiceResult<MoviePage>> {
  const params: Record<string, string> = { page: String(page) };

  if (filters.genreId !== null) params.with_genres = String(filters.genreId);
  // D7: primary_release_year, not year.
  if (filters.year !== null) params.primary_release_year = String(filters.year);
  if (filters.sort !== null) params.sort_by = filters.sort;
  if (filters.sort === "vote_average.desc") {
    params["vote_count.gte"] = String(MIN_VOTE_COUNT_FOR_RATING_SORT);
  }

  return getMoviePage("/discover/movie", params, signal);
}

export function getSearchMovies(
  query: string,
  page: number,
  signal?: AbortSignal
): Promise<ServiceResult<MoviePage>> {
  return getMoviePage(
    "/search/movie",
    { query, page: String(page) },
    signal
  );
}
