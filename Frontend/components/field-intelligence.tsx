'use client'

import {
  ChangeEvent,
  DragEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Check, Compass, Crosshair, Map, MapPin, RotateCcw, Search } from 'lucide-react'

type Point = { x: number; y: number }
type GeoPoint = [number, number]
type BoundaryMode = 'polygon' | 'rectangle'
type LocationState = 'idle' | 'browser' | 'manual'

type FieldIntelligenceProps = {
  conditionName?: string
  conditionType?: string
  onBack?: () => void
}

const SATELLITE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const SATELLITE_MAX_SIZE = 10 * 1024 * 1024

export default function FieldIntelligence({
  conditionName = 'Plant condition',
  conditionType = 'Disease',
  onBack,
}: FieldIntelligenceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fieldImageContainerRef = useRef<HTMLDivElement>(null)
  const [locationSource, setLocationSource] = useState<LocationState>('idle')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [selectedLatitude, setSelectedLatitude] = useState<number | null>(null)
  const [selectedLongitude, setSelectedLongitude] = useState<number | null>(null)
  const [locationError, setLocationError] = useState('')
  const [satelliteFile, setSatelliteFile] = useState<File | null>(null)
  const [satellitePreview, setSatellitePreview] = useState('')
  const [satelliteNotice, setSatelliteNotice] = useState('')
  const [boundaryMode, setBoundaryMode] = useState<BoundaryMode>('polygon')
  const [boundaryPoints, setBoundaryPoints] = useState<Point[]>([])
  const [fieldPolygon, setFieldPolygon] = useState<GeoPoint[]>([])
  const [fieldConfirmed, setFieldConfirmed] = useState(false)
  const [addCornerMode, setAddCornerMode] = useState(false)
  const [selectedCornerIndex, setSelectedCornerIndex] = useState<number | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [analysisPreviewOpen, setAnalysisPreviewOpen] = useState(false)

  useEffect(() => {
    return () => {
      if (satellitePreview) URL.revokeObjectURL(satellitePreview)
    }
  }, [satellitePreview])

  useEffect(() => {
    const nextPolygon = buildGeoJsonPolygon(boundaryPoints, selectedLongitude ?? 0, selectedLatitude ?? 0, boundaryMode)
    setFieldPolygon(nextPolygon)
  }, [boundaryMode, boundaryPoints, selectedLatitude, selectedLongitude])

  function handleGeolocation() {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported in this browser.')
      return
    }

    setLocationError('')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setSelectedLatitude(coords.latitude)
        setSelectedLongitude(coords.longitude)
        setLocationSource('browser')
        setLatitude(coords.latitude.toFixed(5))
        setLongitude(coords.longitude.toFixed(5))
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission was not granted. You can enter your field coordinates manually.')
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError('Location information is unavailable right now. Please enter coordinates manually.')
        } else if (error.code === error.TIMEOUT) {
          setLocationError('Location request timed out. Please enter coordinates manually.')
        } else {
          setLocationError('Unable to use your current location. Please enter coordinates manually.')
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    )
  }

  function handleManualLocationContinue() {
    const lat = Number(latitude)
    const lon = Number(longitude)

    if (!latitude || !longitude) {
      setLocationError('Please enter both latitude and longitude.')
      return
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setLocationError('Latitude and longitude must be valid numbers.')
      return
    }

    if (lat < -90 || lat > 90) {
      setLocationError('Latitude must be between -90 and 90.')
      return
    }

    if (lon < -180 || lon > 180) {
      setLocationError('Longitude must be between -180 and 180.')
      return
    }

    setLocationError('')
    setSelectedLatitude(lat)
    setSelectedLongitude(lon)
    setLocationSource('manual')
  }

  function handleFileSelect(file: File | undefined) {
    if (!file) return

    if (!SATELLITE_TYPES.includes(file.type)) {
      setLocationError('Please choose a JPG, PNG, or WEBP image.')
      return
    }

    if (file.size > SATELLITE_MAX_SIZE) {
      setLocationError('Satellite image must be under 10 MB.')
      return
    }

    if (satellitePreview) URL.revokeObjectURL(satellitePreview)

    setSatelliteFile(file)
    setSatellitePreview(URL.createObjectURL(file))
    setSatelliteNotice('Satellite image ready for the next field-analysis integration.')
    setLocationError('')
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    handleFileSelect(e.dataTransfer.files?.[0])
  }

  function clearSatelliteImage() {
    if (satellitePreview) URL.revokeObjectURL(satellitePreview)
    setSatelliteFile(null)
    setSatellitePreview('')
    setSatelliteNotice('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function clampPoint(point: Point): Point {
    return {
      x: Math.min(Math.max(point.x, 0), 100),
      y: Math.min(Math.max(point.y, 0), 100),
    }
  }

  function pointFromClientPosition(event: ReactPointerEvent<SVGSVGElement>): Point {
    const bounds = fieldImageContainerRef.current?.getBoundingClientRect()
    if (!bounds || bounds.width === 0 || bounds.height === 0) {
      return { x: 0, y: 0 }
    }

    const x = ((event.clientX - bounds.left) / bounds.width) * 100
    const y = ((event.clientY - bounds.top) / bounds.height) * 100
    return clampPoint({ x, y })
  }

  function addCorner(point: Point) {
    setBoundaryPoints((current) => {
      const next = [...current, point]
      setSelectedCornerIndex(next.length - 1)
      return next
    })
    setAddCornerMode(false)
    setFieldConfirmed(false)
    setAnalysisPreviewOpen(false)
  }

  function handleMapPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (!addCornerMode) return
    event.preventDefault()
    event.stopPropagation()
    addCorner(pointFromClientPosition(event))
  }

  function handleMarkerPointerDown(event: ReactPointerEvent<SVGCircleElement>, index: number) {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setSelectedCornerIndex(index)
    setAddCornerMode(false)
    setDraggingIndex(index)
  }

  function handleMapPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (draggingIndex === null) return
    const nextPoint = pointFromClientPosition(event)
    setBoundaryPoints((current) => current.map((point, index) => (index === draggingIndex ? nextPoint : point)))
  }

  function handleMapPointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    setDraggingIndex(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function undoLastCorner() {
    if (boundaryPoints.length === 0) return
    setBoundaryPoints((current) => current.slice(0, -1))
    setSelectedCornerIndex(null)
    setFieldConfirmed(false)
    setAnalysisPreviewOpen(false)
  }

  function clearBoundary() {
    if (boundaryPoints.length > 0) {
      const shouldClear = window.confirm('Clear this field boundary?')
      if (!shouldClear) return
    }

    setBoundaryPoints([])
    setSelectedCornerIndex(null)
    setFieldConfirmed(false)
    setAddCornerMode(false)
    setDraggingIndex(null)
    setAnalysisPreviewOpen(false)
  }

  function confirmBoundary() {
    if (boundaryPoints.length < 3) return
    setFieldConfirmed(true)
    setAddCornerMode(false)
  }

  function handleAnalyzeField() {
    if (!fieldConfirmed || boundaryPoints.length < 3) return
    setAnalysisPreviewOpen(true)
  }

  const polygonPoints = useMemo(() => {
    if (boundaryPoints.length < 3) return ''

    const points = boundaryPoints.map((point) => `${point.x},${point.y}`).join(' ')
    return `${points} ${boundaryPoints[0].x},${boundaryPoints[0].y}`
  }, [boundaryPoints])

  const rectPoints = useMemo(() => {
    if (boundaryMode === 'rectangle' && boundaryPoints.length >= 2) {
      const [first, second] = boundaryPoints
      const x1 = Math.min(first.x, second.x)
      const x2 = Math.max(first.x, second.x)
      const y1 = Math.min(first.y, second.y)
      const y2 = Math.max(first.y, second.y)
      return `${x1},${y1} ${x2},${y1} ${x2},${y2} ${x1},${y2} ${x1},${y1}`
    }
    return ''
  }, [boundaryMode, boundaryPoints])

  const visiblePolygonPoints = boundaryMode === 'rectangle' ? rectPoints : polygonPoints
  const boundaryReady = boundaryPoints.length >= 3
  const displayLatitude = selectedLatitude ?? (Number(latitude) || null)
  const displayLongitude = selectedLongitude ?? (Number(longitude) || null)
  const interactionHint = addCornerMode
    ? 'Tap to place corner'
    : selectedCornerIndex !== null
      ? 'Drag a corner to adjust'
      : 'Tap the corners of your field'

  return (
    <section
      aria-labelledby="field-intelligence-title"
      className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6"
    >
      {!analysisPreviewOpen ? (
        <>
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <h2
                  id="field-intelligence-title"
                  className="font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
                >
                  🌱 Field Intelligence
                </h2>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Define your field so we can identify areas that may need inspection first.
                </p>
              </div>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-secondary"
                >
                  ← Back to Diagnosis
                </button>
              )}
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3 text-sm">
              <p className="text-muted-foreground">
                Detected condition: <span className="font-semibold text-foreground">{conditionName}</span>
              </p>
              <p className="mt-1 text-muted-foreground">
                Detection type: <span className="font-semibold text-foreground">{conditionType}</span>
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <div className="rounded-2xl border border-border bg-secondary/20 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MapPin className="size-4" />
                </span>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  1. Select Field Location
                </h3>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleGeolocation}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                >
                  <Crosshair className="size-4" />
                  Use My Location
                </button>

                <button
                  type="button"
                  onClick={() => setLocationSource('manual')}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                >
                  <Compass className="size-4" />
                  Enter Coordinates
                </button>
              </div>

              {(locationSource === 'browser' || locationSource === 'manual' || selectedLatitude !== null) && (
                <div className="mt-4 rounded-xl border border-primary/20 bg-primary/[0.04] p-3 text-sm">
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    <Check className="size-4 text-primary" />
                    Location selected
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Latitude: {displayLatitude ?? '--'}
                  </p>
                  <p className="text-muted-foreground">
                    Longitude: {displayLongitude ?? '--'}
                  </p>
                </div>
              )}

              {locationSource === 'manual' && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-muted-foreground">
                    <span className="mb-1 block">Latitude</span>
                    <input
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary"
                      placeholder="e.g. 15.3173"
                      inputMode="decimal"
                    />
                  </label>

                  <label className="text-sm text-muted-foreground">
                    <span className="mb-1 block">Longitude</span>
                    <input
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary"
                      placeholder="e.g. 75.7139"
                      inputMode="decimal"
                    />
                  </label>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleManualLocationContinue}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {locationError && (
                <p role="alert" className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {locationError}
                </p>
              )}
            </div>

            {selectedLatitude !== null && selectedLongitude !== null && (
              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Map className="size-4" />
                  </span>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    2. Define Your Field
                  </h3>
                </div>

                <p className="text-sm text-muted-foreground">
                  Tap the corners of your field on the map.
                </p>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBoundaryMode('polygon')}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${
                      boundaryMode === 'polygon'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-foreground hover:bg-secondary'
                    }`}
                  >
                    Draw Polygon
                  </button>
                  <button
                    type="button"
                    onClick={() => setBoundaryMode('rectangle')}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${
                      boundaryMode === 'rectangle'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-foreground hover:bg-secondary'
                    }`}
                  >
                    Rectangle
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border border-border bg-card/60 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {boundaryMode === 'polygon' ? 'Polygon boundary' : 'Rectangle boundary'}
                    </span>
                    {boundaryPoints.length > 0 && (
                      <button
                        type="button"
                        onClick={undoLastCorner}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary"
                      >
                        <RotateCcw className="size-3.5" />
                        Undo Last
                      </button>
                    )}
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAddCornerMode(true)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      <span aria-hidden="true">＋</span>
                      Add Corner
                    </button>
                    <button
                      type="button"
                      onClick={clearBoundary}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-secondary"
                    >
                      Clear Boundary
                    </button>
                  </div>

                  <div className="relative mt-4 overflow-hidden rounded-xl border border-border bg-card/60">
                    <div ref={fieldImageContainerRef} className="relative w-full overflow-hidden">
                      <img
                        src="/images/agricultural-field-aerial.jpg"
                        alt="Aerial agricultural field"
                        className="block h-auto w-full object-contain saturate-[1.1] contrast-[1.05]"
                      />
                      <div className="absolute inset-0 bg-slate-950/10" />

                      <div className="absolute left-3 top-3 z-10 rounded-full border border-white/40 bg-slate-950/35 px-2.5 py-1 text-[10px] font-medium tracking-[0.12em] text-white shadow-sm backdrop-blur-[2px]">
                        {interactionHint}
                      </div>

                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="absolute inset-0 z-20 h-full w-full cursor-crosshair"
                        onPointerDown={handleMapPointerDown}
                        onPointerMove={handleMapPointerMove}
                        onPointerUp={handleMapPointerUp}
                        onPointerCancel={handleMapPointerUp}
                        style={{ touchAction: addCornerMode || draggingIndex !== null ? 'none' : 'pan-y' }}
                        aria-label="Field boundary editor"
                        role="img"
                      >
                        <rect x="0" y="0" width="100" height="100" fill="transparent" />
                        {visiblePolygonPoints && (
                          <polygon
                            points={visiblePolygonPoints}
                            fill="rgba(34, 197, 94, 0.16)"
                            stroke="#22c55e"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                        )}

                        {boundaryPoints.map((point, index) => (
                          <g key={`${point.x}-${point.y}-${index}`}>
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r={selectedCornerIndex === index ? 3.8 : 2.8}
                              fill={selectedCornerIndex === index ? '#16a34a' : '#22c55e'}
                              stroke="white"
                              strokeWidth="1"
                              onPointerDown={(event) => handleMarkerPointerDown(event, index)}
                              onPointerUp={(event) => {
                                event.stopPropagation()
                                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                  event.currentTarget.releasePointerCapture(event.pointerId)
                                }
                                setDraggingIndex(null)
                              }}
                              onPointerCancel={(event) => {
                                event.stopPropagation()
                                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                  event.currentTarget.releasePointerCapture(event.pointerId)
                                }
                                setDraggingIndex(null)
                              }}
                              style={{ cursor: 'grab', touchAction: 'none' }}
                            />
                          </g>
                        ))}
                      </svg>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={confirmBoundary}
                      disabled={!boundaryReady || fieldConfirmed}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Check className="size-4" />
                      Confirm Field
                    </button>
                  </div>

                  {fieldConfirmed ? (
                    <div className="mt-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-3 text-sm">
                      <p className="flex items-center gap-2 font-medium text-foreground">
                        <Check className="size-4 text-primary" />
                        Field boundary selected
                      </p>
                      <p className="mt-1 text-muted-foreground">Boundary points: {boundaryPoints.length}</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Add at least 3 corners to confirm the field boundary.
                    </p>
                  )}
                </div>

                {fieldConfirmed && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleAnalyzeField}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      <Search className="size-4" />
                      Analyze Field
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <DemoFieldAnalysis
          conditionName={conditionName}
          conditionType={conditionType}
          onAdjustBoundary={() => setAnalysisPreviewOpen(false)}
          onScanAnotherLeaf={onBack || (() => undefined)}
          fieldPoints={boundaryPoints}
          selectedLatitude={selectedLatitude}
          selectedLongitude={selectedLongitude}
        />
      )}
    </section>
  )
}

