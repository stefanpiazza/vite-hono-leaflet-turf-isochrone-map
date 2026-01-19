import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { logger } from "hono/logger";
import { isochronesRoute } from "./routes/isochrones";

const app = new Hono();

app.use("*", logger());

const isochronesRoutes = app
  .basePath("/api")
  .route("/isochrones", isochronesRoute);

app.get("*", serveStatic({ root: "./client/dist" }));
app.get("*", serveStatic({ path: "./client/dist/index.html" }));

export default app;
export type IsochronesRoutes = typeof isochronesRoutes;
