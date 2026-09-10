/**
 * CLI backfill for the Lions Clubs newsroom blog sync.
 *
 * Crawls https://www.lionsclubs.org/en/blog and imports every article
 * into public.blog_posts (idempotent — safe to re-run).
 *
 *   npx tsx scripts/lions-blog-sync.ts               # full crawl, drafts
 *   npx tsx scripts/lions-blog-sync.ts --max=10      # first 10 posts
 *   npx tsx scripts/lions-blog-sync.ts --publish     # publish on import
 *   npx tsx scripts/lions-blog-sync.ts --dry         # crawl only, no DB writes
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (+ NEXT_PUBLIC_SUPABASE_URL) in the
 * environment or a .env.local file in the repo root.
 */

// Best-effort load of .env.local (Node >= 20.12 ships loadEnvFile).
try {
  (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile?.('.env.local');
} catch {
  /* no .env.local — rely on real environment */
}

async function main() {
  const args = process.argv.slice(2);
  const getNum = (flag: string): number | undefined => {
    const hit = args.find((a) => a.startsWith(`--${flag}=`));
    if (!hit) return undefined;
    const n = Number(hit.split('=')[1]);
    return Number.isFinite(n) ? n : undefined;
  };
  const has = (flag: string) => args.includes(`--${flag}`);

  const maxPosts = getNum('max');
  const publish = has('publish');
  const dry = has('dry');

  const { blogSyncEnvConfig } = await import('@/lib/env');
  const config = blogSyncEnvConfig();
  if (maxPosts != null) config.maxPosts = maxPosts;

  if (dry) {
    const { crawlNewsroom, resolveConfig } = await import('@/lib/blog-sync');
    const cfg = resolveConfig(config);
    console.log(`Dry run — crawling ${cfg.baseUrl}${cfg.blogPath} (no DB writes)…`);
    const result = await crawlNewsroom(cfg, (post, i, total) => {
      console.log(`[${i + 1}/${total}] ${post.title}  →  ${post.url}`);
    });
    console.log('\n─ Dry-run summary ─────────────────────────');
    console.log(`discovered : ${result.discovered} (via ${result.discoveredVia})`);
    console.log(`parsed     : ${result.parsed}`);
    console.log(`failed     : ${result.failed}`);
    for (const f of result.failures.slice(0, 20)) console.log(`  ✗ ${f.url} — ${f.reason}`);
    return;
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('✗ SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local or the environment.');
    process.exit(1);
  }

  const { runBlogSync } = await import('@/lib/blog-sync');
  console.log(`Crawling Lions newsroom → blog_posts (publish=${publish})…\n`);
  const result = await runBlogSync({
    config,
    autoPublish: publish,
    onProgress: (msg) => console.log(msg),
  });

  console.log('\n─ Sync summary ────────────────────────────');
  console.log(`log id     : ${result.logId}`);
  console.log(`discovered : ${result.discovered} (via ${result.discoveredVia})`);
  console.log(`inserted   : ${result.inserted}`);
  console.log(`updated    : ${result.updated}`);
  console.log(`skipped    : ${result.skipped}`);
  console.log(`failed     : ${result.failed}`);
  for (const f of result.failures.slice(0, 20)) console.log(`  ✗ ${f.url} — ${f.reason}`);
}

main().catch((err) => {
  console.error('blog sync failed:', err);
  process.exit(1);
});
