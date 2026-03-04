import { mkdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const BASE = "https://www.gov.uk";
const COLLECTION =
  "/government/collections/immunisation-against-infectious-disease-the-green-book";
const PDFS_DIR = join(import.meta.dir, "..", "pdfs");
const MANIFEST_PATH = join(import.meta.dir, "manifest.json");
const NATHNAC_FACTSHEET =
  "https://travelhealthpro.org.uk/factsheet/109/the-green-book-travel-chapters";

export interface Chapter {
  title: string;
  path: string;
}

interface ManifestEntry {
  url: string;
  modified: string;
}

type Manifest = Record<string, ManifestEntry>;

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

export function extractDateModified(html: string): string | null {
  const match = html.match(/"dateModified":\s*"([^"]+)"/);
  return match ? match[1]! : null;
}

export function extractNathnacPdfUrls(html: string): Record<string, string> {
  const urls: Record<string, string> = {};
  const re = /href="([^"]+\.pdf)"/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const url = match[1]!;
    const chapterMatch = url.match(/chapter-(\d+[a-z]?)/i);
    if (chapterMatch) {
      urls[chapterMatch[1]!.toLowerCase()] = url;
    }
  }
  return urls;
}

export function extractNathnacUrl(html: string): string | null {
  const match = html.match(
    /href="(https:\/\/travelhealthpro\.org\.uk\/[^"]+)"/i,
  );
  return match ? match[1]! : null;
}

export function chapterSlug(chapter: Chapter): string {
  const slug = chapter.path.split("/").pop()!;
  return slug.replace(/-the-green-book/, "").replace(/-chapter-/, "-ch");
}

function chapterNumber(chapter: Chapter): string | null {
  const match = chapter.path.match(/chapter-(\d+[a-z]?)$/i);
  return match ? match[1]!.toLowerCase() : null;
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`);
  return res.text();
}

async function loadManifest(): Promise<Manifest> {
  if (!existsSync(MANIFEST_PATH)) return {};
  const raw = await readFile(MANIFEST_PATH, "utf-8");
  return JSON.parse(raw) as Manifest;
}

async function saveManifest(manifest: Manifest): Promise<void> {
  const sorted = Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)),
  );
  await writeFile(MANIFEST_PATH, JSON.stringify(sorted, null, 2) + "\n");
}

async function scrapeAll(force = false) {
  console.log("Fetching collection page...");
  const collectionHtml = await fetchPage(BASE + COLLECTION);
  const chapters = discoverChapters(collectionHtml);
  console.log(`Found ${chapters.length} chapters`);

  await mkdir(PDFS_DIR, { recursive: true });
  const manifest = await loadManifest();

  let nathnacPdfs: Record<string, string> | null = null;

  const changed: string[] = [];
  const added: string[] = [];
  const skipped: string[] = [];

  for (const chapter of chapters) {
    const slug = chapterSlug(chapter);
    const pdfPath = join(PDFS_DIR, `${slug}.pdf`);

    console.log(`  ${chapter.title}`);
    const pubHtml = await fetchPage(BASE + chapter.path);

    const modified = extractDateModified(pubHtml);
    let pdfUrl = extractPdfUrl(pubHtml);

    if (!pdfUrl) {
      const nathnacLink = extractNathnacUrl(pubHtml);
      if (nathnacLink) {
        if (!nathnacPdfs) {
          console.log("    Fetching NaTHNaC travel chapters index...");
          const nathnacHtml = await fetchPage(NATHNAC_FACTSHEET);
          nathnacPdfs = extractNathnacPdfUrls(nathnacHtml);
        }
        const chNum = chapterNumber(chapter);
        if (chNum && nathnacPdfs[chNum]) {
          pdfUrl = nathnacPdfs[chNum]!;
          if (!pdfUrl.startsWith("http")) {
            pdfUrl = `https://travelhealthpro.org.uk${pdfUrl.startsWith("/") ? "" : "/"}${pdfUrl}`;
          }
        }
      }
    }

    if (!pdfUrl) {
      console.warn(`    no PDF found, skipping`);
      continue;
    }

    const existing = manifest[slug];
    if (
      !force &&
      existing &&
      existing.modified === modified &&
      existsSync(pdfPath)
    ) {
      skipped.push(slug);
      console.log(`    unchanged`);
      continue;
    }

    const res = await fetch(pdfUrl);
    if (!res.ok) {
      console.warn(`    ${res.status} downloading PDF, skipping`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(pdfPath, buf);

    if (!existing) {
      added.push(slug);
      console.log(`    NEW`);
    } else {
      changed.push(slug);
      console.log(`    CHANGED (was ${existing.modified})`);
    }

    manifest[slug] = { url: pdfUrl, modified: modified ?? "unknown" };
  }

  await saveManifest(manifest);

  console.log("\n--- Summary ---");
  console.log(`Total: ${chapters.length} chapters`);
  if (added.length) console.log(`New: ${added.join(", ")}`);
  if (changed.length) console.log(`Changed: ${changed.join(", ")}`);
  if (skipped.length) console.log(`Skipped: ${skipped.length} unchanged`);
  if (!added.length && !changed.length) console.log("No changes detected");
}

if (import.meta.main) {
  const force = process.argv.includes("--force");
  await scrapeAll(force);
}
