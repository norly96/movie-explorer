import Image from "next/image";

export interface GalleryProps {
  imageUrls: string[];
}

// Presentation only.
export function Gallery({ imageUrls }: GalleryProps) {
  if (imageUrls.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6">
      {imageUrls.map((url) => (
        <Image
          key={url}
          src={url}
          alt="Movie gallery image"
          width={1280}
          height={720}
          sizes="(min-width: 768px) 33vw, 50vw"
          className="aspect-video w-full rounded-sm object-cover"
        />
      ))}
    </div>
  );
}
