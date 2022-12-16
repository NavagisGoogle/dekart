import { CreateTileSessionRequest, GetSessionTokenRequest } from '../../proto/dekart_pb'
import { Dekart } from '../../proto/dekart_pb_service'
import { unary } from '../lib/grpc'
import { error} from './message'
import { get, post } from '../lib/api'

const MAPSTYLES = {
    'gmp-2d-streets': 1,
    'gmp-hybrid': 2,
    'gmp-satellite': 2,
    'gmp-terrain': 3
}

export function createTileSessions () {
    return dispatch => {
        // temporary loop through four enums in protocol buffer MapType
        // will be refactored soon
        // best solution for this is the schedule the re-creation of session tokens once the token expiration is almost reached (through cloud scheduler or crontab)
        Object.keys(MAPSTYLES).forEach( async mapstyle => {
            try {
                const res = await get(`/check-expiry/${mapstyle}`)
                console.log(`RESPONSE CHECK EXPIRY FOR ${mapstyle}`)
                const { hasNoSessionToken, expired } = await res.json()
                console.log(`[TRY BLOCK] Has Session Token ${hasNoSessionToken} and Is Expired ${expired}`)
                if (hasNoSessionToken || expired ) {
                    const req = new CreateTileSessionRequest()
                    req.setMapType(MAPSTYLES[mapstyle])
                    req.setLanguage('en-US')
                    req.setRegion('us')
                    req.setImageFormat('png')
                    req.setOverlay(false)
                    if (mapstyle === 'gmp-hybrid' || mapstyle === 'gmp-terrain') req.setLayerTypesList([1])
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