// Entry point of the post-deployment verification (specs/deploy-ci, RF-14 and
// RF-15). Run by the workflow as:
//
//   node scripts/verify-deployment-cli.ts <address> [--timeout <ms>] [--attempts <n>] [--delay <ms>]
//
// Exit codes: 0 = healthy · 1 = unhealthy (report printed) · 2 = bad usage.
//
// Retrying lives here, not in the library: a deployment can be reported as
// ready a moment before its address answers, so an unhealthy result is
// repeated a bounded number of times before it counts as a failure.
//
// Node built-ins and the sibling library only, and only erasable TypeScript
// syntax: Node runs this file directly, with no install or build step. Imports
// of a TypeScript file must name the `.ts` extension for that reason.

import { parseArgs } from "node:util";
import { verifyDeployment, type VerificationResult } from "./verify-deployment.ts";

const USAGE =
  "usage: node scripts/verify-deployment-cli.ts <address> [--timeout <ms>] [--attempts <n>] [--delay <ms>]";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_ATTEMPTS = 3;
const DEFAULT_DELAY_MS = 5_000;

interface CliOptions {
  target: string;
  timeoutMs: number;
  attempts: number;
  delayMs: number;
}

class UsageError extends Error {}

function integerOption(
  name: string,
  value: string | undefined,
  fallback: number,
  minimum: number
): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum) {
    throw new UsageError(
      `--${name} must be an integer of at least ${minimum} (got "${value}")`
    );
  }
  return parsed;
}

function parseCli(argv: string[]): CliOptions {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: {
        timeout: { type: "string" },
        attempts: { type: "string" },
        delay: { type: "string" },
      },
    });
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : String(error));
  }

  const [target, ...extra] = parsed.positionals;
  if (target === undefined) throw new UsageError("missing address");
  if (extra.length > 0) throw new UsageError("only one address is allowed");

  let url: URL;
  try {
    url = new URL(target);
  } catch {
    throw new UsageError(`the address is not a valid URL: "${target}"`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UsageError(`the address must be http or https: "${target}"`);
  }

  return {
    target,
    timeoutMs: integerOption("timeout", parsed.values.timeout, DEFAULT_TIMEOUT_MS, 1),
    attempts: integerOption("attempts", parsed.values.attempts, DEFAULT_ATTEMPTS, 1),
    delayMs: integerOption("delay", parsed.values.delay, DEFAULT_DELAY_MS, 0),
  };
}

function describeAttempt(
  result: VerificationResult,
  attempt: number,
  attempts: number
): string {
  const lines = [`Verifying ${result.target} (attempt ${attempt} of ${attempts})`];
  for (const probe of result.probes) {
    const mark = probe.ok ? "[ok]  " : "[fail]";
    const status = probe.status === null ? "no response" : `HTTP ${probe.status}`;
    const reason = probe.ok ? "" : ` — ${probe.detail}`;
    lines.push(`  ${mark} ${probe.probe.padEnd(14)} ${status}${reason}`);
  }
  return lines.join("\n");
}

function summary(result: VerificationResult): string {
  const parts = result.probes.map(
    (probe) => `${probe.probe}: ${probe.status === null ? "none" : probe.status}`
  );
  return `summary: ${parts.join(", ")}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(argv: string[]): Promise<number> {
  let options: CliOptions;
  try {
    options = parseCli(argv);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    console.error(`error: ${error.message}\n${USAGE}`);
    return 2;
  }

  let result: VerificationResult | undefined;
  for (let attempt = 1; attempt <= options.attempts; attempt++) {
    result = await verifyDeployment(options.target, {
      timeoutMs: options.timeoutMs,
    });
    console.log(describeAttempt(result, attempt, options.attempts));
    if (result.healthy) break;
    if (attempt < options.attempts) {
      console.log(`  not healthy yet; waiting ${options.delayMs} ms before retrying`);
      await sleep(options.delayMs);
    }
  }

  // attempts is at least 1, so the loop always ran.
  const final = result as VerificationResult;
  console.log(final.healthy ? "Result: healthy" : "Result: unhealthy");
  console.log(summary(final));
  return final.healthy ? 0 : 1;
}

process.exitCode = await main(process.argv.slice(2));
