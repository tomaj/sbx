import { AuthenticatedRequest } from '../auth/authenticated-request.interface';
import {
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Body,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { randomBytes } from 'crypto';
import { extname } from 'path';
import { Auth } from '../auth/auth.decorator';
import { UsersService } from './users.service';
import { ResultGuard } from '../shared/result-guard.util';
import { StorageService } from '../storage/storage.service';
import { UpdateMeDto } from './dto/update-me.dto';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

@Controller()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly storageService: StorageService,
  ) {}

  // ─── Public: serve avatar from MinIO ────────────────────────────────────────

  @Get('avatars/:userId/:hash/:filename')
  async serveAvatar(
    @Param('userId') userId: string,
    @Param('hash') hash: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const key = `avatars/${userId}/${hash}/${filename}`;
    const object = await this.storageService.getObject(key);
    if (!object) throw new NotFoundException('Avatar not found');

    res.setHeader('Content-Type', object.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(object.body);
  }

  // ─── Authenticated: get current user profile ────────────────────────────────

  @Get('v1/user/me')
  @Auth('session')
  async getMe(@Req() req: AuthenticatedRequest) {
    const user = ResultGuard.throwIfNotFound(
      await this.usersService.getMe(req.adminUser.email),
      'User not found',
    );
    return { user };
  }

  // ─── Authenticated: update name ──────────────────────────────────────────────

  @Patch('v1/user/me')
  @Auth('session')
  async updateMe(@Req() req: AuthenticatedRequest, @Body() body: UpdateMeDto) {
    const me = ResultGuard.throwIfNotFound(
      await this.usersService.getMe(req.adminUser.email),
      'User not found',
    );
    const updated = await this.usersService.updateUser(me.id, {
      firstname: body.firstname,
      lastname: body.lastname,
      favouriteSpaces: body.favourite_spaces,
    });
    return { user: updated };
  }

  // ─── Authenticated: upload avatar ────────────────────────────────────────────

  @Post('v1/user/me/avatar')
  @Auth('session')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@Req() req: AuthenticatedRequest, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, WebP or GIF allowed');
    }
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('File too large (max 5 MB)');
    }

    const me = ResultGuard.throwIfNotFound(
      await this.usersService.getMe(req.adminUser.email),
      'User not found',
    );

    const hash = randomBytes(5).toString('hex');
    const ext = extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `avatar${ext}`;
    const key = `avatars/${me.id}/${hash}/${filename}`;

    await this.storageService.putObject(key, file.buffer, file.mimetype);
    await this.usersService.updateAvatar(req.adminUser.email, key);

    return { avatar: key };
  }
}
