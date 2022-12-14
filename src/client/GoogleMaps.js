import { useEffect } from 'react';
import { useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'


export default function GoogleMaps ({center, zoom, style}) {
    const ref = useRef();
    useEffect(() => {
        new window.google.maps.Map(ref.current, {
            center,
            zoom,
        })
    })
    return <div ref={ref} id="map" style={style} />
}
