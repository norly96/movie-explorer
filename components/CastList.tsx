import Image from "next/image";
import type { CastMember } from "../services/schemas/movie-detail-schema";

// plan.md's component tree already described "CastList (cast +
// director line)"; `directors` was missing from the Data model
// section's props signature — added here to match the actual intent
// and T11's Done-when.
export interface CastListProps {
  cast: CastMember[];
  directors: string[];
}

// "A" / "A & B" / "A, B & C" — plan.md's risk note about getting
// 3+ co-directors' grammar right.
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

// Presentation only. "Cast" and "Director" are independently
// omittable (RF-6: "...the whole Cast *or* Director section is
// omitted") — not an all-or-nothing component.
export function CastList({ cast, directors }: CastListProps) {
  if (cast.length === 0 && directors.length === 0) return null;

  return (
    <div className="space-y-4">
      {directors.length > 0 ? (
        <p className="text-sm text-muted">
          Directed by{" "}
          <span className="text-foreground">{joinNames(directors)}</span>
        </p>
      ) : null}

      {cast.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto">
          {cast.map((member) => (
            <div key={member.id} className="w-24 shrink-0 space-y-1">
              <div className="aspect-poster overflow-hidden rounded-sm bg-surface-raised">
                {member.photoUrl ? (
                  <Image
                    src={member.photoUrl}
                    alt={member.name}
                    width={185}
                    height={278}
                    sizes="96px"
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <p className="line-clamp-1 text-xs text-foreground">
                {member.name}
              </p>
              <p className="line-clamp-1 text-xs text-muted">
                {member.character}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
