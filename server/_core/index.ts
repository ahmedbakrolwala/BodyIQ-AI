import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { createCorsMiddleware } from "./cors";
import { clearLegacySessionCookie } from "./cookies";
import { registerAuthBackend } from "../auth";

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.set("trust proxy", "loopback");

  app.use(createCorsMiddleware());
  app.use(clearLegacySessionCookie());

  // Auth bodies are deliberately bounded before the starter's larger legacy parser.
  app.use(
    ["/api/auth", "/api/oauth"],
    (req, res, next) => {
      if (
        req.method === "POST" &&
        req.headers["content-type"]?.split(";")[0].trim().toLowerCase() !==
          "application/json"
      ) {
        res
          .status(415)
          .json({
            error: "Use a JSON authentication request.",
            code: "invalid_content_type",
          });
        return;
      }
      next();
    },
    express.json({ limit: "32kb" }),
  );
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerAuthBackend(app);
  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const issue = error as { type?: string; status?: number };
      if (issue.type === "entity.too.large" || issue.status === 413)
        res
          .status(413)
          .json({
            error: "This request is too large.",
            code: "request_too_large",
          });
      else if (issue.status === 400)
        res
          .status(400)
          .json({
            error: "The request could not be read. Please try again.",
            code: "invalid_request",
          });
      else
        res
          .status(500)
          .json({
            error: "The service could not complete this request.",
            code: "service_unavailable",
          });
    },
  );
  const port = parseInt(process.env.PORT || "3000");
  server.listen(port, () => {
    console.log("[api] server listening");
  });
}

startServer().catch(() => {
  console.error("[api] server failed to start");
});
