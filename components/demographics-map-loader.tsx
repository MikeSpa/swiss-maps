'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import type DemographicsMap from './demographics-map'

const DemographicsMapClient = dynamic(() => import('./demographics-map'), { ssr: false })

export function DemographicsMapLoader(props: ComponentProps<typeof DemographicsMap>) {
  return <DemographicsMapClient {...props} />
}
