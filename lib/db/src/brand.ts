/**
 * Brand identifies a tenant workspace ("company"). A brand is just the
 * `slug` of a row in the `companies` collection — a short URL-safe
 * identifier (e.g. "feni", "ambika", "jyot"). Brands are no longer a
 * fixed enum; admins can create and delete companies at runtime.
 *
 * The constants in this file are only used for **bootstrap seeding** so
 * that fresh databases come up with the original three companies.
 */
export type Brand = string;

export interface DefaultCompany {
  slug: string;
  name: string;
}

export const DEFAULT_COMPANIES: readonly DefaultCompany[] = [
  { slug: "feni", name: "Feni Creation" },
  { slug: "ambika", name: "Ambika Creation" },
  { slug: "jyot", name: "Jyot Fashion" },
] as const;

export const DEFAULT_BRAND: Brand = DEFAULT_COMPANIES[0]!.slug;

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

/** Returns true iff `v` is a syntactically valid brand slug. */
export function isBrand(v: unknown): v is Brand {
  return typeof v === "string" && SLUG_PATTERN.test(v);
}
