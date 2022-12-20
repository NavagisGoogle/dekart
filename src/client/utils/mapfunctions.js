const EARTH_RADIUS = 6371e3

// This function is not accurate. We need to find a formula that converts CenterLatLng, ZoomLevel, and Bounds in Pixel
// to viewport bound coordinates (in degrees)
export function getViewportBounds(zoomLevel, centerLatLng, boundsHW) {
    return {
        north: 0,
        south: 0,
        east: 0,
        west: 0
    }

    const latRad = toRad(centerLatLng.lat)
    const lngRad = toRad(centerLatLng.lng)

    const dist = zoomLevelToDistance(zoomLevel)

    const widthRad = viewportRad(boundsHW.w, dist)
    const heightRad = viewportRad(boundsHW.h, dist)

    const northDeg = toDeg(latRad + heightRad / 2)
    const southDeg = toDeg(latRad - heightRad / 2)
    const eastDeg = toDeg(lngRad + widthRad / (2 * Math.cos(latRad)))
    const westDeg = toDeg(lngRad - widthRad / (2 * Math.cos(latRad)))
    return {
        north: northDeg,
        south: southDeg,
        east: eastDeg,
        west: westDeg
    }
}


function zoomLevelToDistance(zoomLevel) {
    return 256 * Math.pow(2, zoomLevel)
}


function toRad(deg) {
    return deg * (Math.PI / 180)
}

function toDeg(rad) {
    return rad * (180 / Math.PI)
}

function viewportRad(val, dist) {
    return (dist * val / 256) / EARTH_RADIUS
}