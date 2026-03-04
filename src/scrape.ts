import { mkdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const BASE = "https://www.gov.uk";
const COLLECTION =
  "/government/collections/immunisation-against-infectious-disease-the-green-book";
const PDFS_DIR = join(import.meta.dir, "..", "pdfs");

export interface Chapter {
  title: string;
  path: string;
}

export function discoverChapters(html: string): Chapter[] {
  const chapters: Chapter[] = [];
  const re =
    /<a[^>]+href="(\/government\/publications\/[^"]*the-green-book[^"]*)"[^>]*>([^<]+)<\/a>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const path = match[1]!;
    const title = match[2]!.trim();
    if (path.includes("front-cover")) continue;
    chapters.push({ title, path });
  }
  return chapters;
}

export function extractPdfUrl(html: string): string | null {
  const match = html.match(
    /href="(https:\/\/assets\.publishing\.service\.gov\.uk\/[^"]+\.pdf)"/i,
  );
  return match ? match[1]! : null;
}

export function chapterSlug(chapter: Chapter): string {
  const slug = chapter.path.split("/").pop()!;
  return slug.replace(/-the-green-book/, "").replace(/-chapter-/, "-ch");
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`);
  return res.text();
}

async function fileHash(path: string): Promise<string> {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(await readFile(path));
  return hasher.digest("hex");
}

async function scrapeAll() {
  console.log("Fetching collection page...");
  const collectionHtml = await fetchPage(BASE + COLLECTION);
  const chapters = discoverChapters(collectionHtml);
  console.log(`Found ${chapters.length} chapters`);

  await mkdir(PDFS_DIR, { recursive: true });

  const changed: string[] = [];
  const added: string[] = [];

  for (const chapter of chapters) {
    const slug = chapterSlug(chapter);
    const pdfPath = join(PDFS_DIR, `${slug}.pdf`);

    const oldHash = existsSync(pdfPath) ? await fileHash(pdfPath) : null;

    console.log(`Fetching: ${chapter.title}`);
    const pubHtml = await fetchPage(BASE + chapter.path);
    const pdfUrl = extractPdfUrl(pubHtml);
    if (!pdfUrl) {
      console.warn(`  No PDF found, skipping`);
      continue;
    }

    const res = await fetch(pdfUrl);
    if (!res.ok) {
      console.warn(`  ${res.status} downloading PDF, skipping`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(pdfPath, buf);

    const newHash = await fileHash(pdfPath);
    if (oldHash === null) {
      added.push(slug);
      console.log(`  NEW: ${slug}.pdf`);
    } else if (oldHash !== newHash) {
      changed.push(slug);
      console.log(`  CHANGED: ${slug}.pdf`);
    } else {
      console.log(`  unchanged`);
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Total: ${chapters.length} chapters`);
  if (added.length) console.log(`New: ${added.join(", ")}`);
  if (changed.length) console.log(`Changed: ${changed.join(", ")}`);
  if (!added.length && !changed.length) console.log("No changes detected");
}

if (import.meta.main) {
  await scrapeAll();
}
