"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Camera, CameraOff, Keyboard, Loader2 } from "lucide-react"
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export interface QRScannerProps {
  onScan: (uuid: string) => void
  onError?: (error: string) => void
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const [mode, setMode] = useState<"camera" | "manual">("camera")
  const [manualInput, setManualInput] = useState("")
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerId = `qr-reader-${Math.random().toString(36).slice(2, 9)}`

  const startScanner = useCallback(async () => {
    if (!document.getElementById(containerId)) return

    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(containerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      })
    }

    try {
      setCameraError(null)
      setIsScanning(true)
      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Valid UUID format check
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          if (uuidRegex.test(decodedText.trim())) {
            onScan(decodedText.trim())
            // Stop after successful scan
            scannerRef.current?.stop().catch(console.error)
            setIsScanning(false)
          } else if (onError) {
            onError("Invalid QR code. Expected a product UUID.")
          }
        },
        () => {
          // Ignore scan failures (no QR found in frame)
        }
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Camera error"
      setCameraError(msg)
      if (onError) onError(msg)
      setIsScanning(false)
    }
  }, [onScan, onError])

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
      } catch {
        // Ignore stop errors
      }
    }
    setIsScanning(false)
  }, [])

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(console.error)
    }
  }, [])

  useEffect(() => {
    if (mode === "camera") {
      startScanner()
    } else {
      stopScanner()
    }
  }, [mode, startScanner, stopScanner])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = manualInput.trim()
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(trimmed)) {
      onScan(trimmed)
      setManualInput("")
    } else if (onError) {
      onError("Invalid UUID format")
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Camera className="size-4" />
          Scan Product
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={mode} onValueChange={(v) => setMode(v as "camera" | "manual")}>
          <TabsList className="w-full">
            <TabsTrigger value="camera" className="flex-1">
              <Camera className="size-4 mr-2" />
              Camera
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">
              <Keyboard className="size-4 mr-2" />
              Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="space-y-3">
            {cameraError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                <CameraOff className="size-4 inline mr-2" />
                {cameraError}
              </div>
            )}
            <div
              className="relative w-full bg-muted rounded-lg overflow-hidden"
              style={{ minHeight: "280px" }}
            >
              <div id={containerId} className="w-full" style={{ minHeight: "280px" }} />
              {!isScanning && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground pointer-events-none">
                  <div className="text-center p-4">
                    <Loader2 className="size-8 mx-auto animate-spin" />
                    <p className="mt-2 text-sm">Starting camera...</p>
                  </div>
                </div>
              )}
            </div>
            {isScanning && (
              <p className="text-xs text-center text-muted-foreground">
                Point camera at QR code to scan
              </p>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-3">
            <form onSubmit={handleManualSubmit} className="space-y-2">
              <Input
                placeholder="Enter product UUID (e.g., a1b2c3d4-e5f6-7890-abcd-ef1234567890)"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="font-mono"
              />
              <Button type="submit" className="w-full" disabled={!manualInput.trim()}>
                Lookup Product
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}