import { CreateTileSessionRequest } from '../../proto/dekart_pb'
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
            const tileSession  = await unary(Dekart.CreateTileSession, req)
            console.log('Create Tile Session Call was successful')
            console.log(tileSession)
        } catch (err) {
            dispatch(error(err))
            console.log(err)
            return
        }
    }
}