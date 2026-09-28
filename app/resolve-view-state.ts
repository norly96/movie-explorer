import { DEFAULT_MESSAGE } from "../components/ErrorState";
import type { Movie } from "../services/schemas/movie-schema";
import type { ServiceResult } from "../services/tmdb-service";

export type ViewState =
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "grid"; movies: Movie[] };

// Pure, no JSX: keeps the empty/error/grid branching unit-testable
// without rendering the async Server Component that calls it
// (plan.md decision #6 — RSCs can't be rendered with Testing Library).
export function resolveViewState(
  result: ServiceResult<Movie[]>
): ViewState {
  if (!result.ok) {
    return { kind: "error", message: DEFAULT_MESSAGE };
  }

  if (result.data.length === 0) {
    return { kind: "empty" };
  }

  return { kind: "grid", movies: result.data };
}
