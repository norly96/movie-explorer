import { describe, expect, it } from "vitest";
import {
  TmdbMovieDetailRawSchema,
  toMovieDetail,
  type TmdbMovieDetailRaw,
} from "./movie-detail-schema";

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

function rawCast(order: number) {
  return {
    id: 100 + order,
    name: `Actor ${order}`,
    character: `Character ${order}`,
    profile_path: `/actor${order}.jpg`,
    order,
  };
}

function rawCrew(job: string, name: string) {
  return { id: Math.random(), name, job, profile_path: null };
}

function rawMovieDetail(
  overrides: Partial<TmdbMovieDetailRaw> = {}
): TmdbMovieDetailRaw {
  return {
    id: 550,
    title: "Fight Club",
    original_title: "Fight Club",
    tagline: "Mischief. Mayhem. Soap.",
    overview: "An insomniac office worker...",
    poster_path: "/poster.jpg",
    backdrop_path: "/backdrop.jpg",
    release_date: "1999-10-15",
    runtime: 139,
    genres: [{ id: 18, name: "Drama" }],
    vote_average: 8.4,
    vote_count: 26000,
    status: "Released",
    original_language: "en",
    homepage: "https://example.com/fight-club",
    credits: {
      cast: [rawCast(0), rawCast(1)],
      crew: [rawCrew("Director", "David Fincher")],
    },
    videos: {
      results: [
        {
          key: "abc123",
          site: "YouTube",
          type: "Trailer",
          official: true,
          name: "Official Trailer",
        },
      ],
    },
    images: {
      backdrops: [{ file_path: "/gallery1.jpg" }, { file_path: "/gallery2.jpg" }],
    },
    ...overrides,
  };
}

describe("TmdbMovieDetailRawSchema", () => {
  it("parses a valid raw movie detail response", () => {
    expect(() => TmdbMovieDetailRawSchema.parse(rawMovieDetail())).not.toThrow();
  });
});

