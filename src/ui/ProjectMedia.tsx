import { useEffect, useState } from "react";
import type { ImageAttachment } from "../library/model";
export function useImageURL(image?: ImageAttachment, thumbnail = false) {
  const remote = thumbnail
    ? image?.publicThumbnailURL || image?.publicURL
    : image?.publicURL;
  const blob = thumbnail ? image?.thumbnail || image?.blob : image?.blob;
  const [local, setLocal] = useState("");
  useEffect(() => {
    if (remote || !blob) {
      setLocal("");
      return;
    }
    const url = URL.createObjectURL(blob);
    setLocal(url);
    return () => URL.revokeObjectURL(url);
  }, [blob, remote]);
  return remote || local;
}
export function ProjectImage({
  image,
  alt,
  thumbnail = false,
  eager = false,
  className,
  sizes,
  onLoad,
  onError,
}: {
  image: ImageAttachment;
  alt: string;
  thumbnail?: boolean;
  eager?: boolean;
  className?: string;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
}) {
  const url = useImageURL(image, thumbnail);
  const full = image.publicURL;
  const thumb = image.publicThumbnailURL;
  return (
    <img
      src={url || undefined}
      srcSet={full && thumb ? `${thumb} 480w, ${full} 1920w` : undefined}
      sizes={
        sizes ||
        (thumbnail
          ? "(max-width: 650px) 90vw, 660px"
          : "(max-width: 700px) 100vw, 900px")
      }
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={className}
      onLoad={
        onLoad
          ? (event) => {
              void event.currentTarget
                .decode()
                .then(onLoad)
                .catch(() => onError?.());
            }
          : undefined
      }
      onError={onError}
    />
  );
}
