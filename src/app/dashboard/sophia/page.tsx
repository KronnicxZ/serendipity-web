'use client'

import { Card, Badge, Button, Skeleton, Input } from '@/components/ui-library'
import {
    Sparkles,
    AlertTriangle,
    Info,
    ShieldCheck,
    Zap,
    Activity,
    Send,
    User,
    Bot,
    RefreshCcw,
    Lock,
    Upload,
    FileText,
    Trash2,
    Database,
    Search,
    BrainCircuit,
    Shield
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useSophia } from '@/hooks/use-sophia'
import { useTranslation } from '@/context/language-context'
import { useState, useRef, useEffect, useMemo } from 'react'
import { SystemSymmetryPanel } from '@/components/system-symmetry-panel'
import { useNotifications } from '@/context/notification-context'

export default function SophiaPage() {
    const { t, language } = useTranslation()
    const { addNotification } = useNotifications()
    const {
        alerts,
        sophiaStatus,
        messages,
        sendMessage,
        generateDailyReport,
        isTyping,
        vaultDocs,
        isUploading,
        uploadToVault,
        deleteFromVault,
        practicalAgents,
        hermeticPrinciples
    } = useSophia()

    const [inputValue, setInputValue] = useState('')
    const [activeTab, setActiveTab] = useState<'CHAT' | 'VAULT'>('CHAT')
    const chatContainerRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    if (!practicalAgents || !hermeticPrinciples) return null

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
    }

    useEffect(() => {
        window.scrollTo(0, 0)
        scrollToBottom()
    }, [])

    useEffect(() => {
        if (activeTab === 'CHAT') scrollToBottom()
    }, [messages, isTyping, activeTab])

    const handleSend = () => {
        if (!inputValue.trim()) return
        sendMessage(inputValue)
        setInputValue('')
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            const doc = await uploadToVault(file)
            addNotification({
                type: 'SUCCESS',
                title: t('sophia.vault.saved'),
                message: `${doc.name} ${t('sophia.vault.encryptionActive')}`
            })
        } catch (error) {
            addNotification({
                type: 'ERROR',
                title: t('sophia.vault.uploadError'),
                message: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }

    return (
        <div className="space-y-12 pb-20 overflow-x-hidden">
            {/* Header Section - Symmetrical layout */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                        <Badge variant="default">{t('sophia.status')}</Badge>
                        <Badge variant="warning">
                            <BrainCircuit size={12} className="animate-pulse" />
                            {t('sophia.reasoning')}
                        </Badge>
                    </div>
                    <h1 className="text-3xl lg:text-[36px] font-semibold tracking-tight text-[var(--foreground)] leading-tight">
                        {t('sophia.title')}
                    </h1>
                    <p className="text-[var(--muted-foreground)] text-lg font-medium transition-colors max-w-2xl">
                        {t('sophia.subtitle')}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                    <Card className="!bg-[var(--card)] !py-3 !px-6 border-none ring-1 ring-[var(--border)] shadow-sm flex items-center justify-center gap-4 w-full lg:w-auto">
                        <div className="flex items-center gap-2 border-r border-[var(--border)] pr-4">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-[13px] font-semibold text-blue-500">{t('sophia.activeBrain')}</span>
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setActiveTab('CHAT')}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all",
                                    activeTab === 'CHAT' ? "bg-blue-500 text-white shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                )}
                            >
                                {t('sophia.dialogue')}
                            </button>
                            <button
                                onClick={() => setActiveTab('VAULT')}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all",
                                    activeTab === 'VAULT' ? "bg-blue-500 text-white shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                )}
                            >
                                {t('sophia.vault.title')}
                            </button>
                        </div>
                    </Card>
                    <Button
                        onClick={generateDailyReport}
                        variant="secondary"
                        className="h-12 !rounded-[20px] px-6 font-bold tracking-widest flex items-center gap-2 text-[11px] w-full sm:w-auto shadow-sm"
                    >
                        <Zap size={16} />
                        {t('sophia.sync')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-12 xl:col-span-8 space-y-8">
                    <AnimatePresence mode="wait">
                        {activeTab === 'CHAT' ? (
                            <motion.div
                                key="chat-interface"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Card className="p-0 border-none ring-1 ring-white/10 shadow-2xl overflow-hidden flex flex-col h-[650px] bg-[var(--card)]/50 backdrop-blur-md">
                                    <div className="p-6 border-b border-white/5 bg-[var(--secondary)]/30 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                                <Bot size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-[var(--foreground)] text-sm tracking-tight">{t('sophia.anthroposAICore')}</h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{t('sophia.inSyncWithVault')}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="!rounded-2xl opacity-50 hover:opacity-100">
                                            <Search size={20} />
                                        </Button>
                                    </div>

                                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                        {messages.map((msg) => (
                                            <motion.div
                                                key={msg.id}
                                                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className={cn(
                                                    "flex gap-5 max-w-[90%]",
                                                    msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-10 h-10 rounded-[14px] shrink-0 flex items-center justify-center shadow-lg border border-white/10",
                                                    msg.role === 'user' ? "bg-[var(--foreground)] text-[var(--background)]" : "bg-blue-500 text-white"
                                                )}>
                                                    {msg.role === 'user' ? <User size={18} /> : <Sparkles size={18} />}
                                                </div>
                                                <div className={cn(
                                                    "p-6 rounded-[24px] text-[15px] font-medium leading-relaxed whitespace-pre-wrap shadow-sm",
                                                    msg.role === 'user'
                                                        ? "bg-[var(--secondary)] text-[var(--foreground)] rounded-tr-none border border-white/5"
                                                        : "bg-[var(--foreground)]/[0.03] text-[var(--foreground)] border border-white/10 rounded-tl-none"
                                                )}>
                                                    {msg.content.split(/(\*\*.*?\*\*)/).map((part, i) =>
                                                        part.startsWith('**') && part.endsWith('**')
                                                            ? <strong key={i} className="text-blue-500 font-black">{part.slice(2, -2)}</strong>
                                                            : part
                                                    )}
                                                    {msg.agentSource && (
                                                        <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-3">
                                                            <div className="w-6 h-6 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-500">
                                                                <Database size={12} />
                                                            </div>
                                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--muted-foreground)]">{t('sophia.source')}: {msg.agentSource}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                        {isTyping && (
                                            <div className="flex gap-5 max-w-[90%] mr-auto">
                                                <div className="w-10 h-10 rounded-[14px] shrink-0 flex items-center justify-center bg-amber-500 text-black animate-pulse">
                                                    <Sparkles size={18} />
                                                </div>
                                                <div className="p-6 rounded-[24px] bg-[var(--foreground)]/[0.03] border border-white/10 rounded-tl-none">
                                                    <div className="flex gap-1.5">
                                                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" />
                                                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                                                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-6 border-t border-white/5 bg-[var(--card)]">
                                        <div className="flex gap-4 items-center">
                                            <Input
                                                placeholder={t('sophia.placeholder')}
                                                className="h-14 !rounded-2xl bg-[var(--secondary)]/40 border-white/5 focus:ring-2 ring-blue-500/20 text-base"
                                                value={inputValue}
                                                onChange={(e) => setInputValue(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                            />
                                            <Button
                                                onClick={handleSend}
                                                disabled={!inputValue.trim() || isTyping}
                                                className="w-14 h-14 !rounded-2xl p-0 flex items-center justify-center bg-blue-600 hover:bg-blue-700 transition-all shrink-0 shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95"
                                            >
                                                <Send size={22} className="text-white" />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="vault-interface"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-8"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Card className="p-10 bg-[var(--secondary)]/40 border border-[var(--border)] flex flex-col items-center text-center gap-6 group hover:border-blue-500/30 transition-all cursor-pointer shadow-sm relative overflow-hidden" onClick={() => fileInputRef.current?.click()}>
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
                                        <div className="w-16 h-16 bg-[var(--card)] rounded-[24px] flex items-center justify-center shadow-lg border border-[var(--border)] group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-all relative z-10">
                                            <Upload size={32} />
                                        </div>
                                        <div className="relative z-10">
                                            <h4 className="font-bold text-[var(--foreground)] text-sm tracking-tight mb-1.5 transition-colors group-hover:text-blue-600">{t('sophia.vault.uploadDoc')}</h4>
                                            <p className="text-[10px] text-[var(--muted-foreground)] font-black uppercase tracking-widest opacity-80">PDF, TXT, JSON (Max 5MB)</p>
                                        </div>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            onChange={handleFileUpload}
                                            accept=".pdf,.txt,.json,.docx"
                                        />
                                    </Card>

                                    <Card className="p-10 bg-[var(--secondary)]/40 border border-[var(--border)] flex flex-col items-center text-center gap-6 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12" />
                                        <div className="w-16 h-16 bg-[var(--card)] rounded-[24px] flex items-center justify-center text-blue-500 shadow-lg border border-[var(--border)] relative z-10">
                                            <ShieldCheck size={32} />
                                        </div>
                                        <div className="relative z-10">
                                            <h4 className="font-bold text-[var(--foreground)] text-sm tracking-tight mb-1.5">{t('sophia.vault.encryption')}</h4>
                                            <p className="text-[10px] text-[var(--muted-foreground)] font-black uppercase tracking-widest opacity-80">{t('sophia.vault.encryptionActive')}</p>
                                        </div>
                                    </Card>

                                    <Card className="p-10 bg-[var(--secondary)]/40 border border-[var(--border)] flex flex-col items-center text-center gap-6 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -mr-12 -mt-12" />
                                        <div className="w-16 h-16 bg-[var(--card)] rounded-[24px] flex items-center justify-center text-red-500 shadow-lg border border-[var(--border)] relative z-10">
                                            <Lock size={32} />
                                        </div>
                                        <div className="relative z-10">
                                            <h4 className="font-bold text-[var(--foreground)] text-sm tracking-tight mb-1.5">{t('sophia.vault.restrictedAccess')}</h4>
                                            <p className="text-[10px] text-[var(--muted-foreground)] font-black uppercase tracking-widest opacity-80">{t('sophia.vault.adminOnly')}</p>
                                        </div>
                                    </Card>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                        <h3 className="font-bold text-[var(--foreground)] text-lg tracking-tight flex items-center gap-3">
                                            <FileText size={20} className="text-blue-500" />
                                            {t('sophia.vault.docs')}
                                        </h3>
                                        <Badge variant="default">{vaultDocs.length} {t('sophia.vault.securedFiles')}</Badge>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        <AnimatePresence>
                                            {vaultDocs.length === 0 ? (
                                                <div className="p-20 text-center border-2 border-dashed border-white/5 rounded-[32px]">
                                                    <p className="text-[var(--muted-foreground)] font-bold italic">{t('sophia.vault.noInfo')}</p>
                                                </div>
                                            ) : (
                                                vaultDocs.map((doc) => (
                                                    <motion.div
                                                        key={doc.id}
                                                        layout
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: 20 }}
                                                    >
                                                        <Card className="p-5 border-none ring-1 ring-white/10 bg-[var(--card)]/30 backdrop-blur-sm flex items-center gap-6 group hover:ring-white/20 transition-all">
                                                            <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-all">
                                                                <FileText size={24} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-3">
                                                                    <p className="font-bold text-[foreground] uppercase tracking-wider">{doc.name}</p>
                                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 rounded-full border border-blue-500/10">
                                                                        <Lock size={8} className="text-blue-500" />
                                                                        <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{t('sophia.vault.encrypted')}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-4 mt-1 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest">
                                                                    <span>{(doc.size / 1024).toFixed(1)} KB</span>
                                                                    <span>•</span>
                                                                    <span>{t('sophia.vault.pinned')} {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="!rounded-xl text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-all"
                                                                onClick={() => deleteFromVault(doc.id)}
                                                            >
                                                                <Trash2 size={18} />
                                                            </Button>
                                                        </Card>
                                                    </motion.div>
                                                ))
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Simetría Sagrada Panel - Full Width */}
                    <div className="pt-8">
                        <SystemSymmetryPanel
                            systemHealths={hermeticPrinciples.reduce((acc, p) => ({ ...acc, [p.id]: p.health }), {})}
                            overallHealth={82}
                            onActivate={() => {
                                generateDailyReport()
                                addNotification({
                                    type: 'INFO',
                                    title: t('sophia.syncInitiated'),
                                    message: t('sophia.realigning')
                                })
                            }}
                        />
                    </div>
                </div>

                {/* Right Column Area */}
                <div className="lg:col-span-12 xl:col-span-4 space-y-8">
                    {/* Activity Feed */}
                    <Card className="p-8 border-none ring-1 ring-white/10 shadow-sm bg-[var(--card)]/30 backdrop-blur-md">
                        <div className="flex items-center gap-4 mb-8 pb-4 border-b border-white/5">
                            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
                                <Activity size={24} />
                            </div>
                            <h3 className="font-bold text-[var(--foreground)] text-sm tracking-tight">{t('sophia.criticalFindings')}</h3>
                        </div>
                        <div className="space-y-5">
                            {alerts.length === 0 ? (
                                <p className="text-xs text-[var(--muted-foreground)] font-bold text-center py-4">{t('sophia.noAnomalies')}</p>
                            ) : (
                                alerts.map((alert) => (
                                    <div key={alert.id} className="relative group">
                                        <div className={cn(
                                            "flex items-start gap-4 p-4 rounded-2xl transition-all border border-transparent",
                                            alert.type === 'CRITICAL' ? "bg-red-500/[0.03] border-red-500/10" : "bg-white/[0.02]"
                                        )}>
                                            <div className={cn(
                                                "p-2 rounded-lg mt-1",
                                                alert.type === 'CRITICAL' ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                                            )}>
                                                {alert.type === 'CRITICAL' ? <AlertTriangle size={16} /> : <Info size={16} />}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <p className="text-[9px] font-black text-[var(--muted-foreground)] uppercase tracking-widest">{alert.category} • {alert.type}</p>
                                                <p className="text-[13px] font-bold text-[var(--foreground)] leading-tight">{alert.message}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>

                    {/* Micro-Agents Grid */}
                    <Card className="p-8 border-none ring-1 ring-white/10 shadow-sm">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-blue-600 rounded-2xl text-white">
                                <Zap size={24} />
                            </div>
                            <h3 className="font-bold text-[var(--foreground)] text-sm tracking-tight">{t('sophia.activeNodes')}</h3>
                        </div>
                        <div className="space-y-6">
                            {practicalAgents.map((agent) => (
                                <div key={agent.id} className="group cursor-pointer">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-bold tracking-tight text-[var(--foreground)]">
                                            {(t as any)(`agents.${agent.id}.name`)}
                                        </h4>
                                        <div className={cn(
                                            "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em]",
                                            agent.status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-800 text-zinc-500"
                                        )}>
                                            {agent.status === 'ACTIVE' ? t('common.active') : t('common.idle')}
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-[var(--muted-foreground)] font-medium leading-relaxed mb-3">
                                        {(t as any)(`agents.${agent.id}.desc`)}
                                    </p>
                                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: agent.status === 'ACTIVE' ? '100%' : '0%' }}
                                            className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                            transition={{ duration: 1, repeat: agent.status === 'ACTIVE' ? Infinity : 0, repeatType: 'reverse' }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Harmony Status */}
                    <Card className="p-10 border-none bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-xl shadow-blue-500/20 overflow-hidden relative group">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                            className="absolute -top-10 -right-10 opacity-20 text-blue-200"
                        >
                            <BrainCircuit size={240} />
                        </motion.div>
                        <div className="relative z-10 space-y-6">
                            <h3 className="text-2xl font-bold tracking-tight text-white leading-none">{t('sophia.globalCoherence')}</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-6xl font-black tracking-tighter leading-none">88%</span>
                                <span className="text-xs font-black uppercase tracking-widest text-blue-200">
                                    {t('sophia.globalCoherenceLevel')}
                                </span>
                            </div>
                            {/* Resonance placeholder */}
                            <div className="mt-12 px-4">
                                <p className="text-[11px] font-bold text-blue-100 tracking-widest leading-relaxed">
                                    {t('sophia.resonanceActive')}
                                </p>
                            </div>
                            <button
                                className="w-full h-14 bg-white text-blue-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-2xl"
                                onClick={() => setActiveTab('VAULT')}
                            >
                                {t('sophia.vault.manage')}
                            </button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