describe("toMovieDetail", () => {
  it("maps a fully-populated raw movie to the domain MovieDetail shape", () => {
    const detail = toMovieDetail(rawMovieDetail(), IMAGE_BASE_URL);

    expect(detail).toMatchObject({
      id: 550,
      title: "Fight Club",
      originalTitle: null, // same as title
      tagline: "Mischief. Mayhem. Soap.",
      overview: "An insomniac office worker...",
      posterUrl: `${IMAGE_BASE_URL}/poster.jpg`,
      backdropUrl: `${IMAGE_BASE_URL}/backdrop.jpg`,
      releaseYear: 1999,
      runtimeMinutes: 139,
      genres: ["Drama"],
      rating: 8.4,
      status: "Released",
      originalLanguage: "en",
      homepageUrl: "https://example.com/fight-club",
      directors: ["David Fincher"],
      trailerKey: "abc123",
    });
  });

  it("maps a different original_title through, but null when it matches title", () => {
    const detail = toMovieDetail(
      rawMovieDetail({ original_title: "El club de la pelea" }),
      IMAGE_BASE_URL
    );
    expect(detail.originalTitle).toBe("El club de la pelea");
  });

  it("maps missing poster/backdrop/tagline/overview/homepage and runtime:0 to null (RF-6)", () => {
    const detail = toMovieDetail(
      rawMovieDetail({
        poster_path: null,
        backdrop_path: null,
        tagline: "",
        overview: "",
        homepage: "",
        runtime: 0,
      }),
      IMAGE_BASE_URL
    );

    expect(detail.posterUrl).toBeNull();
    expect(detail.backdropUrl).toBeNull();
    expect(detail.tagline).toBeNull();
    expect(detail.overview).toBeNull();
    expect(detail.homepageUrl).toBeNull();
    expect(detail.runtimeMinutes).toBeNull();
  });

  it("maps runtime: null to null as well", () => {
    const detail = toMovieDetail(
      rawMovieDetail({ runtime: null }),
      IMAGE_BASE_URL
    );
    expect(detail.runtimeMinutes).toBeNull();
  });

  it("caps cast at 12, ordered by TMDB's billing order (RF-2)", () => {
    const fifteenCastMembers = Array.from({ length: 15 }, (_, i) =>
      rawCast(14 - i) // intentionally out of order
    );
    const detail = toMovieDetail(
      rawMovieDetail({ credits: { cast: fifteenCastMembers, crew: [] } }),
      IMAGE_BASE_URL
    );

    expect(detail.cast).toHaveLength(12);
    expect(detail.cast.map((c) => c.name)).toEqual([
      "Actor 0",
      "Actor 1",
      "Actor 2",
      "Actor 3",
      "Actor 4",
      "Actor 5",
      "Actor 6",
      "Actor 7",
      "Actor 8",
      "Actor 9",
      "Actor 10",
      "Actor 11",
    ]);
    expect(detail.cast[0].photoUrl).toBe(`${IMAGE_BASE_URL}/actor0.jpg`);
  });

  it("maps zero credited cast to an empty array (RF-6)", () => {
    const detail = toMovieDetail(
      rawMovieDetail({ credits: { cast: [], crew: [] } }),
      IMAGE_BASE_URL
    );
    expect(detail.cast).toEqual([]);
  });

  it("maps zero credited directors to an empty array (RF-6)", () => {
    const detail = toMovieDetail(
      rawMovieDetail({ credits: { cast: [], crew: [rawCrew("Writer", "X")] } }),
      IMAGE_BASE_URL
    );
    expect(detail.directors).toEqual([]);
  });

  it("maps multiple credited directors (RF-3, co-directed films)", () => {
    const detail = toMovieDetail(
      rawMovieDetail({
        credits: {
          cast: [],
          crew: [rawCrew("Director", "A"), rawCrew("Director", "B")],
        },
      }),
      IMAGE_BASE_URL
    );
    expect(detail.directors).toEqual(["A", "B"]);
  });

  it("selects the official trailer over a non-official one (RF-4)", () => {
    const detail = toMovieDetail(
      rawMovieDetail({
        videos: {
          results: [
            {
              key: "nonofficial",
              site: "YouTube",
              type: "Trailer",
              official: false,
              name: "Fan trailer",
            },
            {
              key: "official",
              site: "YouTube",
              type: "Trailer",
              official: true,
              name: "Official Trailer",
            },
          ],
        },
      }),
      IMAGE_BASE_URL
    );
    expect(detail.trailerKey).toBe("official");
  });

  it("ignores non-Trailer types and non-YouTube sites (RF-4)", () => {
    const detail = toMovieDetail(
      rawMovieDetail({
        videos: {
          results: [
            {
              key: "teaser",
              site: "YouTube",
              type: "Teaser",
              official: true,
              name: "Teaser",
            },
            {
              key: "vimeo-trailer",
              site: "Vimeo",
              type: "Trailer",
              official: true,
              name: "Vimeo Trailer",
            },
          ],
        },
      }),
      IMAGE_BASE_URL
    );
    expect(detail.trailerKey).toBeNull();
  });

  it("maps no qualifying video to trailerKey: null (RF-6)", () => {
    const detail = toMovieDetail(
      rawMovieDetail({ videos: { results: [] } }),
      IMAGE_BASE_URL
    );
    expect(detail.trailerKey).toBeNull();
  });

  it("caps the gallery at 12 backdrops and excludes the hero's own backdrop (RF-5)", () => {
    const backdrops = [
      { file_path: "/backdrop.jpg" }, // same as the hero's backdrop_path
      ...Array.from({ length: 14 }, (_, i) => ({ file_path: `/extra${i}.jpg` })),
    ];
    const detail = toMovieDetail(
      rawMovieDetail({ images: { backdrops } }),
      IMAGE_BASE_URL
    );

    expect(detail.galleryUrls).toHaveLength(12);
    expect(detail.galleryUrls).not.toContain(`${IMAGE_BASE_URL}/backdrop.jpg`);
    expect(detail.galleryUrls[0]).toBe(`${IMAGE_BASE_URL}/extra0.jpg`);
  });

  it("maps zero gallery images to an empty array (RF-6)", () => {
    const detail = toMovieDetail(
      rawMovieDetail({ images: { backdrops: [] } }),
      IMAGE_BASE_URL
    );
    expect(detail.galleryUrls).toEqual([]);
  });
});
