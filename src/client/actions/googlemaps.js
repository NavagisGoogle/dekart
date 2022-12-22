import { CreateTileSessionRequest, GetSessionTokenRequest, Style, GetAttributionRequest } from '../../proto/dekart_pb'
import { lightTheme, darkTheme, terrainStyle } from '../utils/themed-styles' 
import { Dekart } from '../../proto/dekart_pb_service'
import { unary } from '../lib/grpc'
import { error} from './message'
import { get, post } from '../lib/api'

const MAPSTYLES = {
    'streets2d': 1,
    'hybrid': 2,
    'satellite': 2,
    'terrain': 3,
    'light': 1,
    'dark': 1
}

export function createTileSessions () {
    return dispatch => {
        // temporary loop through four enums in protocol buffer MapType
        // will be refactored soon
        // best solution for this is to schedule the re-creation of session tokens once the token expiration is almost reached (through cloud scheduler or crontab)
        Object.keys(MAPSTYLES).forEach( async mapstyle => {
            try {
                const res = await get(`/check-expiry/${mapstyle}`)
                console.log(`RESPONSE CHECK EXPIRY FOR ${mapstyle}`)
                const { hasNoSessionToken, expired } = await res.json()
                console.log(`DB has no saved SessionToken? ${hasNoSessionToken} and is token expired? ${expired}`)
                if (hasNoSessionToken || expired ) {
                    var req = new CreateTileSessionRequest()
                    req.setMapType(MAPSTYLES[mapstyle])
                    req.setLanguage('en-US')
                    req.setRegion('us')
                    req.setImageFormat('png')
                    req.setScale('scaleFactor2x')
                    req.setHighDpi(true)
                    req.setOverlay(false)
                    if (mapstyle === 'hybrid' || mapstyle === 'terrain') req.setLayerTypesList([1])
                    if (mapstyle === 'light') req = setStyleTheme(req, lightTheme)
                    if (mapstyle === 'dark') req = setStyleTheme(req, darkTheme)
                    if (mapstyle === 'terrain') req = setStyleTheme(req, terrainStyle)
                    try {
                        const { sessionId } = await unary(Dekart.CreateTileSession, req)
                        await post(`/update-mapstyle/${mapstyle}/${sessionId}`)
                    } catch (err) {
                        dispatch(error(err))
                        console.log(err)
                        return
                    }
                }
            } catch (err) {
                dispatch(error(err))
                return
            }
        })
    }
}


function setStyleTheme(req, theme) {
    theme.forEach(style => {
        const styleMessage = new Style()

        styleMessage.setElementType(style.elementType)
        styleMessage.setFeatureType(style.featureType)

        style.stylers.forEach(styler => {
            const stylerMessage = new Style.Styler()
            stylerMessage.setHue(styler.hue)
            stylerMessage.setLightness(styler.lightness)
            stylerMessage.setSaturation(styler.saturation)
            stylerMessage.setGamma(styler.gamma)
            stylerMessage.setInvertLightness(styler.invertLightness)
            stylerMessage.setVisibility(styler.visibility)
            stylerMessage.setColor(styler.color)
            stylerMessage.setWeight(styler.weight)
            styleMessage.addStylers(stylerMessage)
        })

        req.addStyles(styleMessage)
    })
    return req
}


export function getSessionToken () {
    return async (dispatch, getState) => {
        console.log('Calling Get Session Token')
        const { googleMaps: { sessionId }} = getState()
        const req = new GetSessionTokenRequest()
        req.setSessionid(sessionId)
        try {
            const { sessionToken } = await unary(Dekart.GetSessionToken, req)
            console.log('Get Session Token Call was successful')
            console.log(sessionToken)
        } catch (err) {
            dispatch(error(err))
            console.log(err)
            return
        }
    }
}


export function getAttribution (zoomLevel, bounds, mapStyle) {
    return async dispatch => {
        const req = new GetAttributionRequest()
        req.setMapStyle(mapStyle)
        req.setZoomLevel(zoomLevel)
        req.setNorth(bounds.north)
        req.setSouth(bounds.south)
        req.setEast(bounds.east)
        req.setWest(bounds.west)
        try {
            const { copyright } = await unary(Dekart.GetAttribution, req)
            dispatch({type: getAttribution.name, copyright: copyright})
        } catch (err) {
            dispatch(error(err))
            console.log(err)
            return
        }
    }
}