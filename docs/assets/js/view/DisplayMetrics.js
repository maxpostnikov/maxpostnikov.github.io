// Three render pixels per CSS pixel keeps the 256px frames sharp at 80px
// without allocating oversized mobile post-processing buffers.
const MAX_PIXEL_RATIO = 3;

export function getDisplayMetrics(width, height, devicePixelRatio = 1) {
    const pixelRatio = Math.min(MAX_PIXEL_RATIO, Math.max(1, devicePixelRatio));
    return {
        width,
        height,
        renderWidth: Math.round(width * pixelRatio),
        renderHeight: Math.round(height * pixelRatio)
    };
}

export function configureCamera(camera, metrics) {
    camera.setOrigin(0.5, 0.5);
    camera.setViewport(0, 0, metrics.renderWidth, metrics.renderHeight);
    camera.setZoom(
        metrics.renderWidth / metrics.width,
        metrics.renderHeight / metrics.height
    );
    // Zoom around the viewport center, with world (0, 0) at its top-left.
    camera.setScroll(
        (metrics.width - metrics.renderWidth) / 2,
        (metrics.height - metrics.renderHeight) / 2
    );
}
