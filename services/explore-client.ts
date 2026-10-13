import { z } from "zod";
import {
  exploreFiltersToSearchParams,
  type ExploreFilters,
} from "../app/explore-params";
import type { ServiceResult, TmdbServiceError } from "./tmdb-service";

// Browser-safe on purpose (plan.md D18): no server guard, no secrets. It
// talks to our own /api/explore proxy, never to TMDB. Zod re-validates
// the proxy's JSON instead of trusting it (constitution §4).
const MoviePageSchema = z.object({
  movies: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      posterUrl: z.string().nullable(),
      releaseYear: z.number().nullable(),
      rating: z.number().nullable(),
    })
  ),
  page: z.number(),
  totalPages: z.number(),
});

export type ExploreMoviePage = z.infer<typeof MoviePageSchema>;

// What the proxy sends with a 502 (see app/api/explore/route.ts).
const ProxyErrorSchema = z.object({
  reason: z.enum(["network", "http", "invalid_response"]),
  status: z.number().optional(),
});

async function toHttpError(response: Response): Promise<TmdbServiceError> {
  if (response.status === 502) {
    try {
      const parsed = ProxyErrorSchema.safeParse(await response.json());
      if (parsed.success) return parsed.data;
    } catch {
      // Falls through to the generic HTTP error below.
    }
  }
  return { reason: "http", status: response.status };
}

export async function fetchExplorePage(
  filters: ExploreFilters,
  page: number,
  signal?: AbortSignal
): Promise<ServiceResult<ExploreMoviePage>> {
  const params = exploreFiltersToSearchParams(filters);
  params.set("page", String(page));

  let response: Response;
  try {
    const url = new URL("/api/explore", window.location.origin);
    url.search = params.toString();
    response = await fetch(url, { signal });
  } catch {
    // Includes an aborted signal: a superseded request is not a result.
    return { ok: false, error: { reason: "network" } };
  }

  if (!response.ok) {
    return { ok: false, error: await toHttpError(response) };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { ok: false, error: { reason: "invalid_response" } };
  }

  const parsed = MoviePageSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: { reason: "invalid_response" } };
  }
  return { ok: true, data: parsed.data };
}
