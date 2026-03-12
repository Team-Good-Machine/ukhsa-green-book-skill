import { readdir, symlink, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join, relative, resolve } from "path";

const ROOT = join(import.meta.dir, "..");
const SKILL_DIR = join(ROOT, "skills", "green-book");
const PREFIX = "green-book";

async function collectFiles(dir: string, base: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectFiles(full, base)));
    } else {
      results.push(relative(base, full));
    }
  }
  return results;
}

export async function buildZip(outPath: string): Promise<void> {
  if (existsSync(outPath)) await unlink(outPath);

  const files = (await collectFiles(SKILL_DIR, SKILL_DIR)).filter(
    (f) => f.endsWith(".md") || f.endsWith(".png"),
  );

  const args = files.map((f) => `${PREFIX}/${f}`);
  const linkPath = join(SKILL_DIR, PREFIX);

  try {
    await symlink(".", linkPath);
    const result = Bun.spawnSync(["zip", "-y", resolve(outPath), ...args], {
      cwd: SKILL_DIR,
    });

    if (result.exitCode !== 0) {
      throw new Error(
        `zip failed (${result.exitCode}): ${result.stderr.toString()}`,
      );
    }
  } finally {
    await unlink(linkPath).catch(() => {});
  }

  console.log(`Packaged ${files.length} files → ${outPath}`);
}

if (import.meta.main) {
  const outPath = join(ROOT, "green-book.zip");
  await buildZip(outPath);
}
