import { SQL } from 'drizzle-orm';
import { and } from 'drizzle-orm';

/** Escape SQL LIKE/ILIKE metacharacters (% and _) so user input is matched literally. */
export function escapeLike(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

export class QueryParserUtil {
  /**
   * Build a Drizzle `and(...)` condition from a required base condition plus
   * optional conditions. Pass `null | undefined | false` to skip a condition.
   *
   * Usage:
   *   const where = QueryParserUtil.buildWhere(
   *     eq(table.spaceId, spaceId),
   *     opts.search ? ilike(table.name, `%${opts.search}%`) : null,
   *     opts.active !== undefined ? eq(table.active, opts.active) : null,
   *   )
   *   this.db.select().from(table).where(where)
   */
  static buildWhere(base: SQL, ...optionals: (SQL | null | undefined | false)[]): SQL {
    const active = optionals.filter(Boolean) as SQL[];
    return and(base, ...active) as SQL;
  }

  /**
   * Build an array of conditions (for use with `and(...conditions)` when you
   * need to push conditions dynamically).
   */
  static buildConditions(base: SQL, ...optionals: (SQL | null | undefined | false)[]): SQL[] {
    return [base, ...(optionals.filter(Boolean) as SQL[])];
  }

  static parsePagination(page?: string, perPage?: string) {
    return {
      page: Math.max(1, parseInt(page ?? '1', 10) || 1),
      perPage: Math.min(100, parseInt(perPage ?? '25', 10) || 25),
    };
  }

  /** Parse an optional integer query param. Returns undefined for missing or non-numeric values. */
  static parseOptionalInt(value?: string): number | undefined {
    if (!value) return undefined;
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? undefined : n;
  }

  static parseBoolean(value?: string): boolean | undefined {
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return undefined;
  }

  /** Max items in a CSV query parameter to prevent DoS via huge IN clauses */
  static readonly MAX_CSV_ITEMS = 1000;

  static parseCsvToInts(csv?: string): number[] | undefined {
    if (!csv?.trim()) return undefined;
    return csv
      .split(',')
      .slice(0, QueryParserUtil.MAX_CSV_ITEMS)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));
  }

  static parseCsvToStrings(csv?: string): string[] | undefined {
    if (!csv?.trim()) return undefined;
    return csv
      .split(',')
      .slice(0, QueryParserUtil.MAX_CSV_ITEMS)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  static parseCsvToBigInts(csv?: string): bigint[] | undefined {
    if (!csv?.trim()) return undefined;
    return csv
      .split(',')
      .slice(0, QueryParserUtil.MAX_CSV_ITEMS)
      .map((s) => {
        try {
          return BigInt(s.trim());
        } catch {
          return null;
        }
      })
      .filter((n): n is bigint => n !== null);
  }

  /** Allowed field name pattern — word characters only, prevents SQL injection via raw field names */
  private static readonly SAFE_FIELD_RE = /^\w+$/;

  static parseSortBy(
    sortBy?: string,
    defaultField = 'id',
    defaultDir: 'asc' | 'desc' = 'asc',
  ): { field: string; dir: 'asc' | 'desc' } {
    if (sortBy) {
      const lastColon = sortBy.lastIndexOf(':');
      if (lastColon > 0) {
        const field = sortBy.slice(0, lastColon);
        const dir = sortBy.slice(lastColon + 1);
        if ((dir === 'asc' || dir === 'desc') && QueryParserUtil.SAFE_FIELD_RE.test(field)) {
          return { field, dir };
        }
      }
      if (QueryParserUtil.SAFE_FIELD_RE.test(sortBy)) {
        return { field: sortBy, dir: 'asc' };
      }
    }
    return { field: defaultField, dir: defaultDir };
  }
}
