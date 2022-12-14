import { CreateTileSessionRequest, GetTileRequest } from '../../proto/dekart_pb'
import { Dekart } from '../../proto/dekart_pb_service'
import { unary } from '../lib/grpc'
import { error} from './message'

export function createTileSession () {
    return async dispatch => {
        console.log('Calling Create Session')
        const req = new CreateTileSessionRequest()
        req.setMaptype(1)
        req.setLanguage('en-US')
        req.setRegion('us')
        req.setImageformat('png')
        req.setLayertypesList([1])
        req.setOverlay(false)
        try {
            const { sessionid }  = await unary(Dekart.CreateTileSession, req)
            console.log('Create Tile Session Call was successful')
            dispatch({type: createTileSession.name, sessionId: sessionid})
        } catch (err) {
            dispatch(error(err))
            console.log(err)
            return
        }
    }
}


export function getTile () {
    return async (dispatch, getState) => {
        console.log('Calling Get Tile Request')
        const { googleMaps: { sessionId, zoomLevel, tileX, tileY }} = getState()
        const req = new GetTileRequest()
        req.setSessionid(sessionId)
        req.setZoomlevel(zoomLevel)
        req.setTilex(tileX)
        req.setTiley(tileY)
        try {
            const resp = await unary(Dekart.GetTile, req)
            console.log('Get Tile Image Call was successful')
        } catch (err) {
            dispatch(error(err))
            console.log(err)
            return
        }
    }
}