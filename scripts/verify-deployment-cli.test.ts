import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";

// The entry point is tested the way the workflow uses it: as a child process
// started with `node` (no build step) against a tiny local HTTP server. MSW
// cannot intercept another process, so a real server is the right tool here.

const CLI = "scripts/verify-deployment-cli.ts";

const HEALTHY_BODY = JSON.stringify({
  movies: [{ id: 1, title: "A", posterUrl: null, releaseYear: 2000, rating: 7 }],
  page: 1,
  totalPages: 1,
});

interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

const BYPASS_VARIABLE = "VERCEL_AUTOMATION_BYPASS_SECRET";

function run(
  args: string[],
  env: Record<string, string> = {}
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    // The credential is only ever what the test passes in, never the host's.
    const inherited = { ...process.env };
    delete inherited[BYPASS_VARIABLE];
    const child = spawn(process.execPath, [CLI, ...args], {
      cwd: process.cwd(),
      env: { ...inherited, ...env },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

interface StubServer {
  url: string;
  hits: { home: number; api: number };
  server: Server;
}

type Responder = (hit: number) => { status: number; body: string };

const servers: Server[] = [];

function startServer(
  home: Responder,
  api: Responder,
  // When given and false for a request, the request is redirected to a login page.
  allow: (request: IncomingMessage) => boolean = () => true
): Promise<StubServer> {
  const hits = { home: 0, api: 0 };
  const server = createServer((request, response) => {
    if (!allow(request)) {
      response.writeHead(302, { Location: "https://login.example.test/" });
      response.end();
      return;
    }
    const isApi = (request.url ?? "").startsWith("/api/explore");
    const answer = isApi ? api(++hits.api) : home(++hits.home);
    response.writeHead(answer.status, { "Content-Type": "application/json" });
    response.end(answer.body);
  });
  servers.push(server);

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({ url: `http://127.0.0.1:${port}`, hits, server });
    });
  });
}

const ok = (body = "ok"): Responder => () => ({ status: 200, body });
const fail = (status = 500): Responder => () => ({ status, body: "" });

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) => new Promise<void>((resolve) => server.close(() => resolve()))
    )
  );
});

