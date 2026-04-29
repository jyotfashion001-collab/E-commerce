import { Router, type IRouter } from "express";
import multer from "multer";
import {
  uploadInventoryImage,
  getInventoryImageFile,
  ObjectNotFoundError,
} from "../lib/objectStorage";
import { streamMegaFile } from "../lib/mega";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

router.post(
  "/uploads/inventory-image",
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "file required" });
        return;
      }
      const original = req.file.originalname || "image.jpg";
      const contentType = req.file.mimetype || "image/jpeg";
      const { objectKey } = await uploadInventoryImage(
        req.file.buffer,
        original,
        contentType,
      );
      const url = `/api/uploads/object/${objectKey}`;
      res.json({ url, objectKey });
    } catch (err) {
      logger.error({ err }, "object storage upload failed");
      next(err);
    }
  },
);

router.get("/uploads/object/inventory/:name", async (req, res, next) => {
  try {
    const name = req.params["name"] || "";
    const objectKey = `inventory/${name}`;
    const { file, contentType, size } = await getInventoryImageFile(objectKey);
    if (size) res.setHeader("Content-Length", String(size));
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    const stream = file.createReadStream();
    stream.on("error", (err) => {
      logger.error({ err }, "object storage stream failed");
      if (!res.headersSent) {
        res.status(502).json({ error: "stream failed" });
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "not found" });
      return;
    }
    next(err);
  }
});

router.get("/uploads/proxy", async (req, res, next) => {
  try {
    const u = typeof req.query["u"] === "string" ? req.query["u"] : undefined;
    if (!u || !/^https:\/\/mega\.nz\//.test(u)) {
      res.status(400).json({ error: "invalid url" });
      return;
    }

    const { stream, size, name } = await streamMegaFile(u);
    if (size) res.setHeader("Content-Length", String(size));
    const ext = (name?.split(".").pop() || "jpg").toLowerCase();
    const mime =
      ext === "png"
        ? "image/png"
        : ext === "gif"
        ? "image/gif"
        : ext === "webp"
        ? "image/webp"
        : ext === "svg"
        ? "image/svg+xml"
        : "image/jpeg";
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "public, max-age=86400");

    stream.on("error", (err) => {
      logger.error({ err }, "mega proxy stream failed");
      if (!res.headersSent) {
        res.status(502).json({ error: "stream failed" });
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  } catch (err) {
    logger.error({ err }, "mega proxy failed");
    next(err);
  }
});

export default router;
