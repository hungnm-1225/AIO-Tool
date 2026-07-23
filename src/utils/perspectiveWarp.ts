export interface Point {
  x: number;
  y: number;
}

export interface FilterSettings {
  filterType: "original" | "magic_color" | "grayscale" | "threshold";
  threshold: number; // 0 to 255
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
}

export const DEFAULT_FILTERS: FilterSettings = {
  filterType: "original",
  threshold: 135,
  brightness: 10,
  contrast: 20,
};

/**
 * Calculates output dimensions (width & height) for destination canvas
 * based on the 4 corner points of a quad.
 */
export function calculateDestinationDimensions(points: [Point, Point, Point, Point]): { width: number; height: number } {
  const [p0, p1, p2, p3] = points; // TL, TR, BR, BL

  // Top edge & Bottom edge width
  const topWidth = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  const bottomWidth = Math.hypot(p2.x - p3.x, p2.y - p3.y);
  const maxWidth = Math.max(topWidth, bottomWidth);

  // Left edge & Right edge height
  const leftHeight = Math.hypot(p3.x - p0.x, p3.y - p0.y);
  const rightHeight = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const maxHeight = Math.max(leftHeight, rightHeight);

  return {
    width: Math.max(100, Math.round(maxWidth)),
    height: Math.max(100, Math.round(maxHeight)),
  };
}

/**
 * Homography mapping from unit square [0,1]^2 to 4 points [p0, p1, p2, p3]
 */
function solveSquareToQuad(points: [Point, Point, Point, Point]) {
  const [p0, p1, p2, p3] = points;

  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const sumX = p0.x - p1.x + p2.x - p3.x;

  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const sumY = p0.y - p1.y + p2.y - p3.y;

  if (Math.abs(sumX) < 1e-6 && Math.abs(sumY) < 1e-6) {
    // Parallelogram / Affine
    return {
      m00: p1.x - p0.x,
      m01: p3.x - p0.x,
      m02: p0.x,
      m10: p1.y - p0.y,
      m11: p3.y - p0.y,
      m12: p0.y,
      m20: 0,
      m21: 0,
    };
  }

  const denom = dx1 * dy2 - dy1 * dx2;
  const m20 = (sumX * dy2 - sumY * dx2) / (denom || 1e-6);
  const m21 = (dx1 * sumY - dy1 * sumX) / (denom || 1e-6);

  const m00 = p1.x - p0.x + m20 * p1.x;
  const m01 = p3.x - p0.x + m21 * p3.x;
  const m02 = p0.x;

  const m10 = p1.y - p0.y + m20 * p1.y;
  const m11 = p3.y - p0.y + m21 * p3.y;
  const m12 = p0.y;

  return { m00, m01, m02, m10, m11, m12, m20, m21 };
}

/**
 * Performs a 4-point perspective warp transformation on source image data onto a target canvas.
 */
