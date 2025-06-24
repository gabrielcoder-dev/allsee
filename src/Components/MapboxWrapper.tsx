import dynamic from 'next/dynamic'

const Mapbox = dynamic(() => import('./MapboxClient'), { ssr: false })

export default Mapbox