'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
      
      // 앱 사용 후 일정 시간이 지나면 설치 프롬프트 표시
      setTimeout(() => {
        setShowInstallPrompt(true)
      }, 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // 이미 설치된 경우 체크
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('PWA가 이미 설치되어 있습니다.')
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('PWA 설치됨')
      } else {
        console.log('PWA 설치 거부됨')
      }
      
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    } catch (error) {
      console.error('PWA 설치 오류:', error)
    }
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    // 24시간 후 다시 표시 (localStorage 사용)
    localStorage.setItem('pwa-install-dismissed', new Date().getTime().toString())
  }

  // 이미 dismiss한 경우 24시간 체크
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      const now = new Date().getTime()
      const twentyFourHours = 24 * 60 * 60 * 1000
      
      if (now - dismissedTime < twentyFourHours) {
        setShowInstallPrompt(false)
        return
      }
    }
  }, [])

  if (!isInstallable || !showInstallPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">T</span>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">앱 설치하기</h3>
          <p className="text-sm text-gray-600">
            Temis를 홈 화면에 추가하여 더 빠르게 접근하세요
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2">
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            >
              나중에
            </button>
            <button
              onClick={handleInstallClick}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              설치
            </button>
          </div>
          <Link
            href="/mobile-install"
            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors text-center"
          >
            설치 가이드
          </Link>
        </div>
      </div>
    </div>
  )
}