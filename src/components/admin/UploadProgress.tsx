"use client";

import { useEffect, useId, useState } from "react";

interface Progress {
  name: string;
  percentage: number;
}

/**
 * Upload progress bar for photos (F-011 CA-7). The browser uploads straight to Vercel Blob; the
 * patched upload handler reports progress as `sijou:upload-progress` window events. Screen readers
 * hear it every 25 % so the announcements do not flood.
 */
export function UploadProgress() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [announced, setAnnounced] = useState(0);
  const labelId = useId();

  useEffect(() => {
    function onProgress(event: Event) {
      const detail = (event as CustomEvent<Progress>).detail;
      const percentage = Math.round(detail.percentage);
      setProgress({ name: detail.name, percentage });
      setAnnounced((last) =>
        percentage === 0 ? 0 : percentage - last >= 25 || percentage === 100 ? percentage : last,
      );
    }
    window.addEventListener("sijou:upload-progress", onProgress);
    return () => window.removeEventListener("sijou:upload-progress", onProgress);
  }, []);

  if (!progress) return null;
  const done = progress.percentage >= 100;

  return (
    <div className="upload-progress">
      <p id={labelId} className="upload-progress__label">
        {done ? `Foto subida: ${progress.name}` : `Subiendo ${progress.name}…`}
      </p>
      <progress aria-labelledby={labelId} max={100} value={progress.percentage}>
        {progress.percentage} %
      </progress>
      <p className="upload-progress__value" aria-live="polite">
        {announced} %
      </p>
    </div>
  );
}