export function warpPerspective(
  sourceCanvas: HTMLCanvasElement,
  points: [Point, Point, Point, Point],
  targetWidth?: number,
  targetHeight?: number
): HTMLCanvasElement {
  const dims = calculateDestinationDimensions(points);
  const outW = targetWidth || dims.width;
  const outH = targetHeight || dims.height;

  const srcCtx = sourceCanvas.getContext("2d");
  if (!srcCtx) throw new Error("Could not get source canvas context");

  const srcImageData = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const srcData = srcImageData.data;
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;

  const outCanvas = document.createElement("canvas");
  outCanvas.width = outW;
  outCanvas.height = outH;

  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) throw new Error("Could not get target canvas context");

  const outImageData = outCtx.createImageData(outW, outH);
  const outData = outImageData.data;

  // Solve homography
  const H = solveSquareToQuad(points);

  for (let y = 0; y < outH; y++) {
    const v = y / (outH - 1 || 1);
    for (let x = 0; x < outW; x++) {
      const u = x / (outW - 1 || 1);

      // Map (u, v) -> (srcX, srcY)
      const denom = H.m20 * u + H.m21 * v + 1;
      const srcX = (H.m00 * u + H.m01 * v + H.m02) / denom;
      const srcY = (H.m10 * u + H.m11 * v + H.m12) / denom;

      const outIdx = (y * outW + x) * 4;

      if (srcX >= 0 && srcX < srcW - 1 && srcY >= 0 && srcY < srcH - 1) {
        // Bilinear interpolation for smooth anti-aliased output
        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const dx = srcX - x0;
        const dy = srcY - y0;

        const idx00 = (y0 * srcW + x0) * 4;
        const idx10 = (y0 * srcW + x1) * 4;
        const idx01 = (y1 * srcW + x0) * 4;
        const idx11 = (y1 * srcW + x1) * 4;

        for (let c = 0; c < 3; c++) {
          const val =
            (1 - dx) * (1 - dy) * srcData[idx00 + c] +
            dx * (1 - dy) * srcData[idx10 + c] +
            (1 - dx) * dy * srcData[idx01 + c] +
            dx * dy * srcData[idx11 + c];
          outData[outIdx + c] = val;
        }
        outData[outIdx + 3] = 255;
      } else {
        // Out of bounds - transparent / white fallback
        outData[outIdx] = 255;
        outData[outIdx + 1] = 255;
        outData[outIdx + 2] = 255;
        outData[outIdx + 3] = 255;
      }
    }
  }

  outCtx.putImageData(outImageData, 0, 0);
  return outCanvas;
}

/**
 * Applies CamScanner filters (Magic Color, Grayscale, Thresholding, Brightness & Contrast)
 */
export function applyImageFilters(
  inputCanvas: HTMLCanvasElement,
  filters: FilterSettings
): HTMLCanvasElement {
  const ctx = inputCanvas.getContext("2d");
  if (!ctx) return inputCanvas;

  const width = inputCanvas.width;
  const height = inputCanvas.height;

  const srcImageData = ctx.getImageData(0, 0, width, height);
  const srcData = srcImageData.data;

  const outCanvas = document.createElement("canvas");
  outCanvas.width = width;
  outCanvas.height = height;

  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) return inputCanvas;

  const outImageData = outCtx.createImageData(width, height);
  const outData = outImageData.data;

  const { filterType, threshold, brightness, contrast } = filters;

  // Contrast factor calculation
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < srcData.length; i += 4) {
    let r = srcData[i];
    let g = srcData[i + 1];
    let b = srcData[i + 2];
    const a = srcData[i + 3];

    // Grayscale luminance
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    if (filterType === "grayscale") {
      r = gray;
      g = gray;
      b = gray;
    } else if (filterType === "threshold") {
      const bw = gray >= threshold ? 255 : 0;
      r = bw;
      g = bw;
      b = bw;
    } else if (filterType === "magic_color") {
      // CamScanner Magic Color - enhance document contrast, suppress paper background
      let boosted = gray;
      if (gray > threshold) {
        // Suppress gray background paper tone to stark white
        boosted = 255;
      } else {
        // Darken text ink & boost contrast
        boosted = Math.max(0, gray * 0.75);
      }
      r = boosted;
      g = boosted;
      b = boosted;
    }

    // Apply Brightness & Contrast
    if (filterType !== "threshold") {
      r = contrastFactor * (r - 128) + 128 + brightness;
      g = contrastFactor * (g - 128) + 128 + brightness;
      b = contrastFactor * (b - 128) + 128 + brightness;
    }

    outData[i] = Math.min(255, Math.max(0, r));
    outData[i + 1] = Math.min(255, Math.max(0, g));
    outData[i + 2] = Math.min(255, Math.max(0, b));
    outData[i + 3] = a;
  }

  outCtx.putImageData(outImageData, 0, 0);
  return outCanvas;
}
