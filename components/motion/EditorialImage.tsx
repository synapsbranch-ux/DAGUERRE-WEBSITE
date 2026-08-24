import Image from "next/image";

import {
  isUnconfiguredRemoteImage,
  resolveKnownImageSource,
  type ImageSource,
} from "@/lib/media/assets";
import { cn } from "@/lib/utils";

type EditorialImageProps = {
  /**
   * Import local, URL absolue ou média GridFS `/api/media/…`. Sans source
   * utilisable, la plaque est rendue vide : jamais d'image cassée.
   */
  src: ImageSource | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  imageClassName?: string;
  /** À activer sur l'image d'en-tête d'une page : c'est son plus grand rendu. */
  priority?: boolean;
};

export function EditorialImage({
  src,
  alt,
  className,
  sizes = "(max-width: 768px) 100vw, 50vw",
  imageClassName,
  priority = false,
}: EditorialImageProps) {
  const source = src ? resolveKnownImageSource(src) : undefined;

  return (
    <div className={cn("editorial-image plate", className)}>
      {source ? (
        <Image
          src={source}
          alt={alt}
          fill
          sizes={sizes}
          quality={75}
          priority={priority}
          unoptimized={isUnconfiguredRemoteImage(source)}
          className={cn("object-cover", imageClassName)}
        />
      ) : null}
    </div>
  );
}
