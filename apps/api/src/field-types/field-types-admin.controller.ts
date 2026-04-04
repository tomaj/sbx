import { Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import type { Response } from 'express';
import { FieldTypesService } from './field-types.service';
import { QueryParserUtil } from '../shared/query-parser.util';

@ApiTags('Field Types - Admin')
@Controller('v1/field_types')
@Auth('session')
export class FieldTypesAdminController {
  constructor(private readonly service: FieldTypesService) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('only_mine') onlyMine?: string,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
  ) {
    const { page: parsedPage, perPage: parsedPerPage } = QueryParserUtil.parsePagination(page, perPage);
    return this.service.list({
      search,
      onlyMine: QueryParserUtil.parseBoolean(onlyMine) ?? false,
      page: parsedPage,
      perPage: parsedPerPage,
    });
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
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: { field_type: { name: string; body?: string; compiled_body?: string } }) {
    return this.service.create(body.field_type);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { field_type: { name?: string; body?: string; compiled_body?: string; space_ids?: number[]; options?: any[] }; publish?: number },
  ) {
    return this.service.update(id, body.field_type, { publish: body.publish === 1 });
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
