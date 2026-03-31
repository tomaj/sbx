/**
 * Import story_versions golden data into the local DB.
 *
 * Usage:
 *   ts-node src/import-story-versions.ts
 *   ts-node src/import-story-versions.ts --space 285923
 *
 * For each space, reads golden/{spaceId}/story_versions/chunk_*.json
 * and inserts rows into the story_versions table.
 *
 * - story_id is matched by Storyblok story ID (we keep the same IDs on import)
 * - user_id is left null (no Storyblok→SBX user mapping)
 * - release_id is left null (Storyblok release IDs don't map to ours)
 * - action is inferred from status: published→'publish', else→'save'
 * - name/slug/full_slug/tag_list pulled from our stories table
 */
import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

const GOLDEN = path.join(__dirname, '../../../golden');
const DB_URL = process.env.DATABASE_URL ?? 'postgresql://tomaj@localhost:5432/sbx';
const BATCH_SIZE = 1000;

const SPACES = [285923, 285922, 293665, 327730];

const args = process.argv.slice(2);
const argSpace = (() => {
  const i = args.indexOf('--space');
  return i !== -1 ? parseInt(args[i + 1]) : null;
})();
const spaces = argSpace ? [argSpace] : SPACES;

async function main() {
  const pool = new Pool({ connectionString: DB_URL });

  for (const spaceId of spaces) {
    const dir = path.join(GOLDEN, String(spaceId), 'story_versions');
    if (!fs.existsSync(dir)) {
      console.log(`[${spaceId}] No story_versions golden data — skipping`);
      continue;
    }

    const chunkFiles = fs.readdirSync(dir)
      .filter((f) => f.startsWith('chunk_') && f.endsWith('.json'))
      .sort();

    if (chunkFiles.length === 0) {
      console.log(`[${spaceId}] No chunk files — skipping`);
      continue;
    }

    console.log(`\n[${spaceId}] Loading story metadata from DB...`);

    // Load all stories for this space: id → { name, slug, full_slug, tag_list, path, is_startpage }
    const { rows: storyRows } = await pool.query(
      `SELECT id, name, slug, full_slug, tag_list, path, is_startpage
       FROM stories WHERE space_id = $1 AND deleted_at IS NULL`,
      [spaceId],
    );

    const storyMap = new Map<string, any>();
    for (const r of storyRows) {
      storyMap.set(String(r.id), r);
    }
    console.log(`[${spaceId}] ${storyMap.size} stories loaded`);

    // Check how many already imported
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM story_versions WHERE space_id = $1`,
      [spaceId],
    );
    const alreadyImported = parseInt(countRows[0].count, 10);
    if (alreadyImported > 0) {
      console.log(`[${spaceId}] Already has ${alreadyImported} versions in DB — clearing first...`);
      await pool.query(`DELETE FROM story_versions WHERE space_id = $1`, [spaceId]);
    }

    let totalInserted = 0;
    let totalSkipped = 0;

    for (const chunkFile of chunkFiles) {
      const raw: any[] = JSON.parse(fs.readFileSync(path.join(dir, chunkFile), 'utf-8'));

      // Build batch rows
      const batch: any[][] = [];

      for (const v of raw) {
        const story = storyMap.get(String(v.story_id));
        if (!story) {
          totalSkipped++;
          continue;
        }
        if (!v.content || Object.keys(v.content).length === 0) {
          totalSkipped++;
          continue;
        }

        const action = v.status === 'published' ? 'publish' : 'save';
        const status = v.status === 'published' ? 'published' : 'draft';

        batch.push([
          v.story_id,          // story_id
          spaceId,             // space_id
          null,                // release_id
          null,                // user_id
          action,              // action
          status,              // status
          story.name,          // name
          story.slug,          // slug
          story.full_slug,     // full_slug
          v.content,           // content
          JSON.stringify(story.tag_list ?? []), // tag_list
          story.path ?? null,  // path
          story.is_startpage,  // is_startpage
          v.created_at,        // created_at
        ]);

        // Insert in batches
        if (batch.length >= BATCH_SIZE) {
          await insertBatch(pool, batch);
          totalInserted += batch.length;
          batch.length = 0;
        }
      }

      // Flush remaining
      if (batch.length > 0) {
        await insertBatch(pool, batch);
        totalInserted += batch.length;
      }

      process.stdout.write(`\r[${spaceId}] ${chunkFile}: inserted ${totalInserted}, skipped ${totalSkipped}...`);
    }

    process.stdout.write('\n');
    console.log(`[${spaceId}] Done — inserted ${totalInserted}, skipped ${totalSkipped}`);
  }

  await pool.end();
  console.log('\nAll spaces imported ✓');
}

async function insertBatch(pool: Pool, rows: any[][]) {
  if (rows.length === 0) return;

  const cols = 14;
  const placeholders = rows.map((_, i) =>
    `(${Array.from({ length: cols }, (_, j) => `$${i * cols + j + 1}`).join(', ')})`
  ).join(', ');

  const values = rows.flat();
  // For content (index 9 in each row), cast to jsonb
  const sql = `
    INSERT INTO story_versions
      (story_id, space_id, release_id, user_id, action, status, name, slug, full_slug, content, tag_list, path, is_startpage, created_at)
    VALUES ${placeholders}
    ON CONFLICT DO NOTHING
  `;

  await pool.query(sql, values);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
