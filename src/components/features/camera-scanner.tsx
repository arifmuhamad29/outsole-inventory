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
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        videoConstraints: {
          facingMode: "environment"
        }
      },
      /* verbose= */ false
    )

    const playBeep = () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        
        const ctx = new AudioContextClass();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, ctx.currentTime); // 800Hz for a clear beep
        gainNode.gain.setValueAtTime(1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1); // Quick fade out (100ms)
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.1);
      } catch (error) {
        console.warn("AudioContext not supported or blocked", error);
      }
    };

    // Render it
    scannerRef.current.render(
      (decodedText) => {
        playBeep();
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
