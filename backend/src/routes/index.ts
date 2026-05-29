import { type Application } from "express";
import apiRoutes from "@/routes/api";
import internalRoutes from "@/routes/internal";
import testRoutes from "@/routes/test";

export const registerRoutes = (app: Application): void => {
  app.use("/api/v1", apiRoutes);
  app.use("/internal/v1", internalRoutes);

  if (process.env["NODE_ENV"] !== "production") {
    app.use("/test/v1", testRoutes);
  }
};
