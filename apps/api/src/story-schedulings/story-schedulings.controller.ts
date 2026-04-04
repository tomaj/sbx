import { AuthenticatedRequest } from '../auth/authenticated-request.interface';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { StorySchedulingsService } from './story-schedulings.service';

@ApiTags('Story Schedulings - MAPI')
@Controller('v1/spaces/:spaceId/story_schedulings')
@Auth('session-or-token')
export class StorySchedulingsController {
  constructor(private readonly service: StorySchedulingsService) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest, @Query('by_status') byStatus?: string) {
    return this.service.findAll(req.space.id, byStatus);
  }

  @Get(':id')
  async getOne(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(req.space.id, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      story_scheduling: {
        story_id: number;
        publish_at: string;
        language?: string;
      };
    },
  ) {
    return this.service.create(
      req.space.id,
      body.story_scheduling,
      req.adminUser?.sbxUserId ?? undefined,
    );
  }

  @Put(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      story_scheduling: {
        publish_at?: string;
        language?: string;
      };
    },
  ) {
    return this.service.update(req.space.id, id, body.story_scheduling);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(req.space.id, id);
  }
}
