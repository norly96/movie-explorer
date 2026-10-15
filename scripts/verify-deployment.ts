// Decision logic of the post-deployment verification (specs/deploy-ci, RF-13
// and RF-14): probe a deployment's home page and movie-list API and report
// whether it is healthy.
//
// Deliberately dependency-free and limited to erasable TypeScript syntax (no
// enums, namespaces or parameter properties): Node.js runs it directly through
// type stripping, so the workflow that uses it needs no install step. It is
// single-shot; retrying belongs to the entry point.

export type ProbeName = "home" | "movie-list-api";

export interface ProbeResult {
  probe: ProbeName;
  url: string; // the address that was requested
  ok: boolean;
  status: number | null; // null when no response arrived (network error, timeout)
  detail: string; // human-readable reason when ok is false, "" otherwise
}

export interface VerificationResult {
  target: string; // base address, without a trailing slash
  healthy: boolean; // true only if every probe is ok
  probes: ProbeResult[]; // always both probes, in a fixed order
}

export interface VerifyOptions {
  timeoutMs: number; // applied to each request separately
  fetchFn?: typeof fetch; // injectable, defaults to the global fetch
}

function isSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

// Our own API's response, not a TMDB one: a small hand-written guard is
// enough here (constitution §4 concerns TMDB responses).
function movieCount(body: unknown): number | null {
  if (typeof body !== "object" || body === null) return null;
  const movies = (body as { movies?: unknown }).movies;
  return Array.isArray(movies) ? movies.length : null;
}

function failure(
  probe: ProbeName,
  url: string,
  status: number | null,
  detail: string
): ProbeResult {
  return { probe, url, ok: false, status, detail };
}

async function request(
  url: string,
  options: VerifyOptions
): Promise<{ response: Response } | { error: string }> {
  const fetchFn = options.fetchFn ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetchFn(url, { signal: controller.signal });
    return { response };
  } catch (error) {
    return controller.signal.aborted
      ? { error: `timed out after ${options.timeoutMs} ms` }
      : {
          error: `network error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
  } finally {
    clearTimeout(timer);
  }
}

async function probeHome(
  url: string,
  options: VerifyOptions
): Promise<ProbeResult> {
  const result = await request(url, options);
  if ("error" in result) return failure("home", url, null, result.error);

  const { status } = result.response;
  return isSuccess(status)
    ? { probe: "home", url, ok: true, status, detail: "" }
    : failure("home", url, status, `HTTP ${status}`);
}

async function probeMovieListApi(
  url: string,
  options: VerifyOptions
): Promise<ProbeResult> {
  const probe = "movie-list-api";
  const result = await request(url, options);
  if ("error" in result) return failure(probe, url, null, result.error);

  const { response } = result;
  const { status } = response;
  if (!isSuccess(status)) return failure(probe, url, status, `HTTP ${status}`);

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return failure(probe, url, status, "response is not valid JSON");
  }

  const count = movieCount(body);
  if (count === null) {
    return failure(probe, url, status, "response is not the expected shape (no movies array)");
  }
  if (count === 0) {
    return failure(probe, url, status, "the response has no movies");
  }
  return { probe, url, ok: true, status, detail: "" };
}

export async function verifyDeployment(
  target: string,
  options: VerifyOptions
): Promise<VerificationResult> {
  const base = target.replace(/\/+$/, "");

  const probes = await Promise.all([
    probeHome(`${base}/`, options),
    probeMovieListApi(`${base}/api/explore?page=1`, options),
  ]);

  return { target: base, healthy: probes.every((probe) => probe.ok), probes };
}
