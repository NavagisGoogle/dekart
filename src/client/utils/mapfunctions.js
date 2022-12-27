import { memoize } from './memoizer'

const TILE_SIZE = 256

export function getViewportBounds(zoomLevel, centerLatLng, boundsHW) {
    const worldCoordinates = mercatorProject(centerLatLng)
    const scale = getScale(zoomLevel)
    const pixelCoordinates = {
        x: Math.floor(worldCoordinates.x * scale),
        y: Math.floor(worldCoordinates.y * scale)
    }

    const boundingPixels = getBoundingPixels(pixelCoordinates, boundsHW, scale)

    const viewportCoordinates = {
        east: reverseMercatorLng(boundingPixels.maxX, scale),
        west: reverseMercatorLng(boundingPixels.minX, scale),
        south: reverseMercatorLat(boundingPixels.maxY, scale),
        north: reverseMercatorLat(boundingPixels.minY, scale)
    }

    return viewportCoordinates
}

export function mercatorProject(latlng) {
    let siny = Math.sin((latlng.lat * Math.PI) / 180)
    siny = Math.min(Math.max(siny, -0.9999), 0.9999)
    return {
        x: TILE_SIZE * (0.5 + latlng.lng / 360),
        y: TILE_SIZE * (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI))
    }
}

function getScale(zoomLevel) {
    return 1 << zoomLevel
}

function getBoundingPixels(pixelCoordinates, boundsHW, scale) {
    const maxPixel = TILE_SIZE * scale
    return {
        minX: boundPixelMin(pixelCoordinates.x, boundsHW.w),
        maxX: boundPixelMax(pixelCoordinates.x, boundsHW.w, maxPixel),
        minY: boundPixelMin(pixelCoordinates.y, boundsHW.h),
        maxY: boundPixelMax(pixelCoordinates.y, boundsHW.h, maxPixel)
    }
}

function boundPixelMin(pixel, dim) { 
    let bound = pixel - (dim / 2)
    bound = (bound < 0) ? 0 : bound
    return bound
}

function boundPixelMax(pixel, dim, maxPixel) {
    let bound = pixel + (dim / 2)
    bound = (bound > maxPixel) ? maxPixel : bound
    return bound
}

/*
Reverse Mercator Formulas are algebraically derived from the Mercator Projection Above
*/
function reverseMercatorLng(x, scale) {
    return (360 * ((x / scale)  - 0.5 * TILE_SIZE)) / TILE_SIZE
}

function reverseMercatorLat(y, scale) {
    const A = Math.exp((2 * Math.PI) - (4 * Math.PI * (y / scale) / TILE_SIZE))
    return (180 / Math.PI) * Math.asin((A - 1) / (A + 1))
}


getViewportBounds = memoize(getViewportBounds)