describe("verify-deployment-cli", () => {
  it("exits 0 with a readable report for a healthy deployment (RF-14, RF-15)", async () => {
    const stub = await startServer(ok(), ok(HEALTHY_BODY));

    const result = await run([stub.url, "--attempts", "1"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain(stub.url);
    expect(result.stdout).toContain("home");
    expect(result.stdout).toContain("movie-list-api");
    expect(result.stdout).toMatch(/healthy/i);
    expect(result.stdout).not.toMatch(/unhealthy/i);
  });

  it("prints a final summary line with each probe's status", async () => {
    const stub = await startServer(ok(), fail(502));

    const result = await run([stub.url, "--attempts", "1"]);

    const lastLine = result.stdout.trim().split("\n").at(-1);
    expect(lastLine).toBe("summary: home: 200, movie-list-api: 502");
  });

  it("exits 1 when a probe answers 5xx (RF-14)", async () => {
    const stub = await startServer(fail(500), ok(HEALTHY_BODY));

    const result = await run([stub.url, "--attempts", "1"]);

    expect(result.code).toBe(1);
    expect(result.stdout).toMatch(/unhealthy/i);
    expect(result.stdout).toContain("HTTP 500");
  });

  it("exits 1 when the API returns no movies (RF-13, RF-14)", async () => {
    const stub = await startServer(
      ok(),
      ok(JSON.stringify({ movies: [], page: 1, totalPages: 0 }))
    );

    const result = await run([stub.url, "--attempts", "1"]);

    expect(result.code).toBe(1);
    expect(result.stdout).toMatch(/no movies/i);
  });

  it("exits 1 within a bounded time for an unreachable address (RF-14)", async () => {
    // Port 9 (discard) refuses connections immediately on localhost.
    const result = await run([
      "http://127.0.0.1:9",
      "--attempts",
      "1",
      "--timeout",
      "1000",
    ]);

    expect(result.code).toBe(1);
    expect(result.stdout).toMatch(/network/i);
  });

  it("retries a bounded number of times and stops as soon as it is healthy", async () => {
    // Healthy only from the third round on.
    const stub = await startServer(
      (hit) => (hit < 3 ? { status: 500, body: "" } : { status: 200, body: "ok" }),
      (hit) =>
        hit < 3
          ? { status: 502, body: "" }
          : { status: 200, body: HEALTHY_BODY }
    );

    const result = await run([stub.url, "--attempts", "5", "--delay", "0"]);

    expect(result.code).toBe(0);
    expect(stub.hits.home).toBe(3);
    expect(stub.hits.api).toBe(3);
  });

  it("gives up after the given number of attempts (RF-14)", async () => {
    const stub = await startServer(fail(), fail());

    const result = await run([stub.url, "--attempts", "2", "--delay", "0"]);

    expect(result.code).toBe(1);
    expect(stub.hits.home).toBe(2);
    expect(stub.hits.api).toBe(2);
  });

  it("tries three times by default", async () => {
    const stub = await startServer(fail(), fail());

    const result = await run([stub.url, "--delay", "0"]);

    expect(result.code).toBe(1);
    expect(stub.hits.home).toBe(3);
  });

  describe("bad usage exits with 2 and explains why on stderr", () => {
    it("no argument", async () => {
      const result = await run([]);

      expect(result.code).toBe(2);
      expect(result.stderr).toMatch(/usage/i);
    });

    it("an empty address (for example, an unset variable passed by a workflow)", async () => {
      const result = await run([""]);

      expect(result.code).toBe(2);
      expect(result.stderr).toMatch(/address/i);
    });

    it("an address that is not http(s)", async () => {
      for (const address of ["not a url", "ftp://example.test"]) {
        const result = await run([address]);

        expect(result.code).toBe(2);
        expect(result.stderr).toMatch(/address/i);
      }
    });

    it("an invalid --attempts, --timeout or --delay", async () => {
      for (const args of [
        ["--attempts", "0"],
        ["--attempts", "abc"],
        ["--timeout", "0"],
        ["--timeout", "-5"],
        ["--delay", "-1"],
        ["--delay", "soon"],
      ]) {
        const result = await run(["http://127.0.0.1:9", ...args]);

        expect(result.code).toBe(2);
        expect(result.stderr).toMatch(/--(attempts|timeout|delay)/);
      }
    });

    it("an unknown option or more than one address", async () => {
      expect((await run(["http://127.0.0.1:9", "--nope"])).code).toBe(2);
      expect((await run(["http://127.0.0.1:9", "http://127.0.0.1:9"])).code).toBe(2);
    });
  });

  describe("bypass credential for protected deployments (RF-22)", () => {
    const SECRET = "s3cret-value-123";

    // Answers 302 to a login page unless the credential header is present.
    function startProtectedServer() {
      return startServer(
        () => ({ status: 200, body: "ok" }),
        () => ({ status: 200, body: HEALTHY_BODY }),
        (request) =>
          request.headers["x-vercel-protection-bypass"] === SECRET
      );
    }

    it("is healthy with the credential in the environment and unhealthy without it", async () => {
      const stub = await startProtectedServer();

      const without = await run([stub.url, "--attempts", "1"]);
      const withSecret = await run([stub.url, "--attempts", "1"], {
        [BYPASS_VARIABLE]: SECRET,
      });

      expect(without.code).toBe(1);
      expect(without.stdout).toContain("HTTP 302");
      expect(withSecret.code).toBe(0);
    });

    it("is unhealthy when the credential is wrong", async () => {
      const stub = await startProtectedServer();

      const result = await run([stub.url, "--attempts", "1"], {
        [BYPASS_VARIABLE]: "not-the-secret",
      });

      expect(result.code).toBe(1);
    });

    it("never prints the credential, even when the verification fails", async () => {
      const stub = await startProtectedServer();
      const failing = await startServer(fail(), fail());

      for (const url of [stub.url, failing.url, "http://127.0.0.1:9"]) {
        const result = await run([url, "--attempts", "1", "--timeout", "1000"], {
          [BYPASS_VARIABLE]: "not-the-secret-but-secret-too",
        });

        expect(result.stdout + result.stderr).not.toContain(
          "not-the-secret-but-secret-too"
        );
      }
    });

    it("has no command-line option for the credential", async () => {
      const result = await run(["http://127.0.0.1:9", "--bypass-secret", SECRET]);

      expect(result.code).toBe(2);
      expect(result.stderr).not.toContain(SECRET);
    });
  });

  it("runs on the Node.js version the project declares, without a build step (RF-3)", () => {
    const { engines } = JSON.parse(readFileSync("package.json", "utf-8")) as {
      engines: { node: string };
    };
    const declaredMajor = engines.node.split(".")[0];

    expect(process.versions.node.split(".")[0]).toBe(declaredMajor);
  });
});

describe("verify-deployment-cli.ts source", () => {
  const source = readFileSync(CLI, "utf-8");

  it("imports only Node built-ins and the sibling library", () => {
    const imported = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
      (match) => match[1]
    );

    expect(imported.length).toBeGreaterThan(0);
    for (const specifier of imported) {
      expect(
        specifier.startsWith("node:") || specifier === "./verify-deployment.ts"
      ).toBe(true);
    }
  });

  it("uses only erasable TypeScript syntax", () => {
    expect(source).not.toMatch(/\benum\s+\w+/);
    expect(source).not.toMatch(/\bnamespace\s+\w+/);
    expect(source).not.toMatch(
      /constructor\s*\([^)]*\b(public|private|protected|readonly)\b/
    );
  });
});
