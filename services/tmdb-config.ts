import "server-only";

export interface TmdbConfig {
  accessToken: string;
  baseUrl: string;
  imageBaseUrl: string;
}

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

// Reads and validates TMDB_ACCESS_TOKEN on every call rather than once
// at module load, so the caller (tmdb-service.ts) fails fast — before
// the TMDB request — with a clear message instead of a cryptic 401.
export function getTmdbConfig(): TmdbConfig {
  const accessToken = process.env.TMDB_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error(
      "Missing TMDB_ACCESS_TOKEN environment variable. Set it in " +
        ".env.local (see .env.example)."
    );
  }

  return {
    accessToken,
    baseUrl: TMDB_BASE_URL,
    imageBaseUrl: TMDB_IMAGE_BASE_URL,
  };
}
