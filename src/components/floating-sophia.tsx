'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, QrCode, MessageSquare, X, Send, Bot, User, ChevronRight } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useUnreadCount } from '@/hooks/use-unread-count'
import { useSophia } from '@/hooks/use-sophia'

// Map routes to readable names
const PAGE_NAMES: Record<string, string> = {
  '/dashboard': 'El Punto Cero',
  '/dashboard/operaciones': 'Matriz de Ritmos',
  '/dashboard/reportes': 'Jardín de Datos',
  '/dashboard/finanzas': 'Fondo de Paz',
  '/dashboard/sophia': 'Conciencia Sophia',
  '/dashboard/director': 'Director Board',
  '/dashboard/configuracion': 'El Templo',
  '/dashboard/notificaciones': 'Notificaciones',
}

export const FloatingSophia = ({ onOpenMessaging }: { onOpenMessaging?: () => void }) => {
    const router = useRouter()
    const pathname = usePathname()
    const unreadCount = useUnreadCount()
    const [isPanelOpen, setIsPanelOpen] = useState(false)
    const [inputValue, setInputValue] = useState('')
    const chatRef = useRef<HTMLDivElement>(null)

    const { messages, sendMessage, isTyping } = useSophia()

    const currentPage = PAGE_NAMES[pathname] || pathname.split('/').pop() || 'Dashboard'

    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight
        }
    }, [messages, isTyping, isPanelOpen])

    const handleSend = () => {
        const trimmed = inputValue.trim()
        if (!trimmed) return
        // Prepend page context to first message of session
        const contextPrefix = `[Desde: ${currentPage}] `
        sendMessage(contextPrefix + trimmed)
        setInputValue('')
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <>
            {/* Sofia Panel — slide in from right */}
            <AnimatePresence>
                {isPanelOpen && (
                    <>
                        {/* Backdrop — click to close */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsPanelOpen(false)}
                            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[150]"
                        />

                        {/* Panel */}
                        <motion.div
                            initial={{ x: '100%', opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                            className="fixed right-0 top-0 bottom-0 w-[380px] z-[200] flex flex-col"
                            style={{
                                background: '#111318',
                                borderLeft: '1px solid #1e293b',
                                boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
                            }}
                        >
                            {/* Header */}
                            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Sparkles size={13} color="#818cf8" />
                                        </div>
                                        <div>
                                            <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>Conciencia Sophia</p>
                                            <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>Sistema Anthropos</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsPanelOpen(false)}
                                        style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', borderRadius: 6 }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                                {/* Current page context pill */}
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'rgba(0,200,212,0.08)', borderRadius: 999, border: '1px solid rgba(0,200,212,0.2)' }}>
                                    <span style={{ fontSize: 10, color: '#00C8D4', fontWeight: 600 }}>Contexto:</span>
                                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{currentPage}</span>
                                </div>
                            </div>

                            {/* Messages */}
                            <div
                                ref={chatRef}
                                style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}
                            >
                                {messages.slice(-20).map((msg: any) => (
                                    <div key={msg.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                                        <div style={{
                                            width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: msg.role === 'user' ? 'rgba(0,200,212,0.15)' : 'rgba(99,102,241,0.15)',
                                            border: `1px solid ${msg.role === 'user' ? 'rgba(0,200,212,0.3)' : 'rgba(99,102,241,0.3)'}`,
                                        }}>
                                            {msg.role === 'user'
                                                ? <User size={11} color="#00C8D4" />
                                                : <Bot size={11} color="#818cf8" />
                                            }
                                        </div>
                                        <div style={{
                                            maxWidth: '80%', padding: '8px 12px', borderRadius: msg.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                                            background: msg.role === 'user' ? 'rgba(0,200,212,0.1)' : '#0C0E12',
                                            border: `1px solid ${msg.role === 'user' ? 'rgba(0,200,212,0.2)' : '#1e293b'}`,
                                        }}>
                                            <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap' }}>
                                                {msg.content}
                                            </p>
                                        </div>
                                    </div>
                                ))}

                                {isTyping && (
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
                                            <Bot size={11} color="#818cf8" />
                                        </div>
                                        <div style={{ padding: '8px 14px', background: '#0C0E12', borderRadius: '4px 12px 12px 12px', border: '1px solid #1e293b' }}>
                                            <span style={{ fontSize: 18, color: '#64748b', letterSpacing: 2 }}>···</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Quick suggestions */}
                            <div style={{ padding: '8px 12px', borderTop: '1px solid #1e293b', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
                                {[
                                    '¿Qué bloquea los 150K SF?',
                                    '¿Estado financiero?',
                                    '¿Químicos bajos?',
                                ].map(q => (
                                    <button
                                        key={q}
                                        onClick={() => { sendMessage(q); }}
                                        style={{ flexShrink: 0, fontSize: 10, padding: '4px 10px', borderRadius: 999, background: '#0C0E12', border: '1px solid #1e293b', color: '#64748b', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>

                            {/* Input */}
                            <div style={{ padding: '12px 16px 20px', borderTop: '1px solid #1e293b', flexShrink: 0 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                                    <textarea
                                        value={inputValue}
                                        onChange={e => setInputValue(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Preguntale algo a Sofia..."
                                        rows={2}
                                        style={{
                                            flex: 1, background: '#0C0E12', border: '1px solid #1e293b', borderRadius: 10,
                                            padding: '10px 12px', color: '#e2e8f0', fontSize: 12, resize: 'none',
                                            outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                                        }}
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!inputValue.trim() || isTyping}
                                        style={{
                                            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                                            background: inputValue.trim() && !isTyping ? '#00C8D4' : '#1e293b',
                                            border: 'none', cursor: inputValue.trim() && !isTyping ? 'pointer' : 'not-allowed',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s',
                                        }}
                                    >
                                        <Send size={14} color={inputValue.trim() && !isTyping ? '#0C0E12' : '#334155'} />
                                    </button>
                                </div>
                                <p style={{ fontSize: 10, color: '#334155', margin: '6px 0 0', textAlign: 'center' }}>
                                    Enter para enviar · Shift+Enter para nueva línea
                                </p>
                            </div>

                            {/* Footer link to full Sophia page */}
                            <div style={{ padding: '0 16px 16px', flexShrink: 0 }}>
                                <a
                                    href="/dashboard/sophia"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11, color: '#475569', textDecoration: 'none' }}
                                >
                                    Abrir Conciencia Sophia completa <ChevronRight size={10} />
                                </a>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Floating buttons */}
            <div className="fixed bottom-[100px] right-4 lg:bottom-10 lg:right-10 flex flex-col items-center gap-4 z-[100]">
                {/* Messaging */}
                <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onOpenMessaging ? onOpenMessaging() : router.push('/dashboard?chat=true')}
                    className="relative w-12 h-12 bg-[var(--card)] hover:bg-[var(--secondary)] rounded-full flex items-center justify-center text-[var(--foreground)] shadow-lg shadow-black/5 ring-1 ring-[var(--border)] backdrop-blur-md group transition-all"
                >
                    <MessageSquare size={20} className="relative z-10" />
                    <AnimatePresence>
                        {unreadCount > 0 && (
                            <motion.div
                                key="badge"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[11px] font-black rounded-full flex items-center justify-center shadow-md shadow-red-500/40 border-2 border-[var(--background)] leading-none z-20"
                            >
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div className="absolute right-14 top-1/2 -translate-y-1/2 bg-[var(--card)] text-[var(--foreground)] px-4 py-2 rounded-[16px] text-[11px] font-semibold shadow-xl border border-[var(--border)] opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap">
                        Mensajería Directa
                    </div>
                </motion.button>

                {/* QR Scan */}
                <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push('/dashboard/operaciones?scan=true')}
                    className="w-12 h-12 bg-[var(--card)] hover:bg-[var(--secondary)] rounded-full flex items-center justify-center text-[var(--foreground)] shadow-lg shadow-black/5 ring-1 ring-[var(--border)] backdrop-blur-md group transition-all"
                >
                    <QrCode size={20} className="relative z-10" />
                    <div className="absolute right-14 top-1/2 -translate-y-1/2 bg-[var(--card)] text-[var(--foreground)] px-4 py-2 rounded-[16px] text-[11px] font-semibold shadow-xl border border-[var(--border)] opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap">
                        Escanear Lote
                    </div>
                </motion.button>

                {/* Sofia — opens inline panel */}
                <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsPanelOpen(p => !p)}
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer ring-1 backdrop-blur-md group transition-colors"
                    style={{
                        background: isPanelOpen ? '#6366f1' : 'rgba(99,102,241,0.85)',
                        boxShadow: isPanelOpen ? '0 0 20px rgba(99,102,241,0.5)' : '0 4px 20px rgba(99,102,241,0.2)',
                        
                    }}
                >
                    <Sparkles size={20} className="relative z-10" />
                    <div className="absolute right-14 top-1/2 -translate-y-1/2 bg-[var(--card)] text-[var(--foreground)] px-4 py-2 rounded-[16px] text-[11px] font-semibold shadow-xl border border-[var(--border)] opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap">
                        {isPanelOpen ? 'Cerrar Sofia' : 'Hablar con Sofia'}
                    </div>
                </motion.button>
            </div>
        </>
    )
}
