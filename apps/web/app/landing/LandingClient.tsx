'use client'
import { useState } from 'react'
import LandingHeader from './LandingHeader'
import LandingSidebar from './LandingSidebar'

export default function LandingClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <LandingHeader onMenuClick={() => setSidebarOpen(true)} />
      <LandingSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  )
}
