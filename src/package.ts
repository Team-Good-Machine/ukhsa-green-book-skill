import { readdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dir, "..");
const VERSION_PATH = join(ROOT, "VERSION");

function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

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
  const version = today();
  await writeFile(VERSION_PATH, version + "\n");
  console.log(`VERSION: ${version}`);

  const outPath = join(ROOT, `green-book-skill-${version}.zip`);
  await buildZip(outPath);
}
