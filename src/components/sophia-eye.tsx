'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QrCode, X, Zap, Shield, Info, Camera, Scan, Activity, CheckCircle2 } from 'lucide-react'
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
                    video: { facingMode: 'environment' }
                })
                streamRef.current = stream
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

    useEffect(() => {
        if (isScanning && scanProgress < 95) {
            const timer = setTimeout(() => setScanProgress(prev => prev + 1), 100)
            return () => clearTimeout(timer)
        }
    }, [isScanning, scanProgress])

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--background)]/80 backdrop-blur-md p-4 sm:p-6"
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        className="relative w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-[32px] p-6 shadow-2xl flex flex-col items-center gap-6"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                    <Scan size={20} />
                                </div>
                                <h2 className="text-xl font-semibold text-[var(--foreground)] tracking-tight">Escanear Lote</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]/80 transition-all border border-[var(--border)] shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scanner Viewport */}
                        <div className="relative w-full aspect-square rounded-[24px] overflow-hidden bg-black shadow-inner border border-black/10">
                            {hasCamera ? (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[var(--secondary)]/50 p-6 text-center">
                                    <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500/50 animate-pulse">
                                        <Camera size={32} />
                                    </div>
                                    <p className="text-sm font-medium text-[var(--muted-foreground)]">
                                        Cámara no detectada. Usa este botón para simular un escaneo durante desarrollo:
                                    </p>
                                    <Button onClick={() => onScan(`TEST-BATCH-${Date.now().toString().slice(-4)}`)} size="sm" variant="secondary" className="mt-2 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">
                                        Simular Escaneo
                                    </Button>
                                </div>
                            )}

                            {/* Scanning overlay */}
                            <div className="absolute inset-0 z-10 pointer-events-none">
                                <div className="absolute inset-8 border-2 border-dashed border-white/30 rounded-3xl" />
                                {isScanning && scanProgress === 0 && (
                                    <motion.div
                                        animate={{ top: ['10%', '90%', '10%'] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                                        className="absolute left-8 right-8 h-0.5 bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.8)]"
                                    />
                                )}
                            </div>

                            {/* Progress bar overlay when QR is found */}
                            <AnimatePresence>
                                {scanProgress > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-blue-600/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-4"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-xl">
                                            <CheckCircle2 size={32} />
                                        </div>
                                        <p className="text-white font-semibold text-lg">Lote Identificado</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Canvas oculto para procesamiento de jsQR */}
                            <canvas ref={canvasRef} className="hidden" />
                        </div>

                        {/* Instructions */}
                        <div className="text-center w-full">
                            <p className="text-[14px] text-[var(--muted-foreground)] font-medium leading-relaxed">
                                Apunta la cámara hacia el código QR del lote para ver sus detalles o actualizar su estado en el proceso.
                            </p>
                        </div>

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
