import { Storage, type File } from "@google-cloud/storage";
import { randomUUID } from "crypto";
import { logger } from "./logger";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) path = `/${path}`;
  const parts = path.split("/");
  if (parts.length < 3) {
    throw new Error("Invalid object path: " + path);
  }
  const bucketName = parts[1];
  const objectName = parts.slice(2).join("/");
  return { bucketName, objectName };
}

function getPrivateObjectDir(): string {
  const dir = process.env["PRIVATE_OBJECT_DIR"] || "";
  if (!dir) throw new Error("PRIVATE_OBJECT_DIR not set");
  return dir;
}

export async function uploadInventoryImage(
  buffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<{ objectKey: string }> {
  const id = randomUUID();
  const dot = fileName.lastIndexOf(".");
  const ext = dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : "jpg";
  const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : "jpg";
  const objectKey = `inventory/${id}.${safeExt}`;

  const fullPath = `${getPrivateObjectDir()}/${objectKey}`;
  const { bucketName, objectName } = parseObjectPath(fullPath);
  const file = objectStorageClient.bucket(bucketName).file(objectName);

  await file.save(buffer, {
    contentType: contentType || "application/octet-stream",
    resumable: false,
    metadata: { contentType: contentType || "application/octet-stream" },
  });

  logger.info({ objectKey }, "uploaded inventory image to object storage");
  return { objectKey };
}

export async function getInventoryImageFile(
  objectKey: string,
): Promise<{ file: File; contentType: string; size?: number }> {
  if (!/^inventory\/[A-Za-z0-9_\-./]+$/.test(objectKey)) {
    throw new ObjectNotFoundError();
  }
  const fullPath = `${getPrivateObjectDir()}/${objectKey}`;
  const { bucketName, objectName } = parseObjectPath(fullPath);
  const file = objectStorageClient.bucket(bucketName).file(objectName);
  const [exists] = await file.exists();
  if (!exists) throw new ObjectNotFoundError();
  const [metadata] = await file.getMetadata();
  return {
    file,
    contentType:
      (metadata.contentType as string) || "application/octet-stream",
    size: metadata.size ? Number(metadata.size) : undefined,
  };
}
