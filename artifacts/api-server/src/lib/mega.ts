import { Storage, File } from "megajs";
import { logger } from "./logger";

const FOLDER_NAME = "OrderHub";

let storagePromise: Promise<Storage> | null = null;
let folderPromise: Promise<unknown> | null = null;

function requireCreds(): { email: string; password: string } {
  const email = process.env["jyotfashion001@gmail.com"];
  const password = process.env["Rushit@7265800"];
  if (!email || !password) {
    throw new Error(
      "jyotfashion001@gmail.com / MEGA_PASSWORD are not configured on the server.",
    );
  }
  return { email, password };
}

function getStorage(): Promise<Storage> {
  if (storagePromise) return storagePromise;
  const { email, password } = requireCreds();
  storagePromise = new Promise<Storage>((resolve, reject) => {
    const storage = new Storage(
      { email, password, userAgent: "OrderHub" },
      (err) => {
        if (err) {
          storagePromise = null;
          reject(err);
          return;
        }
        logger.info("Mega storage signed in");
        resolve(storage);
      },
    );
  });
  return storagePromise;
}

async function getInventoryFolder(): Promise<any> {
  if (folderPromise) return folderPromise;
  folderPromise = (async () => {
    const storage = await getStorage();
    const root: any = (storage as any).root;
    if (!root) throw new Error("Mega root folder unavailable");
    const children: any[] = root.children ?? [];
    const existing = children.find(
      (c) => c?.directory && c?.name === FOLDER_NAME,
    );
    if (existing) return existing;
    return await new Promise((resolve, reject) => {
      root.mkdir(FOLDER_NAME, (err: unknown, folder: unknown) => {
        if (err) reject(err);
        else resolve(folder);
      });
    });
  })().catch((err) => {
    folderPromise = null;
    throw err;
  });
  return folderPromise;
}

export async function uploadInventoryImage(
  buffer: Buffer,
  fileName: string,
): Promise<{ link: string; name: string }> {
  const folder: any = await getInventoryFolder();

  const existingChildren: any[] = folder.children ?? [];
  for (const child of existingChildren) {
    if (!child?.directory && child?.name === fileName) {
      await new Promise<void>((resolve) => {
        try {
          child.delete(true, () => resolve());
        } catch {
          resolve();
        }
      });
    }
  }

  const file: any = await new Promise((resolve, reject) => {
    let settled = false;
    const done = (err: unknown, f?: unknown) => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve(f);
    };
    folder.upload(
      { name: fileName, size: buffer.length },
      buffer,
      (err: unknown, f: unknown) => done(err, f),
    );
  });

  const link: string = await new Promise((resolve, reject) => {
    file.link({ noKey: false }, (err: unknown, url: string) => {
      if (err) reject(err);
      else resolve(url);
    });
  });
  return { link, name: file.name ?? fileName };
}

export async function streamMegaFile(megaUrl: string): Promise<{
  stream: NodeJS.ReadableStream;
  size?: number;
  name?: string;
}> {
  const file: any = File.fromURL(megaUrl);
  await new Promise<void>((resolve, reject) => {
    file.loadAttributes((err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
  const stream = file.download() as NodeJS.ReadableStream;
  return { stream, size: file.size, name: file.name };
}
