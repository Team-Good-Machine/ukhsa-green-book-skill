import { readdir, symlink, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join, resolve } from "path";

const ROOT = join(import.meta.dir, "..");
const PREFIX = "green-book";

export async function buildZip(outPath: string): Promise<void> {
  const files: string[] = ["SKILL.md"];

  const chapters = (await readdir(join(ROOT, "chapters"))).filter((f) =>
    f.endsWith(".md"),
  );
  for (const ch of chapters) files.push(`chapters/${ch}`);

  if (existsSync(join(ROOT, "figures"))) {
    const figures = (await readdir(join(ROOT, "figures"))).filter((f) =>
      f.endsWith(".png"),
    );
    for (const fig of figures) files.push(`figures/${fig}`);
  }

  const link = join(ROOT, PREFIX);
  try {
    await symlink(".", link);
    const prefixed = files.map((f) => `${PREFIX}/${f}`);
    const result = Bun.spawnSync(["zip", "-y", resolve(outPath), ...prefixed], {
      cwd: ROOT,
    });

    if (result.exitCode !== 0) {
      throw new Error(
        `zip failed (${result.exitCode}): ${result.stderr.toString()}`,
      );
    }
  } finally {
    await unlink(link).catch(() => {});
  }

  console.log(`Packaged ${files.length} files → ${outPath}`);
}

if (import.meta.main) {
  const outPath = join(ROOT, "green-book.zip");
  await buildZip(outPath);
}
