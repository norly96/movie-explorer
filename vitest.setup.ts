import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Testing Library doesn't auto-register this for Vitest unless
// `test.globals: true` is set (we use explicit imports instead), so
// without it, every render() across a file's tests accumulates in the
// same jsdom document.
afterEach(() => cleanup());
