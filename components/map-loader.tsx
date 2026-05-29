'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import type SwissMap from './swiss-map'

const SwissMapClient = dynamic(() => import('./swiss-map'), { ssr: false })

export function MapLoader(props: ComponentProps<typeof SwissMap>) {
  return <SwissMapClient {...props} />
}
