import { setupServer } from "msw/node";

// No default handlers: each test registers the handlers it needs via
// `server.use(...)`, keeping TMDB response fixtures next to the test
// that exercises them.
export const server = setupServer();
