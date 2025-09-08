
import About from '@/Components/About'
import Benefits from '@/Components/Benefits'
import Cta from '@/Components/CTA'
import HeaderLand from '@/Components/Header'
import Hero from '@/Components/Hero'
import Plans from '@/Components/Plans'
import Testimonials from '@/Components/Testimonials'

import React from 'react'

const page = () => {
  return (
    <div className='mb-12'>
      <HeaderLand />
      <Hero />
      <Benefits />
      <Plans />
      <About />
      <Testimonials />
      <Cta />
    </div>
  )
}

export default page
