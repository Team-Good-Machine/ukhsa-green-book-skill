import { readdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dir, "..");

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

  const result = Bun.spawnSync(["zip", outPath, ...files], {
    cwd: ROOT,
  });

  if (result.exitCode !== 0) {
    throw new Error(
      `zip failed (${result.exitCode}): ${result.stderr.toString()}`,
    );
  }

  console.log(`Packaged ${files.length} files → ${outPath}`);
}

if (import.meta.main) {
  const outPath = join(ROOT, "green-book.zip");
  await buildZip(outPath);
}
