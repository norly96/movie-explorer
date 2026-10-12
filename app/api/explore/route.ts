import { parseExploreParams } from "../../explore-params";
import {
  getDiscoverMovies,
  getPopularMoviesPage,
  getSearchMovies,
} from "../../../services/explore-service";

// plan.md D18: the browser's only way to reach TMDB. It proxies
// explore-service.ts so the access token never leaves the server.
function parsePage(value: string | null): number {
  if (value === null || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return page > 0 ? page : 1;
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const filters = parseExploreParams(searchParams);
  const page = parsePage(searchParams.get("page"));
  const { signal } = request;

  const result =
    filters.mode === "search"
      ? await getSearchMovies(filters.query, page, signal)
      : filters.mode === "discover"
        ? await getDiscoverMovies(filters, page, signal)
        : await getPopularMoviesPage(page, signal);

  if (!result.ok) {
    return Response.json(result.error, { status: 502 });
  }
  return Response.json(result.data);
}
