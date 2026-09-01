/*
Copyright (C) 2023-2026 Chaos

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

*/
import { useEffect, useRef } from 'react'

type Particle = {
  angle: number
  distance: number
  opacity: number
  radius: number
  speed: number
}

const PARTICLE_COUNT = 3000
const BLACK_HOLE_RADIUS = 84
const PARTICLE_ORBIT_RADIUS = BLACK_HOLE_RADIUS

export function BlackHoleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    let centerX = 0
    let centerY = 0
    let animationFrame = 0
    let particles: Particle[] = []

    const createParticles = () => {
      particles = Array.from({ length: PARTICLE_COUNT }, () => {
        const opacity = (Math.random() * 5 + 2) / 10
        const distance = (1 / opacity) * PARTICLE_ORBIT_RADIUS

        return {
          angle: Math.random() * Math.PI * 2,
          distance,
          opacity,
          radius: Math.random(),
          speed: distance * 0.00003,
        }
      })
    }

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const width = window.innerWidth
      const height = window.innerHeight

      canvas.width = Math.floor(width * pixelRatio)
      canvas.height = Math.floor(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      centerX = width / 2
      centerY = height / 2
    }

    const draw = (animate: boolean) => {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight)

      for (const particle of particles) {
        if (animate) {
          particle.angle += particle.speed
        }

        const x = centerX + particle.distance * Math.cos(particle.angle)
        const y = centerY + particle.distance * Math.sin(particle.angle)

        context.fillStyle = `rgba(255,255,255,${particle.opacity})`
        context.beginPath()
        context.arc(x, y, particle.radius, 0, Math.PI * 2)
        context.fill()
      }

      context.fillStyle = '#000'
      context.beginPath()
      context.arc(centerX, centerY, BLACK_HOLE_RADIUS, 0, Math.PI * 2)
      context.fill()
    }

    const animate = () => {
      draw(true)
      animationFrame = window.requestAnimationFrame(animate)
    }

    resize()
    createParticles()
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion) {
      draw(false)
    } else {
      animationFrame = window.requestAnimationFrame(animate)
    }

    window.addEventListener('resize', resize)
    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className='block h-svh w-full bg-black'
      aria-hidden='true'
    />
  )
}
