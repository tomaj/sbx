/**
 * Storyblok → golden data sync tool
 *
 * Usage:
 *   pnpm --filter sync start                          # all spaces, all resources
 *   pnpm --filter sync start -- --space 285923        # one space
 *   pnpm --filter sync start -- --resource activities # one resource
 *   pnpm --filter sync start -- --full                # ignore state, re-download everything
 */
import * as fs from 'fs';
import * as path from 'path';
import { syncSmall } from './resources/small';
import { syncActivities } from './resources/activities';
import { syncStories } from './resources/stories';
import { syncAssets } from './resources/assets';
import { syncStoryVersions } from './resources/story_versions';

const SPACES = [
  { id: 285923, name: 'Live' },
  { id: 285922, name: 'Development' },
  { id: 293665, name: 'Magenta' },
  { id: 327730, name: 'Telekom Apps' },
];

// ── CLI args ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const argSpace = (() => {
  const i = args.indexOf('--space');
  return i !== -1 ? parseInt(args[i + 1], 10) : null;
})();
const argResource = (() => {
  const i = args.indexOf('--resource');
  return i !== -1 ? args[i + 1] : null;
})();
const full = args.includes('--full');

const spaces = argSpace ? SPACES.filter((s) => s.id === argSpace) : SPACES;

// ── Token ─────────────────────────────────────────────────────────────────────

function loadToken(): string {
  // Try env first
  if (process.env.STORYBLOK_TOKEN) return process.env.STORYBLOK_TOKEN;
  // Try .env.local in repo root
  const envFile = path.join(__dirname, '../../../.env.local');
  if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf-8');
    const match = content.match(/STORYBLOK_TOKEN=(.+)/);
    if (match) return match[1].trim();
  }
  throw new Error('STORYBLOK_TOKEN not found. Set env var or add to .env.local');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const token = loadToken();
  console.log(
    `Sync${full ? ' (FULL)' : ''} — spaces: ${spaces.map((s) => s.id).join(', ')}, resource: ${argResource ?? 'all'}\n`,
  );

  for (const space of spaces) {
    console.log(`\n[${space.id}] ${space.name}`);

    const runSmall =
      !argResource || !['activities', 'stories', 'assets', 'story_versions'].includes(argResource);
    const runActivities = !argResource || argResource === 'activities';
    const runStories = !argResource || argResource === 'stories';
    const runAssets = !argResource || argResource === 'assets';
    const runStoryVersions = !argResource || argResource === 'story_versions';

    if (runSmall) {
      console.log('  small resources:');
      await syncSmall(space.id, token);
    }

    if (runActivities) {
      console.log('  activities:');
      await syncActivities(space.id, token, full);
    }

    if (runStories) {
      console.log('  stories:');
      await syncStories(space.id, token, full);
    }

    if (runAssets) {
      await syncAssets(space.id, token, full);
    }

    if (runStoryVersions) {
      console.log('  story_versions:');
      await syncStoryVersions(space.id, token, full);
    }
  }

  console.log('\nDone ✓');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
