'use client'

import { useEffect } from 'react'

export default function PWAIcon() {
  useEffect(() => {
    const generateIcon = (size: number, filename: string) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      
      canvas.width = size
      canvas.height = size
      
      // 배경색 (흰색)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
      
      // 둥근 모서리
      const radius = size * 0.2
      ctx.beginPath()
      ctx.roundRect(0, 0, size, size, radius)
      ctx.clip()
      
      // 그라데이션 배경
      const gradient = ctx.createLinearGradient(0, 0, size, size)
      gradient.addColorStop(0, '#3B82F6')
      gradient.addColorStop(1, '#1E40AF')
      
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, size, size)
      
      // 중앙에 "T" 로고
      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${size * 0.5}px system-ui, -apple-system, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('T', size / 2, size / 2)
      
      // 다운로드
      const link = document.createElement('a')
      link.download = filename
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    
    // 여러 크기의 아이콘 생성
    const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
    
    setTimeout(() => {
      sizes.forEach(size => {
        generateIcon(size, `icon-${size}x${size}.png`)
      })
    }, 1000)
  }, [])
  
  return null
}