"use client";

export interface Photo {
  id: string;
  mediaType: "image/jpeg";
  /** Base64 without the data: prefix, ready for the API. */
  data: string;
  previewUrl: string;
}

/** Longest edge Claude uses at full detail; bigger photos just cost upload time. */
const MAX_EDGE = 1568;
const QUALITY = 0.82;

/**
 * Shrink a phone photo to a JPEG the API can use. Phone cameras produce
 * 3–10 MB files; this brings each to a few hundred KB.
 */
export async function preparePhoto(file: File): Promise<Photo> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas isn't available in this browser.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
    return {
      id: crypto.randomUUID(),
      mediaType: "image/jpeg",
      data: dataUrl.slice(dataUrl.indexOf(",") + 1),
      previewUrl: dataUrl,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That file isn't a photo this browser can open."));
    img.src = src;
  });
}
