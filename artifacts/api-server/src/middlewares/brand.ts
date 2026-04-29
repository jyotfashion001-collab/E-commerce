import type { Request, Response, NextFunction } from "express";
import { isBrand, type Brand } from "@workspace/db/brand";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      brand?: Brand;
    }
  }
}

export const BRAND_HEADER = "x-brand";

function extractBrand(req: Request): Brand | null {
  const headerValue = req.headers[BRAND_HEADER];
  const headerStr = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (isBrand(headerStr)) return headerStr.toLowerCase();

  const queryValue = req.query["brand"];
  const queryStr = Array.isArray(queryValue) ? queryValue[0] : queryValue;
  if (isBrand(queryStr)) return queryStr.toLowerCase();

  return null;
}

/**
 * Asserts that the request carries an `X-Brand` header (or `?brand=`)
 * containing a syntactically valid company slug. The actual list of
 * companies is maintained in the `companies` collection — we do not
 * validate against it on every request to keep this middleware cheap.
 * If a tampered or stale slug is sent, queries simply return empty.
 */
export function requireBrand(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const brand = extractBrand(req);
  if (!brand) {
    res.status(400).json({ error: "Missing or invalid brand context" });
    return;
  }
  req.brand = brand;
  next();
}

/**
 * Like {@link requireBrand}, but does NOT 400 if the header is missing.
 * Use on read-only endpoints that may legitimately be called without a
 * brand context (e.g. all-company overview pages).
 */
export function optionalBrand(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const brand = extractBrand(req);
  if (brand) req.brand = brand;
  next();
}
