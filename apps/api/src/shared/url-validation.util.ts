import { BadRequestException } from '@nestjs/common';

const BLOCKED_HOSTNAMES =
  /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|\[::1?\]|\[fc[0-9a-f]{2}:.*\]|\[fd[0-9a-f]{2}:.*\]|\[fe[89ab][0-9a-f]:.*\]|\[ff[0-9a-f]{2}:.*\])$/i;

/** Validates a URL is a safe external HTTP(S) endpoint (blocks private/internal IPs). */
export function validateExternalUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new BadRequestException('Invalid URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException('URL must use http or https');
  }
  if (BLOCKED_HOSTNAMES.test(parsed.hostname)) {
    throw new BadRequestException('URL must not point to private/internal addresses');
  }
}
