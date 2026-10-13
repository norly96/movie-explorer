import { z } from "zod";

// No .strict(): TMDB adding fields later must not break parsing.
const TmdbGenreRawSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const TmdbGenreListRawSchema = z.object({
  genres: z.array(TmdbGenreRawSchema),
});

export type TmdbGenreListRaw = z.infer<typeof TmdbGenreListRawSchema>;

// Same shape as TMDB's, so no mapper is needed.
export type Genre = z.infer<typeof TmdbGenreRawSchema>;
