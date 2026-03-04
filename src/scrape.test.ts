import { describe, expect, test } from "bun:test";
import {
  chapterSlug,
  discoverChapters,
  extractDateModified,
  extractNathnacPdfUrls,
  extractNathnacUrl,
  extractPdfUrl,
} from "./scrape";

describe("discoverChapters", () => {
  test("parses chapter links from collection page HTML", () => {
    const html = `
      <li><a href="/government/publications/immunity-and-how-vaccines-work-the-green-book-chapter-1">
        Immunity and how vaccines work: the green book, chapter 1</a></li>
      <li><a href="/government/publications/consent-the-green-book-chapter-2">
        Consent: the green book, chapter 2</a></li>
    `;
    const chapters = discoverChapters(html);
    expect(chapters).toHaveLength(2);
    expect(chapters[0]!.title).toBe(
      "Immunity and how vaccines work: the green book, chapter 1",
    );
    expect(chapters[0]!.path).toBe(
      "/government/publications/immunity-and-how-vaccines-work-the-green-book-chapter-1",
    );
  });

  test("skips front cover link", () => {
    const html = `
      <a href="/government/publications/front-cover-the-green-book">Front cover</a>
      <a href="/government/publications/immunity-and-how-vaccines-work-the-green-book-chapter-1">Ch 1</a>
    `;
    const chapters = discoverChapters(html);
    expect(chapters).toHaveLength(1);
  });
});

describe("extractPdfUrl", () => {
  test("extracts PDF URL from publication page", () => {
    const html = `
      <a href="https://assets.publishing.service.gov.uk/media/abc123/Greenbook_chapter_1.pdf">Download</a>
    `;
    expect(extractPdfUrl(html)).toBe(
      "https://assets.publishing.service.gov.uk/media/abc123/Greenbook_chapter_1.pdf",
    );
  });

  test("returns null when no PDF link found", () => {
    expect(extractPdfUrl("<html><body>No PDF here</body></html>")).toBeNull();
  });
});

describe("extractDateModified", () => {
  test("extracts dateModified from JSON-LD", () => {
    const html = `<script type="application/ld+json">{"dateModified": "2021-01-05T17:13:36+00:00"}</script>`;
    expect(extractDateModified(html)).toBe("2021-01-05T17:13:36+00:00");
  });

  test("returns null when no dateModified found", () => {
    expect(extractDateModified("<html></html>")).toBeNull();
  });
});

describe("extractNathnacPdfUrls", () => {
  test("extracts chapter PDFs keyed by chapter number", () => {
    const html = `
      <a href="/media/files/chapter-14-cholera-aug-2024.pdf">Ch 14</a>
      <a href="/media/files/chapter-35-yellow-fever-mar-2024.pdf">Ch 35</a>
    `;
    const urls = extractNathnacPdfUrls(html);
    expect(urls["14"]).toBe("/media/files/chapter-14-cholera-aug-2024.pdf");
    expect(urls["35"]).toBe(
      "/media/files/chapter-35-yellow-fever-mar-2024.pdf",
    );
  });

  test("handles chapter with letter suffix", () => {
    const html = `<a href="/files/chapter-15a-dengue.pdf">Dengue</a>`;
    const urls = extractNathnacPdfUrls(html);
    expect(urls["15a"]).toBe("/files/chapter-15a-dengue.pdf");
  });
});

describe("extractNathnacUrl", () => {
  test("extracts travelhealthpro.org.uk URL", () => {
    const html = `<a href="https://travelhealthpro.org.uk/factsheet/109/the-green-book-travel-chapters">NaTHNaC</a>`;
    expect(extractNathnacUrl(html)).toBe(
      "https://travelhealthpro.org.uk/factsheet/109/the-green-book-travel-chapters",
    );
  });

  test("returns null when no NaTHNaC link", () => {
    expect(extractNathnacUrl("<html></html>")).toBeNull();
  });
});

describe("chapterSlug", () => {
  test("strips green book suffix and shortens chapter prefix", () => {
    expect(
      chapterSlug({
        title: "Immunity",
        path: "/government/publications/immunity-and-how-vaccines-work-the-green-book-chapter-1",
      }),
    ).toBe("immunity-and-how-vaccines-work-ch1");
  });

  test("handles chapter with letter suffix", () => {
    expect(
      chapterSlug({
        title: "COVID-19",
        path: "/government/publications/covid-19-the-green-book-chapter-14a",
      }),
    ).toBe("covid-19-ch14a");
  });
});
