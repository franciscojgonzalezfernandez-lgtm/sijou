interface SizedFile {
  url?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface MediaLike extends SizedFile {
  sizes?: Record<string, SizedFile | null | undefined> | null;
}

export interface ResponsiveImage {
  src: string;
  srcSet: string;
  width: number;
  height: number;
}

/** Root-relative URL when it points at our own origin (local uploads), else unchanged (Blob). */
export function sameOriginPath(url: string, origin: string | undefined): string {
  return origin && url.startsWith(`${origin}/`) ? url.slice(origin.length) : url;
}

/**
 * Responsive `<img>` attributes from Payload's generated sizes (F-010 D-2): every size with a URL
 * and width becomes a `srcset` candidate. Returns null when the original has no URL or size.
 */
export function responsiveImage(
  media: MediaLike | null | undefined,
  origin?: string,
): ResponsiveImage | null {
  if (!media?.url || !media.width || !media.height) return null;
  const url = (value: string) => sameOriginPath(value, origin);
  const candidates = Object.values(media.sizes ?? {})
    .filter((size): size is SizedFile & { url: string; width: number } =>
      Boolean(size?.url && size.width),
    )
    .sort((a, b) => a.width - b.width);
  const smallest = candidates[0];
  const srcSet = [...candidates.map((size) => `${url(size.url)} ${size.width}w`)];
  if (!candidates.some((size) => size.width === media.width)) {
    srcSet.push(`${url(media.url)} ${media.width}w`);
  }
  return {
    src: url(smallest?.url ?? media.url),
    srcSet: srcSet.join(", "),
    width: media.width,
    height: media.height,
  };
}
