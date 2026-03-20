/**
 * Binary file downloader with conservative concurrency control.
 *
 * Limits:
 *   - Max 2 concurrent downloads at a time
 *   - 500 ms delay between starting each new download
 *   - Up to 3 retries with 3 s back-off on failure
 */

const MAX_CONCURRENT = 2
const START_DELAY_MS = 500 // gap between launching concurrent downloads
const RETRY_DELAY_MS = 3_000
const MAX_RETRIES = 3

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

class ConcurrencyLimiter {
  private running = 0
  private queue: Array<() => void> = []

  constructor(private readonly max: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire()
    try {
      return await fn()
    } finally {
      this.release()
    }
  }

  private acquire(): Promise<void> {
    if (this.running < this.max) {
      this.running++
      return Promise.resolve()
    }
    return new Promise(resolve => {
      this.queue.push(() => {
        this.running++
        resolve()
      })
    })
  }

  private release(): void {
    this.running--
    const next = this.queue.shift()
    next?.()
  }
}

const limiter = new ConcurrencyLimiter(MAX_CONCURRENT)
let lastDownloadStartedAt = 0

/**
 * Downloads a URL and returns the response body as a Buffer.
 * Respects concurrency limit and minimum delay between download starts.
 */
export async function downloadBinary(url: string): Promise<Buffer> {
  return limiter.run(async () => {
    // Stagger concurrent downloads
    const elapsed = Date.now() - lastDownloadStartedAt
    if (elapsed < START_DELAY_MS) {
      await sleep(START_DELAY_MS - elapsed)
    }
    lastDownloadStartedAt = Date.now()

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(url)
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} for ${url}`)
        }
        const ab = await res.arrayBuffer()
        return Buffer.from(ab)
      } catch (err) {
        if (attempt === MAX_RETRIES) throw err
        console.warn(`    Download failed (attempt ${attempt + 1}): ${err}. Retrying in ${RETRY_DELAY_MS / 1000}s…`)
        await sleep(RETRY_DELAY_MS * (attempt + 1))
      }
    }

    throw new Error(`Unreachable`)
  })
}
