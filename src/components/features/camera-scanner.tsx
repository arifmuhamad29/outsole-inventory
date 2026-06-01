"use client"

import { useEffect, useRef } from "react"
import { Html5QrcodeScanner } from "html5-qrcode"

interface CameraScannerProps {
  onScanSuccess: (decodedText: string) => void
  onScanError?: (errorMessage: string) => void
}

export function CameraScanner({ onScanSuccess, onScanError }: CameraScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  useEffect(() => {
    // Create instance
    scannerRef.current = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    )

    // Render it
    scannerRef.current.render(
      (decodedText) => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error)
        }
        onScanSuccess(decodedText)
      },
      (errorMessage) => {
        if (onScanError) {
          onScanError(errorMessage)
        }
      }
    )

    // Cleanup
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error)
      }
    }
  }, [onScanSuccess, onScanError])

  return (
    <div className="w-full mx-auto overflow-hidden rounded-lg">
      <div id="reader" className="w-full border-none"></div>
    </div>
  )
}
