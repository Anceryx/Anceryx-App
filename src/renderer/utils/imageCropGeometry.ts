export function clampCropZoom(value: number, minimum = 1, maximum = 3): number {
  return Math.max(minimum, Math.min(maximum, value))
}

export function coverScale(imageWidth: number, imageHeight: number, frameWidth: number, frameHeight: number, zoom = 1): number {
  if (![imageWidth, imageHeight, frameWidth, frameHeight, zoom].every(Number.isFinite) || imageWidth <= 0 || imageHeight <= 0 || frameWidth <= 0 || frameHeight <= 0) {
    throw new RangeError('Image and frame dimensions must be positive finite numbers.')
  }
  return Math.max(frameWidth / imageWidth, frameHeight / imageHeight) * clampCropZoom(zoom)
}

export function cropDrawRect(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
  outputWidth: number,
  zoom = 1,
  offsetX = 0,
  offsetY = 0,
) {
  if (outputWidth <= 0 || !Number.isFinite(outputWidth)) throw new RangeError('Output width must be positive.')
  const scale = coverScale(imageWidth, imageHeight, frameWidth, frameHeight, zoom) * outputWidth / frameWidth
  return {
    width: imageWidth * scale,
    height: imageHeight * scale,
    x: outputWidth / 2 + offsetX * outputWidth / frameWidth,
    y: outputWidth / 2 * frameHeight / frameWidth + offsetY * outputWidth / frameWidth,
  }
}

export function getCropOutputSize(imageWidth: number, imageHeight: number, frameWidth: number, frameHeight: number, desiredWidth: number, desiredHeight: number, zoom = 1) {
  const scale = coverScale(imageWidth, imageHeight, frameWidth, frameHeight, zoom)
  const sourceCropWidth = frameWidth / scale
  const sourceCropHeight = frameHeight / scale
  const factor = Math.min(1, sourceCropWidth / desiredWidth, sourceCropHeight / desiredHeight)
  return { width: Math.max(1, Math.floor(desiredWidth * factor + 1e-8)), height: Math.max(1, Math.floor(desiredHeight * factor + 1e-8)) }
}

export function clampCropOffset(offsetX: number, offsetY: number, imageWidth: number, imageHeight: number, frameWidth: number, frameHeight: number, zoom = 1) {
  const scale = coverScale(imageWidth, imageHeight, frameWidth, frameHeight, zoom)
  const maxX = Math.max(0, (imageWidth * scale - frameWidth) / 2)
  const maxY = Math.max(0, (imageHeight * scale - frameHeight) / 2)
  return { x: maxX === 0 ? 0 : Math.max(-maxX, Math.min(maxX, offsetX)), y: maxY === 0 ? 0 : Math.max(-maxY, Math.min(maxY, offsetY)) }
}
