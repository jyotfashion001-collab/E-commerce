import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { connectDB } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";
import { runStartupMigrations } from "./lib/migrations";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

if (!process.env["PRIVATE_OBJECT_DIR"]) {
  logger.error(
    "PRIVATE_OBJECT_DIR is not set — image uploads and display will not work. " +
    "Run setupObjectStorage() in the Replit code execution sandbox to provision object storage."
  );
}

connectDB()
  .then(async () => {
    logger.info("MongoDB connected");
    await runStartupMigrations();
  })
  .catch((err) => {
    logger.error({ err }, "MongoDB connection failed");
  });

export default app;
