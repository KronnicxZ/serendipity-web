'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QrCode, X, Zap, Shield, Info, Camera, Scan, Activity, CheckCircle2, Flare, Lightbulb, Box, RefreshCw } from 'lucide-react'
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
    const [lastScanTime, setLastScanTime] = useState<number | null>(null)

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
                
                // Verificar soporte de linterna
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
                            // FEEDBACK HÁPTICO: Vibración refinada
                            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                                navigator.vibrate([20, 50, 20]);
                            }

                            setScanProgress(100)
                            setIsScanning(false)
                            setLastScanTime(Date.now())
                            
                            setTimeout(() => {
                                onScan(code.data)
                                setScanProgress(0)
                                setLastScanTime(null)
                            }, 1200) // Delay más cinemático para mostrar el éxito
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
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 md:p-10"
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 50, rotateX: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-lg bg-[#0a0a0c] border border-white/10 rounded-[48px] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] flex flex-col items-center ring-1 ring-white/5"
                    >
                        {/* Decoración Top Indutrial */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
                        
                        {/* Header de Alta Resolución */}
                        <div className="flex items-center justify-between w-full p-8 pb-4">
                            <div className="flex items-center gap-5">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse" />
                                    <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/30">
                                        <Scan size={28} className={isScanning ? "animate-spin-slow" : ""} />
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight leading-none">Sophia Vision</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Neural Scan Node: Binh Duong</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all border border-white/10 group"
                            >
                                <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>

                        {/* Scanner Viewport */}
                        <div className="relative w-full p-8 pt-4 flex flex-col items-center">
                            <div className="relative w-full aspect-square rounded-[40px] overflow-hidden bg-black shadow-inner border border-white/5 group">
                                {hasCamera ? (
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        className="absolute inset-0 w-full h-full object-cover contrast-[1.2] brightness-[1.1]"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-[#111114] p-10 text-center">
                                        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center text-white/20 border border-white/10">
                                            <Camera size={48} />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-lg font-bold text-white tracking-tight">Ojo Ciego</p>
                                            <p className="text-sm text-white/40 max-w-[240px]">La cámara no responde. Puede ser por falta de permisos o hardware inexistente.</p>
                                        </div>
                                        <Button 
                                            onClick={() => onScan(`TEST-BATCH-${Math.floor(1000 + Math.random() * 9000)}`)} 
                                            className="bg-blue-600 hover:bg-blue-500 text-white rounded-2xl px-10 py-6 h-auto font-bold shadow-xl shadow-blue-600/20"
                                        >
                                            Simular Escaneo IA
                                        </Button>
                                    </div>
                                )}

                                {/* HUD de Escaneo Superior */}
                                <div className="absolute inset-0 z-10 pointer-events-none p-10">
                                    {/* Las 4 esquinas inteligentes */}
                                    <div className="absolute top-10 left-10 w-16 h-16 border-t-4 border-l-4 border-blue-500/80 rounded-tl-[30%]" />
                                    <div className="absolute top-10 right-10 w-16 h-16 border-t-4 border-r-4 border-white/20 rounded-tr-[30%]" />
                                    <div className="absolute bottom-10 left-10 w-16 h-16 border-b-4 border-l-4 border-white/20 rounded-bl-[30%]" />
                                    <div className="absolute bottom-10 right-10 w-16 h-16 border-b-4 border-r-4 border-blue-500/80 rounded-br-[30%]" />
                                    
                                    {/* Laser Animado Refinado */}
                                    {isScanning && (
                                        <>
                                            <motion.div
                                                animate={{ 
                                                    top: ['10%', '90%', '10%'],
                                                    opacity: [0.4, 1, 0.4]
                                                }}
                                                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                                                className="absolute left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent z-20"
                                            >
                                                <div className="absolute inset-0 bg-blue-500 blur-[6px]" />
                                            </motion.div>
                                            
                                            {/* Grid cibernético de fondo suave */}
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,123,255,0.05)_100%)]" />
                                        </>
                                    )}
                                </div>

                                {/* Flashlight Toggle (Botón flotante premium) */}
                                {hasCamera && torchSupported && (
                                    <button
                                        onClick={toggleTorch}
                                        className={cn(
                                            "absolute top-6 left-6 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-all backdrop-blur-xl border border-white/10",
                                            isTorchOn 
                                                ? "bg-yellow-400 text-black border-yellow-500 scale-110 shadow-lg shadow-yellow-500/40" 
                                                : "bg-white/5 text-white/50 hover:bg-white/10"
                                        )}
                                    >
                                        <Zap size={20} fill={isTorchOn ? "currentColor" : "none"} />
                                    </button>
                                )}

                                {/* Success cinematic overlay */}
                                <AnimatePresence>
                                    {scanProgress === 100 && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 1.2 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 1.1 }}
                                            className="absolute inset-0 z-40 flex items-center justify-center"
                                        >
                                            <div className="absolute inset-0 bg-blue-600/60 backdrop-blur-md" />
                                            <motion.div
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                className="relative flex flex-col items-center gap-6"
                                            >
                                                <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-2xl">
                                                    <CheckCircle2 size={72} strokeWidth={3} className="animate-bounce" />
                                                </div>
                                                <div className="text-center">
                                                    <h3 className="text-3xl font-black text-white tracking-widest uppercase">¡LOTE CAPTURADO!</h3>
                                                    <p className="text-white/70 font-mono text-sm mt-2">Sincronización Molecular en progreso...</p>
                                                </div>
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Status Info Footer */}
                            <div className="mt-8 w-full space-y-4">
                                <div className="flex items-center justify-between bg-white/5 p-5 rounded-3xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                            <Activity size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest leading-none">Sensor Status</p>
                                            <p className="text-sm text-white font-bold tracking-tight">Escaneando...</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 pr-2">
                                        <Box size={16} className="text-white/20" />
                                        <RefreshCw size={16} className="text-white/20 animate-spin-slow" />
                                    </div>
                                </div>
                                
                                <p className="text-[12px] text-white/30 font-medium text-center leading-normal px-10">
                                    Apunta la cámara al código QR ubicado en el lateral de la bandeja o en la orden de producción.
                                </p>
                            </div>
                        </div>

                        {/* Borde inferior estético */}
                        <div className="w-full h-2 bg-gradient-to-r from-blue-600/0 via-blue-600/40 to-blue-600/0" />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
