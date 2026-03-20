import {
  Controller,
  Get,
  Headers,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHash } from 'crypto';
import { AssetService } from './asset.service';

@Controller()
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  /**
   * Catch-all route for all asset requests.
   *
   * Storyblok-compatible URL format:
   *   GET /f/:spaceId/path/to/file[/m/WIDTHxHEIGHT/filters:quality(80)]
   *
   * Headers sent for CloudFront compatibility:
   *   Cache-Control        public, s-maxage (CDN TTL) + max-age (browser TTL)
   *   ETag                 SHA-1 of content → enables 304 Not Modified
   *   Vary                 Accept (WebP/AVIF negotiation)
   *   Content-Length       required for CDN byte accounting
   *   Accept-Ranges        bytes (supports range requests for video/PDF)
   *   X-Cache              HIT/MISS from our Redis layer (separate from CF's own)
   *   Access-Control-Allow-Origin  * (assets are public)
   *   X-Content-Type-Options       nosniff
   */
  @Get('/f/*path')
  async serveAsset(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('accept') accept: string,
    @Headers('if-none-match') ifNoneMatch: string,
    @Headers('cloudfront-viewer-country') viewerCountry: string,
  ) {
    const result = await this.assetService.handle({
      urlPath: req.path,
      accept: accept ?? '',
      viewerCountry,
    });

    // ETag: SHA-1 of the response buffer (first 16 hex chars is enough for uniqueness)
    const etag = `"${createHash('sha1').update(result.buffer).digest('hex').slice(0, 16)}"`;

    // 304 Not Modified — CloudFront / browser already has this version
    if (ifNoneMatch && ifNoneMatch === etag) {
      return res.status(304).end();
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Length', result.buffer.length);
    res.setHeader('ETag', etag);

    // s-maxage: CloudFront TTL (1 year)
    // max-age:  browser TTL (1 day — lets browser revalidate with ETag without full download)
    res.setHeader('Cache-Control', 'public, s-maxage=31536000, max-age=86400, immutable');

    // CloudFront must be configured to forward Accept header and vary cache by it
    res.setHeader('Vary', 'Accept');

    // Partial content support (range requests for video, large PDFs, etc.)
    res.setHeader('Accept-Ranges', 'bytes');

    // Security
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // CORS — assets are public and can be loaded cross-origin
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400');

    // Debug — our internal Redis cache status (CloudFront adds its own X-Cache on top)
    res.setHeader('X-Cache', result.fromCache ? 'HIT' : 'MISS');

    res.send(result.buffer);
  }
}
