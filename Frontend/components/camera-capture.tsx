'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, RefreshCw, X } from 'lucide-react'

type CameraCaptureProps = {
  open: boolean
  onCapture: (file: File) => void
  onClose: () => void
}

function cameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return 'Camera access was denied. Please allow camera permission in your browser settings or use Upload from Gallery.'
    }
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return 'No camera was found. Please use Upload from Gallery.'
    }
    if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      return 'The camera is already in use. Close other camera apps or use Upload from Gallery.'
    }
    if (error.name === 'OverconstrainedError') {
      return 'That camera is not available. Please try another camera or use Upload from Gallery.'
    }
  }
  return 'Unable to access the camera. Please try again or use Upload from Gallery.'
}

export default function CameraCapture({
  open,
  onCapture,
  onClose,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const devicesRef = useRef<MediaDeviceInfo[]>([])
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const [cameraIndex, setCameraIndex] = useState(0)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const startStream = useCallback(
    async (deviceId?: string) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera access is not supported in this browser. Please use Upload from Gallery.')
        return
      }

      setStarting(true)
      setError('')
      stopStream()

      try {
        let stream: MediaStream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: deviceId
              ? { deviceId: { exact: deviceId } }
              : { facingMode: { ideal: 'environment' } },
            audio: false,
          })
        } catch (firstError) {
          if (
            deviceId ||
            !(firstError instanceof DOMException) ||
            !['OverconstrainedError', 'NotFoundError', 'DevicesNotFoundError'].includes(firstError.name)
          ) {
            throw firstError
          }
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          })
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
          (device) => device.kind === 'videoinput'
        )
        devicesRef.current = devices
        const activeDeviceId = stream.getVideoTracks()[0]?.getSettings().deviceId
        const activeIndex = devices.findIndex((device) => device.deviceId === activeDeviceId)
        setCameraIndex(activeIndex >= 0 ? activeIndex : 0)
      } catch (cameraError) {
        stopStream()
        setError(cameraErrorMessage(cameraError))
      } finally {
        setStarting(false)
      }
    },
    [stopStream]
  )

  useEffect(() => {
    if (!open) {
      stopStream()
      setError('')
      return
    }

    void startStream()
    return stopStream
  }, [open, startStream, stopStream])

  useEffect(() => {
    return () => stopStream()
  }, [stopStream])

  function capture() {
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError('The camera is still starting. Please try again in a moment.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('Unable to capture the image. Please try again.')
          return
        }
        stopStream()
        onCapture(new File([blob], `plantguard-camera-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.9
    )
  }

  function switchCamera() {
    const devices = devicesRef.current
    if (devices.length < 2) return
    const nextIndex = (cameraIndex + 1) % devices.length
    setCameraIndex(nextIndex)
    void startStream(devices[nextIndex].deviceId)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-title"
    >
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-4 shadow-lg sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="camera-title" className="font-mono text-lg font-bold">
              Scan Leaf
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Point your camera at a clear plant leaf
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label="Close camera"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="relative mt-4 overflow-hidden rounded-2xl bg-black">
          <video
            ref={videoRef}
            className="aspect-[3/4] w-full object-cover sm:aspect-video"
            autoPlay
            muted
            playsInline
            aria-label="Live camera preview"
          />
          {starting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm text-white">
              Starting camera...
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={switchCamera}
            disabled={devicesRef.current.length < 2 || starting}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3.5 text-sm font-medium transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label="Switch camera"
          >
            <RefreshCw className="size-4" />
            <span className="hidden sm:inline">Switch Camera</span>
          </button>
          <button
            type="button"
            onClick={capture}
            disabled={starting || Boolean(error)}
            className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label="Capture plant leaf photo"
          >
            <Camera className="size-5" />
            Capture
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border border-border px-3.5 text-sm font-medium transition hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
