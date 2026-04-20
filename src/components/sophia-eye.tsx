'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QrCode, X, Zap, Shield, Info, Camera, Scan, Activity, CheckCircle2, Flare, Lightbulb } from 'lucide-react'
import { Button } from './ui-library'
import { cn } from '@/lib/utils'

import jsQR from 'jsqr'

interface SophiaEyeProps {
    isOpen: boolean
    onClose: () => void
    onScan: (data: string) => void
}

export const SophiaEye = ({ isOpen, onClose, onScan }: SophiaEyeProps) => {
    const [isScanning, setIsScanning] = useState(false)
    const [scanProgress, setScanProgress] = useState(0)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const [hasCamera, setHasCamera] = useState(false)
    const [torchSupported, setTorchSupported] = useState(false)
    const [isTorchOn, setIsTorchOn] = useState(false)

    useEffect(() => {
        let animationFrameId: number

        async function startCamera() {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    console.error("Cámara no soportada en este entorno.")
                    setHasCamera(false)
                    return
                }
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        facingMode: 'environment',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                })
                streamRef.current = stream
                
                // Check for torch support
                const track = stream.getVideoTracks()[0];
                if (track) {
                    const capabilities = track.getCapabilities() as any;
                    setTorchSupported(!!capabilities.torch);
                }

                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    setHasCamera(true)
                }
            } catch (err) {
                console.error("Acceso a cámara denegado o no disponible:", err)
                setHasCamera(false)
            }
        }

        const scan = () => {
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                const video = videoRef.current
                const canvas = canvasRef.current
                if (canvas) {
                    const context = canvas.getContext('2d', { willReadFrequently: true })
                    if (context) {
                        canvas.height = video.videoHeight
                        canvas.width = video.videoWidth
                        context.drawImage(video, 0, 0, canvas.width, canvas.height)
                        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
                        const code = jsQR(imageData.data, imageData.width, imageData.height, {
                            inversionAttempts: "dontInvert",
                        })

                        if (code && isScanning) {
                            // HAPTIC FEEDBACK: Vibrar si está soportado
                            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                                navigator.vibrate([10, 30, 10]);
                            }

                            setScanProgress(100)
                            setIsScanning(false)
                            setTimeout(() => {
                                onScan(code.data)
                                setScanProgress(0)
                            }, 500)
                        }
                    }
                }
            }
            if (isOpen && isScanning) {
                animationFrameId = requestAnimationFrame(scan)
            }
        }

        if (isOpen) {
            setIsScanning(true)
            setScanProgress(0)
            startCamera().then(() => {
                animationFrameId = requestAnimationFrame(scan)
            })
        } else {
            setIsScanning(false)
            setScanProgress(0)
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
                streamRef.current = null
            }
        }

        return () => {
            cancelAnimationFrame(animationFrameId)
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
                streamRef.current = null
            }
        }
    }, [isOpen, isScanning, onScan])

    const toggleTorch = async () => {
        if (!streamRef.current) return;
        const track = streamRef.current.getVideoTracks()[0];
        if (track) {
            try {
                await track.applyConstraints({
                    advanced: [{ torch: !isTorchOn } as any]
                });
                setIsTorchOn(!isTorchOn);
            } catch (err) {
                console.error("Error toggling torch:", err);
            }
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 sm:p-6"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-md bg-[var(--card)]/90 border border-white/20 rounded-[40px] p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] flex flex-col items-center gap-8 ring-1 ring-white/10"
                    >
                        {/* Header Premium */}
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-500 flex items-center justify-center ring-1 ring-blue-500/20">
                                    <Scan size={24} className="animate-pulse" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-[var(--foreground)] tracking-tight">Ojo de Sophia</h2>
                                    <p className="text-[11px] font-bold text-blue-500 uppercase tracking-widest opacity-80">Sync Vision v2.4</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[var(--secondary)]/50 text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/10 transition-all border border-[var(--border)] shadow-sm group"
                            >
                                <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>

                        {/* Scanner Viewport con Glassmorphism */}
                        <div className="relative w-full aspect-square rounded-[32px] overflow-hidden bg-black shadow-2xl border-4 border-white/5 group-hover:border-white/10 transition-colors">
                            {hasCamera ? (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="absolute inset-0 w-full h-full object-cover grayscale-[0.2] contrast-[1.1]"
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[var(--secondary)]/50 p-6 text-center">
                                    <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500/50 animate-pulse">
                                        <Camera size={40} />
                                    </div>
                                    <p className="text-sm font-semibold text-[var(--muted-foreground)] max-w-[200px]">
                                        Cámara no detectada o permisos denegados.
                                    </p>
                                    <Button onClick={() => onScan(`TEST-BATCH-${Date.now().toString().slice(-4)}`)} size="sm" variant="secondary" className="mt-4 bg-blue-500/10 text-blue-600 hover:bg-blue-600 hover:text-white transition-all rounded-xl px-6">
                                        Simular Escaneo
                                    </Button>
                                </div>
                            )}

                            {/* Scanning overlay de alta gama */}
                            <div className="absolute inset-0 z-10 pointer-events-none">
                                {/* Corners */}
                                <div className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-white/60 rounded-tl-xl" />
                                <div className="absolute top-8 right-8 w-8 h-8 border-t-2 border-r-2 border-white/60 rounded-tr-xl" />
                                <div className="absolute bottom-8 left-8 w-8 h-8 border-b-2 border-l-2 border-white/60 rounded-bl-xl" />
                                <div className="absolute bottom-8 right-8 w-8 h-8 border-b-2 border-r-2 border-white/60 rounded-br-xl" />
                                
                                {isScanning && scanProgress === 0 && (
                                    <>
                                        <motion.div
                                            animate={{ top: ['15%', '85%', '15%'] }}
                                            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                                            className="absolute left-10 right-10 h-0.5 bg-blue-400 shadow-[0_0_20px_rgba(96,165,250,1)] z-20"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent animate-pulse" />
                                    </>
                                )}
                            </div>

                            {/* Flashlight Toggle */}
                            {hasCamera && torchSupported && (
                                <button
                                    onClick={toggleTorch}
                                    className={cn(
                                        "absolute bottom-6 right-6 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-all border shadow-lg backdrop-blur-md",
                                        isTorchOn 
                                            ? "bg-yellow-400 text-black border-yellow-500" 
                                            : "bg-black/40 text-white border-white/20 hover:bg-black/60"
                                    )}
                                >
                                    <Zap size={20} fill={isTorchOn ? "currentColor" : "none"} />
                                </button>
                            )}

                            {/* Success Overlay con Glassmorphism */}
                            <AnimatePresence>
                                {scanProgress > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                                        animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-green-500/40 z-40 flex flex-col items-center justify-center gap-6"
                                    >
                                        <motion.div 
                                            initial={{ scale: 0.5, rotate: -20 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-green-600 shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
                                        >
                                            <CheckCircle2 size={48} strokeWidth={2.5} />
                                        </motion.div>
                                        <div className="text-center">
                                            <p className="text-white font-black text-2xl tracking-tighter uppercase drop-shadow-md">Lote Identificado</p>
                                            <p className="text-white/80 font-medium text-sm">Sincronizando con Supabase...</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Status Bar */}
                        <div className="flex items-center gap-3 w-full bg-[var(--secondary)]/30 p-4 rounded-2xl border border-[var(--border)]">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                            <p className="text-[13px] text-[var(--foreground)] font-semibold tracking-tight">
                                {isScanning ? "Escaneando en tiempo real..." : "Procesando datos..."}
                            </p>
                            <div className="ml-auto">
                                <Activity size={16} className="text-blue-500 opacity-50" />
                            </div>
                        </div>

                        {/* Help Text */}
                        <p className="text-[13px] text-[var(--muted-foreground)] font-medium text-center leading-relaxed px-4">
                            Enfoca el código QR de la bandeja. El sistema detectará automáticamente el lote para su actualización física.
                        </p>

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
