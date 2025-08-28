'use client'

import { useState, useEffect } from 'react'

export interface DeviceInfo {
  isIOS: boolean
  isAndroid: boolean
  isMobile: boolean
  browserName: string
  isInstallable: boolean
  isStandalone: boolean
}

export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isIOS: false,
    isAndroid: false,
    isMobile: false,
    browserName: '',
    isInstallable: false,
    isStandalone: false,
  })

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    
    // iOS 감지
    const isIOS = /ipad|iphone|ipod/.test(userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    
    // Android 감지
    const isAndroid = /android/.test(userAgent)
    
    // 모바일 감지
    const isMobile = isIOS || isAndroid || /mobile/.test(userAgent)
    
    // 브라우저 감지
    let browserName = ''
    if (/chrome/.test(userAgent) && !/edge/.test(userAgent)) {
      browserName = 'Chrome'
    } else if (/safari/.test(userAgent) && !/chrome/.test(userAgent)) {
      browserName = 'Safari'
    } else if (/firefox/.test(userAgent)) {
      browserName = 'Firefox'
    } else if (/edge/.test(userAgent)) {
      browserName = 'Edge'
    } else if (/samsung/.test(userAgent)) {
      browserName = 'Samsung Internet'
    } else {
      browserName = 'Unknown'
    }
    
    // PWA 설치 가능 여부 확인
    const isInstallable = 'serviceWorker' in navigator && 
      ('BeforeInstallPromptEvent' in window || isIOS)
    
    // 이미 PWA로 설치되어 실행 중인지 확인
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)

    setDeviceInfo({
      isIOS,
      isAndroid,
      isMobile,
      browserName,
      isInstallable,
      isStandalone,
    })
  }, [])

  return deviceInfo
}