import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { StorySchedulingsService } from './story-schedulings.service';

@Controller('v1/spaces/:spaceId/story_schedulings')
@UseGuards(SessionOrTokenGuard)
export class StorySchedulingsController {
  constructor(private readonly service: StorySchedulingsService) {}

  @Get()
  async list(
    @Req() req: any,
    @Query('by_status') byStatus?: string,
  ) {
    return this.service.findAll(req.space.id, byStatus);
  }

  @Get(':id')
  async getOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.space.id, parseInt(id));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: any,
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
      req.adminUser?.id,
    );
  }

  @Put(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      story_scheduling: {
        publish_at?: string;
        language?: string;
      };
    },
  ) {
    return this.service.update(req.space.id, parseInt(id), body.story_scheduling);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(req.space.id, parseInt(id));
  }
}
