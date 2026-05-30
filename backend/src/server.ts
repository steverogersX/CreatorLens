import express, { type Application, type Request, type Response, type NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { config } from "@/config";
import { errorHandler } from "@/middlewares/error-handler";
import { sendSuccess } from "@/types/api-response";
import { NotFoundError } from "@/errors/app-error";
import { registerRoutes } from "@/routes";

const app: Application = express();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/health", (_req: Request, res: Response) => {
  sendSuccess(res, { timestamp: new Date().toISOString() });
});

registerRoutes(app);

app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new NotFoundError("Route not found"));
});

app.use(errorHandler);

const PORT = config.PORT;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const shutdown = (signal: string) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
