import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, ParseIntPipe, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SessionGuard } from '../auth/session.guard';
import { FieldTypesService } from './field-types.service';

@Controller('v1/field_types')
@UseGuards(SessionGuard)
export class FieldTypesAdminController {
  constructor(private readonly service: FieldTypesService) {}

  @Get()
  list(@Query('search') search?: string, @Query('only_mine') onlyMine?: string) {
    return this.service.list({ search, onlyMine: onlyMine === '1' });
  }

  @Get(':name/get_html')
  async getHtml(@Param('name') name: string, @Query() query: Record<string, string>, @Res() res: Response) {
    const { theme, ...rest } = query;
    const html = await this.service.getHtml(name, theme ?? 'light', rest);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.getOne(id);
  }

  @Post()
  create(@Body() body: { field_type: { name: string; body?: string; compiled_body?: string } }) {
    return this.service.create(body.field_type);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { field_type: { name?: string; body?: string; compiled_body?: string; space_ids?: number[]; options?: any[] } },
  ) {
    return this.service.update(id, body.field_type);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
