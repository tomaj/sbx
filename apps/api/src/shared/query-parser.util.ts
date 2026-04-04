export class QueryParserUtil {
  static parsePagination(page?: string, perPage?: string) {
    return {
      page: Math.max(1, parseInt(page ?? '1') || 1),
      perPage: Math.min(100, parseInt(perPage ?? '25') || 25),
    }
  }

  static parseBoolean(value?: string): boolean | undefined {
    if (value === 'true' || value === '1') return true
    if (value === 'false' || value === '0') return false
    return undefined
  }

  static parseCsvToInts(csv?: string): number[] | undefined {
    if (!csv?.trim()) return undefined
    return csv.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n))
  }

  static parseCsvToStrings(csv?: string): string[] | undefined {
    if (!csv?.trim()) return undefined
    return csv.split(',').map((s) => s.trim()).filter(Boolean)
  }

  static parseSortBy(sortBy?: string, defaultField = 'id', defaultDir: 'asc' | 'desc' = 'asc'): { field: string; dir: 'asc' | 'desc' } {
    if (sortBy) {
      const lastColon = sortBy.lastIndexOf(':')
      if (lastColon > 0) {
        const field = sortBy.slice(0, lastColon)
        const dir = sortBy.slice(lastColon + 1)
        if (dir === 'asc' || dir === 'desc') return { field, dir }
      }
      return { field: sortBy, dir: 'asc' }
    }
    return { field: defaultField, dir: defaultDir }
  }
}