function DemoFieldAnalysis({
  conditionName,
  conditionType,
  onAdjustBoundary,
  onScanAnotherLeaf,
  fieldPoints,
  selectedLatitude,
  selectedLongitude,
}: {
  conditionName: string
  conditionType: string
  onAdjustBoundary: () => void
  onScanAnotherLeaf: () => void
  fieldPoints: Point[]
  selectedLatitude: number | null
  selectedLongitude: number | null
}) {
  const displayFieldPoints = useMemo(() => {
    if (fieldPoints.length < 3) return ''

    const imagePoints = fieldPoints.map((point) => ({ x: point.x, y: point.y * 1.5 }))
    const bounds = imagePoints.reduce(
      (current, point) => ({
        minX: Math.min(current.minX, point.x),
        maxX: Math.max(current.maxX, point.x),
        minY: Math.min(current.minY, point.y),
        maxY: Math.max(current.maxY, point.y),
      }),
      { minX: 100, maxX: 0, minY: 150, maxY: 0 }
    )
    const width = Math.max(bounds.maxX - bounds.minX, 1)
    const height = Math.max(bounds.maxY - bounds.minY, 1)
    const scale = Math.min(84 / width, 134 / height)
    const offsetX = 50 - ((bounds.minX + bounds.maxX) / 2) * scale
    const offsetY = 75 - ((bounds.minY + bounds.maxY) / 2) * scale

    return imagePoints
      .map((point) => `${point.x * scale + offsetX},${point.y * scale + offsetY}`)
      .join(' ')
  }, [fieldPoints])

  const inspectionMarker = useMemo(() => {
    if (fieldPoints.length < 3) return null

    const imagePoints = fieldPoints.map((point) => ({ x: point.x, y: point.y * 1.5 }))
    const bounds = imagePoints.reduce(
      (current, point) => ({
        minX: Math.min(current.minX, point.x),
        maxX: Math.max(current.maxX, point.x),
        minY: Math.min(current.minY, point.y),
        maxY: Math.max(current.maxY, point.y),
      }),
      { minX: 100, maxX: 0, minY: 150, maxY: 0 }
    )
    const width = Math.max(bounds.maxX - bounds.minX, 1)
    const height = Math.max(bounds.maxY - bounds.minY, 1)
    const scale = Math.min(84 / width, 134 / height)
    const offsetX = 50 - ((bounds.minX + bounds.maxX) / 2) * scale
    const offsetY = 75 - ((bounds.minY + bounds.maxY) / 2) * scale

    return imagePoints.reduce(
      (current, point) => ({
        x: current.x + (point.x * scale + offsetX) / imagePoints.length,
        y: current.y + (point.y * scale + offsetY) / imagePoints.length,
      }),
      { x: 0, y: 0 }
    )
  }, [fieldPoints])

  const windDemo = '↗ Northwest → Southeast'

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">🌱</span>
            <h2 className="font-mono text-2xl font-bold tracking-tight text-foreground">Field Analysis</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Demo Field Analysis</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-secondary/20 p-4 text-sm">
        <p className="text-muted-foreground">
          Detected condition: <span className="font-semibold text-foreground">{conditionName}</span>
        </p>
        <p className="mt-1 text-muted-foreground">
          Detection type: <span className="font-semibold text-foreground">{conditionType}</span>
        </p>
        <p className="mt-1 text-muted-foreground">
          Field boundary: <span className="font-semibold text-foreground">Selected</span>
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-secondary/20 p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-base" role="img" aria-label="field risk map">🗺️</span>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Probable Spread / Inspection Priority
          </h3>
        </div>

        <p className="text-sm text-muted-foreground">
          Illustrative inspection-priority preview
        </p>

        <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card/60 p-3">
          <svg
            viewBox="0 0 100 150"
            preserveAspectRatio="xMidYMid meet"
            className="block h-auto min-h-72 w-full rounded-xl border border-dashed border-border bg-[radial-gradient(circle_at_center,_rgba(34,197,94,0.08),_transparent_62%)]"
            role="img"
            aria-label="Illustrative inspection priority map for the selected field"
          >
            {displayFieldPoints && (
              <defs>
                <clipPath id="field-priority-clip">
                  <polygon points={displayFieldPoints} />
                </clipPath>
                <radialGradient id="priority-low" cx="28%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#86efac" stopOpacity="0.4" />
                  <stop offset="58%" stopColor="#4ade80" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="priority-medium" cx="55%" cy="58%" r="62%">
                  <stop offset="0%" stopColor="#facc15" stopOpacity="0.38" />
                  <stop offset="52%" stopColor="#f59e0b" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="priority-high" cx="72%" cy="72%" r="38%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.58" />
                  <stop offset="42%" stopColor="#f97316" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                </radialGradient>
                <filter id="priority-soften" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" />
                </filter>
              </defs>
            )}

            <image
              href="/images/agricultural-field-aerial.jpg"
              x="0"
              y="0"
              width="100"
              height="150"
              preserveAspectRatio="xMidYMid slice"
              opacity="0.78"
            />

            {displayFieldPoints && (
              <g clipPath="url(#field-priority-clip)">
                <rect x="0" y="0" width="100" height="150" fill="url(#priority-low)" />
                <ellipse cx="54" cy="78" rx="48" ry="62" fill="url(#priority-medium)" filter="url(#priority-soften)" />
                <ellipse cx="74" cy="108" rx="27" ry="34" fill="url(#priority-high)" filter="url(#priority-soften)" />
                <ellipse cx="25" cy="42" rx="24" ry="28" fill="url(#priority-low)" opacity="0.8" />
                <path
                  d="M8 82 C24 72 36 87 49 80 S74 70 92 80"
                  fill="none"
                  stroke="#fef08a"
                  strokeOpacity="0.28"
                  strokeWidth="1.2"
                />
                <path
                  d="M12 96 C28 86 39 102 54 94 S78 84 90 93"
                  fill="none"
                  stroke="#fb923c"
                  strokeOpacity="0.26"
                  strokeWidth="1.1"
                />
              </g>
            )}

            {displayFieldPoints && (
              <polygon
                points={displayFieldPoints}
                fill="rgba(22, 101, 52, 0.06)"
                stroke="#f0fdf4"
                strokeWidth="1.2"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {inspectionMarker && (
              <g transform={`translate(${inspectionMarker.x} ${inspectionMarker.y})`} pointerEvents="none">
                <circle r="4.5" fill="#7f1d1d" fillOpacity="0.78" stroke="#fff7ed" strokeWidth="0.9" />
                <circle r="1.1" fill="#fff7ed" />
                <text x="6.5" y="1.4" fill="#fff" fontSize="3.3" fontWeight="700">
                  INSPECT FIRST
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-secondary/20 p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-base" role="img" aria-label="legend">🔎</span>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Inspection Priority
          </h3>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-lg border border-border bg-card/70 px-3 py-2">
            <span className="font-medium text-foreground">🔴 High Priority</span>
            <span className="text-muted-foreground">Earlier inspection</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-card/70 px-3 py-2">
            <span className="font-medium text-foreground">🟠 Medium Priority</span>
            <span className="text-muted-foreground">Inspect soon</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-card/70 px-3 py-2">
            <span className="font-medium text-foreground">🟡 Monitor</span>
            <span className="text-muted-foreground">Watch closely</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-card/70 px-3 py-2">
            <span className="font-medium text-foreground">🟢 Lower Priority</span>
            <span className="text-muted-foreground">No immediate priority</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-secondary/20 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-base" role="img" aria-label="wind">🌬️</span>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Wind Context
            </h3>
          </div>
          <p className="text-sm text-foreground">Wind direction: <span className="font-semibold">{windDemo}</span></p>
          <p className="mt-2 text-xs text-muted-foreground">Demo preview • Simulated preview</p>
          <p className="mt-2 text-sm text-muted-foreground">
            May influence movement of airborne spores under suitable conditions.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-secondary/20 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-base" role="img" aria-label="weather">🌦️</span>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Weather Context
            </h3>
          </div>
          <p className="text-sm text-foreground">Temperature: 24°C</p>
          <p className="text-sm text-foreground">Humidity: 82%</p>
          <p className="text-sm text-foreground">Condition: Partly cloudy</p>
          <p className="mt-2 text-xs text-muted-foreground">Demo preview • Simulated weather context</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-secondary/20 p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-base" role="img" aria-label="inspection priority">🔎</span>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Where to Inspect First
          </h3>
        </div>

        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>1. High-priority zones in the field preview.</li>
          <li>2. Areas showing stronger simulated stress signals.</li>
          <li>3. Areas potentially exposed to favorable environmental conditions.</li>
        </ol>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4">
        <div className="flex items-center gap-2">
          <span className="text-base" role="img" aria-label="recommended action">🌱</span>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
            Recommended Action
          </h3>
        </div>
        <p className="mt-2 text-sm text-foreground">
          Inspect the highlighted high-priority areas first. If symptoms are found, scan affected leaves with PlantGuard AI for individual diagnosis.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-secondary/20 p-4 text-xs text-muted-foreground">
        Important: Field-level areas shown here are an illustrative inspection-priority preview. They do not confirm disease presence. Final field analysis will use real satellite, vegetation, weather and wind data.
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onAdjustBoundary}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          🔄 Adjust Field Boundary
        </button>
        <button
          type="button"
          onClick={onScanAnotherLeaf}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-secondary"
        >
          📷 Scan Another Leaf
        </button>
      </div>
    </div>
  )
}

function buildGeoJsonPolygon(points: Point[], centerLongitude: number, centerLatitude: number, mode: BoundaryMode): GeoPoint[] {
  if (points.length === 0) return []

  if (mode === 'rectangle' && points.length >= 2) {
    const [first, second] = points
    const x1 = Math.min(first.x, second.x)
    const x2 = Math.max(first.x, second.x)
    const y1 = Math.min(first.y, second.y)
    const y2 = Math.max(first.y, second.y)

    const corners = [
      { x: x1, y: y1 },
      { x: x2, y: y1 },
      { x: x2, y: y2 },
      { x: x1, y: y2 },
      { x: x1, y: y1 },
    ]

    return corners.map((corner) => [
      Number((centerLongitude + (corner.x - 50) / 50 * 0.02).toFixed(6)),
      Number((centerLatitude + (corner.y - 50) / 50 * 0.02).toFixed(6)),
    ])
  }

  if (points.length < 3) return []

  return points.map((point) => [
    Number((centerLongitude + (point.x - 50) / 50 * 0.02).toFixed(6)),
    Number((centerLatitude + (point.y - 50) / 50 * 0.02).toFixed(6)),
  ])
}
