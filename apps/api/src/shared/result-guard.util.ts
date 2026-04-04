import { NotFoundException } from '@nestjs/common'

export class ResultGuard {
  static throwIfNotFound<T>(result: T | null | undefined, message?: string): T {
    if (result == null) throw new NotFoundException(message ?? 'Resource not found')
    return result
  }
}
