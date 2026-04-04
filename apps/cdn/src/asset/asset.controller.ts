import { Controller, Get, Headers, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHash } from 'crypto';
import { AssetService } from './asset.service';

@Controller()
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  private sendAsset(
    res: Response,
    ifNoneMatch: string,
    result: { buffer: Buffer; contentType: string },
  ) {
    const etag = `"${createHash('sha1').update(result.buffer).digest('hex').slice(0, 16)}"`;
    if (ifNoneMatch && ifNoneMatch === etag) {
      return res.status(304).end();
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Length', result.buffer.length);
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, s-maxage=31536000, max-age=86400, immutable');
    res.setHeader('Vary', 'Accept');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.send(result.buffer);
  }

  /**
   * User avatars.
   * URL:       GET /avatars/:userId/:hash/:filename
   * MinIO key: avatars/:userId/:hash/:filename
   */
  @Get('/avatars/*path')
  async serveAvatar(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('accept') accept: string,
    @Headers('if-none-match') ifNoneMatch: string,
    @Headers('cloudfront-viewer-country') viewerCountry: string,
  ) {
    // Rewrite /avatars/... → /f/avatars/... so toObjectKey() yields avatars/... as the MinIO key
    const result = await this.assetService.handle({
      urlPath: `/f${req.path}`,
      accept: accept ?? '',
      viewerCountry,
    });
    return this.sendAsset(res, ifNoneMatch, result);
  }

  /**
   * Space assets.
   * URL:       GET /f/:spaceId/path/to/file[/m/WIDTHxHEIGHT/filters:quality(80)]
   * MinIO key: :spaceId/path/to/file
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
    return this.sendAsset(res, ifNoneMatch, result);
  }
}
