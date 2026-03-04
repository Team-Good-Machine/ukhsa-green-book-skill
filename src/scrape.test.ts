import { describe, expect, test } from "bun:test";
import { chapterSlug, discoverChapters, extractPdfUrl } from "./scrape";

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
