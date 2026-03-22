import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, ilike, asc } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { fieldTypes } from '../db/schema';

@Injectable()
export class FieldTypesService {
  constructor(@Inject(DB) private db: DbType) {}

  async list(opts: { search?: string; onlyMine?: boolean } = {}) {
    const rows = await this.db
      .select({ id: fieldTypes.id, name: fieldTypes.name, approvedVersion: fieldTypes.approvedVersion })
      .from(fieldTypes)
      .orderBy(asc(fieldTypes.name));

    const filtered = opts.search?.trim()
      ? rows.filter((r) => r.name.toLowerCase().includes(opts.search!.trim().toLowerCase()))
      : rows;

    return {
      field_types: filtered.map((r) => ({
        id: r.id,
        name: r.name,
        approved_version: r.approvedVersion ?? null,
      })),
    };
  }

  async getOne(id: number) {
    const [row] = await this.db.select().from(fieldTypes).where(eq(fieldTypes.id, id)).limit(1);
    if (!row) throw new NotFoundException('Field type not found');
    return { field_type: this.format(row) };
  }

  async create(data: { name: string; body?: string; compiled_body?: string }) {
    const [existing] = await this.db.select({ id: fieldTypes.id }).from(fieldTypes).where(eq(fieldTypes.name, data.name)).limit(1);
    if (existing) throw new ConflictException(`Field type "${data.name}" already exists`);

    const [row] = await this.db
      .insert(fieldTypes)
      .values({
        name: data.name,
        body: data.body ?? '',
        compiledBody: data.compiled_body ?? '',
        belongsToOrg: true,
      })
      .returning();

    return { field_type: this.format(row) };
  }

  async update(id: number, data: { name?: string; body?: string; compiled_body?: string; space_ids?: number[]; options?: any[] }) {
    const [existing] = await this.db.select({ id: fieldTypes.id }).from(fieldTypes).where(eq(fieldTypes.id, id)).limit(1);
    if (!existing) throw new NotFoundException('Field type not found');

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.body !== undefined) updateData.body = data.body;
    if (data.compiled_body !== undefined) updateData.compiledBody = data.compiled_body;
    if (data.space_ids !== undefined) updateData.spaceIds = data.space_ids;
    if (data.options !== undefined) updateData.options = data.options;

    const [row] = await this.db.update(fieldTypes).set(updateData).where(eq(fieldTypes.id, id)).returning();
    return { field_type: this.format(row) };
  }

  async remove(id: number) {
    const [existing] = await this.db.select({ id: fieldTypes.id }).from(fieldTypes).where(eq(fieldTypes.id, id)).limit(1);
    if (!existing) throw new NotFoundException('Field type not found');
    await this.db.delete(fieldTypes).where(eq(fieldTypes.id, id));
    return {};
  }

  private format(row: typeof fieldTypes.$inferSelect) {
    return {
      id: row.id,
      name: row.name,
      body: row.body,
      compiled_body: row.compiledBody,
      space_ids: (row.spaceIds as number[]) ?? [],
      options: (row.options as any[]) ?? [],
      belongs_to_org: row.belongsToOrg,
      belongs_to_partner: false,
      approved_version: row.approvedVersion ?? null,
      last_versions: [],
      user: null,
    };
  }
}
