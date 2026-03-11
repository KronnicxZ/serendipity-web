'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import {
    Shield, Zap, BarChart3, Brain, ArrowRight,
    Activity, Users, Layers, Globe,
    Sparkles, CheckCircle2, Target, LineChart,
    FileText, Archive, Database, Fingerprint, Wifi
} from 'lucide-react'
import { Button } from '@/components/ui-library'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/context/language-context'
import { AuthControls } from '@/components/auth-controls'
// #9 — Banderas desde componente compartido
import { LANGUAGES as LANG_OPTIONS } from '@/components/flags'

/* ─── TRANSLATIONS ──────────────────────────────────────────────── */
const COPY = {
    es: {
        nav: ['Módulos', 'Sistema', 'Acceso'],
        enter: 'Entrar',
        heroTag: 'El núcleo',
        heroAccent: 'consciente',
        heroSub: 'de tu operación',
        heroDesc: 'Serendipity Anthropos es el sistema de gestión operativa y financiera diseñado para organizaciones que piensan diferente.',
        accessBtn: 'Acceder al sistema',
        signupBtn: 'Crear cuenta',
        copyright: 'Serendipity Bros © 2026 · Todos los derechos reservados',
        statLabels: ['Datos en tiempo real', 'Climas financieros adaptativos', 'Visión operativa completa', 'Lanzamiento inicial 2026'],
        modulesBadge: 'Módulos del sistema',
        modulesH2a: 'Todo lo que necesitas,',
        modulesH2b: 'integrado en un núcleo',
        modulesDesc: 'Cada pieza del sistema está diseñada para trabajar en conjunto, generando inteligencia colectiva.',
        climBadge: 'Sistema adaptativo',
        climH2: 'La UI que respira con tu negocio',
        climDesc: 'El Clima Financiero es un sistema dinámico único que adapta la interfaz, los colores y las alertas según el estado real de tu operación. Tres climas, tres realidades.',
        climates: [
            { name: 'SIEMBRA', desc: 'Crecimiento activo. El sistema en modo expansión óptima.' },
            { name: 'COSECHA', desc: 'Rendimiento máximo. Recolección de resultados positivos.' },
            { name: 'TORMENTA', desc: 'Alerta operativa. Foco en estabilización y contingencia.' },
        ],
        aiBadge: 'Inteligencia Artificial',
        aiH2a: 'Sophia,',
        aiH2b: 'tu agente operativo',
        aiDesc: 'Sophia es tu orquestadora central. Se comunica con sus micro-agentes para monitorear finanzas, operaciones y el Sagrario, entregándote reportes estratégicos en tiempo real.',
        aiFeats: ['Análisis del Sagrario (Memoria Histórica)', 'Orquestación de Micro-Agentes especializados', 'Generación de Reportes Ejecutivos en PDF', 'Recomendaciones basadas en principios herméticos'],
        aiBtn: 'Consultar a Sophia',
        accessBadge: 'Acceso y seguridad',
        accessH2a: 'Capas de acceso.',
        accessH2b: 'Control total.',
        accessDesc: 'Un sistema de roles pensado para organizaciones complejas con seguridad biométrica WebAuthn integrada.',
        roles: [
            { role: 'ADMIN', desc: 'Visibilidad total del sistema, configuración global y gestión de usuarios.' },
            { role: 'SUPERVISOR', desc: 'Monitoreo de equipos, aprobaciones y seguimiento operativo.' },
            { role: 'OPERATIVO', desc: 'Registro de actividades, lotes y comunicación con el equipo.' },
        ],
        ctaH2a: 'Listo para operar',
        ctaH2b: 'con inteligencia',
        ctaDesc: 'Accede al núcleo de Serendipity y transforma la forma en que gestionas tu organización.',
        ctaBtn: 'Acceder ahora',
        footerAccess: 'Acceder',
        footerReg: 'Registro',
        modules: [
            { title: 'Finanzas Inteligentes', desc: 'Control total de ingresos, gastos y liquidez con cálculos proyectados y estados de deuda.' },
            { title: 'Sophia — Macro-Agente', desc: 'Orquestación de micro-agentes que monitorean finanzas, operaciones y memoria histórica.' },
            { title: 'Sagrario Digital', desc: 'Tu base de conocimientos con búsqueda semántica y recuperación de documentos (RAG).' },
            { title: 'Biometría Avanzada', desc: 'Acceso seguro y rápido mediante huella dactilar o FaceID con tecnología WebAuthn.' },
            { title: 'Sincronización Offline', desc: 'Opera sin internet; tus cambios se guardan localmente y se sincronizan al volver la red.' },
            { title: 'Insumos & Trazabilidad', desc: 'Seguimiento exacto de lotes de producción, consumos y eficiencias por estación.' },
        ],
    },
    en: {
        nav: ['Modules', 'System', 'Access'],
        enter: 'Enter',
        heroTag: 'The',
        heroAccent: 'conscious',
        heroSub: 'core of your operation',
        heroDesc: 'Serendipity Anthropos is the operational and financial management system designed for organizations that think differently.',
        accessBtn: 'Access the system',
        signupBtn: 'Create account',
        copyright: 'Serendipity Bros © 2026 · All rights reserved',
        statLabels: ['Real-time data', 'Adaptive financial climates', 'Complete operational vision', 'Initial launch 2026'],
        modulesBadge: 'System modules',
        modulesH2a: 'Everything you need,',
        modulesH2b: 'integrated in one core',
        modulesDesc: 'Every piece of the system is designed to work together, generating collective intelligence.',
        climBadge: 'Adaptive system',
        climH2: 'The UI that breathes with your business',
        climDesc: 'The Financial Climate is a unique dynamic system that adapts the interface, colors and alerts according to the real state of your operation. Three climates, three realities.',
        climates: [
            { name: 'SIEMBRA', desc: 'Active growth. System in optimal expansion mode.' },
            { name: 'COSECHA', desc: 'Maximum performance. Harvesting positive results.' },
            { name: 'TORMENTA', desc: 'Operational alert. Focus on stabilization and contingency.' },
        ],
        aiBadge: 'Artificial Intelligence',
        aiH2a: 'Sophia,',
        aiH2b: 'your operational agent',
        aiDesc: 'Sophia is your central orchestrator. She communicates with her micro-agents to monitor finances, operations, and the Vault, delivering real-time strategic reports.',
        aiFeats: ['Vault Analysis (Historical Memory)', 'Orchestration of specialized Micro-Agents', 'Executive PDF Report Generation', 'Hermetic principle-based recommendations'],
        aiBtn: 'Consult Sophia',
        accessBadge: 'Access & security',
        accessH2a: 'Access layers.',
        accessH2b: 'Total control.',
        accessDesc: 'A role system designed for complex organizations with integrated WebAuthn biometric security.',
        roles: [
            { role: 'ADMIN', desc: 'Full system visibility, global configuration and user management.' },
            { role: 'SUPERVISOR', desc: 'Team monitoring, approvals and operational follow-up.' },
            { role: 'OPERATIVO', desc: 'Activity logging, batches and team communication.' },
        ],
        ctaH2a: 'Ready to operate',
        ctaH2b: 'with intelligence',
        ctaDesc: 'Access the Serendipity core and transform the way you manage your organization.',
        ctaBtn: 'Access now',
        footerAccess: 'Access',
        footerReg: 'Register',
        modules: [
            { title: 'Smart Finance', desc: 'Total control of income, expenses, and liquidity with projected calculations and debt status.' },
            { title: 'Sophia — Macro-Agent', desc: 'Orchestration of micro-agents that monitor finances, operations, and historical memory.' },
            { title: 'Digital Vault (Sagrario)', desc: 'Your knowledge base with semantic search and document retrieval (RAG).' },
            { title: 'Advanced Biometrics', desc: 'Secure and fast access via fingerprint or FaceID with WebAuthn technology.' },
            { title: 'Offline Synchronization', desc: 'Operate without internet; your changes are saved locally and synced when back online.' },
            { title: 'Inputs & Traceability', desc: 'Exact tracking of production batches, consumption, and efficiency per station.' },
        ],
    },
    vn: {
        nav: ['Mô-đun', 'Hệ thống', 'Truy cập'],
        enter: 'Vào hệ thống',
        heroTag: 'Lõi',
        heroAccent: 'thông minh',
        heroSub: 'của hoạt động của bạn',
        heroDesc: 'Serendipity Anthropos là hệ thống quản lý vận hành và tài chính được thiết kế cho các tổ chức có tư duy khác biệt.',
        accessBtn: 'Truy cập hệ thống',
        signupBtn: 'Tạo tài khoản',
        copyright: 'Serendipity Bros © 2026 · Bảo lưu mọi quyền',
        statLabels: ['Dữ liệu thời gian thực', 'Khí hậu tài chính thích ứng', 'Tầm nhìn vận hành 360°', 'Ra mắt ban đầu 2026'],
        modulesBadge: 'Mô-đun hệ thống',
        modulesH2a: 'Mọi thứ bạn cần,',
        modulesH2b: 'tích hợp trong một lõi',
        modulesDesc: 'Mỗi phần của hệ thống được thiết kế để hoạt động cùng nhau, tạo ra trí tuệ tập thể.',
        climBadge: 'Hệ thống thích ứng',
        climH2: 'Giao diện thở cùng doanh nghiệp của bạn',
        climDesc: 'Khí hậu Tài chính là một hệ thống động độc đáo thích ứng giao diện, màu sắc và cảnh báo theo trạng thái thực của hoạt động. Ba khí hậu, ba thực tế.',
        climates: [
            { name: 'SIEMBRA', desc: 'Tăng trưởng tích cực. Hệ thống ở chế độ mở rộng tối ưu.' },
            { name: 'COSECHA', desc: 'Hiệu suất tối đa. Thu hoạch kết quả tích cực.' },
            { name: 'TORMENTA', desc: 'Cảnh báo vận hành. Tập trung ổn định và dự phòng.' },
        ],
        aiBadge: 'Trí tuệ nhân tạo',
        aiH2a: 'Sophia,',
        aiH2b: 'đại lý vận hành của bạn',
        aiDesc: 'Sophia là người điều phối trung tâm của bạn. Cô ấy liên lạc với các đại lý vi mô để giám sát tài chính, vận hành và Kho lưu trữ.',
        aiFeats: ['Phân tích kho lưu trữ (Bộ nhớ lịch sử)', 'Điều phối các đại lý vi mô chuyên dụng', 'Tạo báo cáo PDF điều hành', 'Khuyến nghị dựa trên nguyên lý Hermetic'],
        aiBtn: 'Tham vấn Sophia',
        accessBadge: 'Truy cập & bảo mật',
        accessH2a: 'Các lớp truy cập.',
        accessH2b: 'Kiểm soát hoàn toàn.',
        accessDesc: 'Hệ thống vai trò cho các tổ chức phức tạp với bảo mật sinh trắc học WebAuthn.',
        roles: [
            { role: 'ADMIN', desc: 'Toàn quyền xem hệ thống, cấu hình toàn cầu và quản lý người dùng.' },
            { role: 'SUPERVISOR', desc: 'Giám sát nhóm, phê duyệt và theo dõi vận hành.' },
            { role: 'OPERATIVO', desc: 'Ghi nhật ký hoạt động, lô hàng và giao tiếp nhóm.' },
        ],
        ctaH2a: 'Sẵn sàng hoạt động',
        ctaH2b: 'với trí thông minh',
        ctaDesc: 'Truy cập lõi Serendipity và biến đổi cách bạn quản lý tổ chức.',
        ctaBtn: 'Truy cập ngay',
        footerAccess: 'Truy cập',
        footerReg: 'Đăng ký',
        modules: [
            { title: 'Tài chính thông minh', desc: 'Kiểm soát toàn diện thu nhập, chi phí và tính thanh khoản với tính toán dự kiến.' },
            { title: 'Sophia — Đại lý vĩ mô', desc: 'Điều phối các đại lý vi mô giám sát tài chính, vận hành và bộ nhớ lịch sử.' },
            { title: 'Kho lưu trữ kỹ thuật số', desc: 'Cơ sở kiến thức của bạn với tìm kiếm ngữ nghĩa và truy xuất tài liệu (RAG).' },
            { title: 'Sinh trắc học nâng cao', desc: 'Truy cập an toàn và nhanh chóng qua vân tay hoặc FaceID với công nghệ WebAuthn.' },
            { title: 'Đồng bộ hóa ngoại tuyến', desc: 'Hoạt động không cần internet; các thay đổi được lưu cục bộ và đồng bộ sau.' },
            { title: 'Đầu vào & Truy xuất', desc: 'Theo dõi chính xác các lô sản xuất, mức tiêu thụ và hiệu quả tại mỗi trạm.' },
        ],
    },
} as const

type Lang = 'es' | 'en' | 'vn'

/* ─── ICONS ─────────────────────────────────────────────────────── */
const MODULE_ICONS = [BarChart3, Brain, Database, Fingerprint, Wifi, Activity]
const MODULE_COLORS = ['blue', 'blue', 'blue', 'blue', 'blue', 'red']
const MODULE_TAGS = ['FIN', 'MACRO', 'VALT', 'AUTH', 'SYNC', 'OPS']
const ROLE_ICONS = [Shield, Globe, Layers]

const STATS_VALUES = ['100%', '3', '360°', 'v1.0']
const STATS_ICONS = [Zap, Activity, LineChart, Sparkles]

const SYSTEM_LOGS = [
    'ANTHROPOS_CORE_V1.1 · NEURAL_LINK_ESTABLISHED',
    'SOPHIA_MACRO: ORCHESTRATING_MICRO_AGENTS',
    'SAGRARIO_VAULT: RAG_PROTOCOL_ACTIVE',
    'OFFLINE_RELIANCE: SYNC_BUFFER_READY',
    'FINANCE_CLIMATE: SIEMBRA (STEADY_GROWTH)',
    'SECURITY_LAYER: WEBAUTHN_BIOMETRICS_PASS',
    'REPORT_ENGINE: PDF_EXPORT_CAPABLE',
]


/* ─── HELPERS ───────────────────────────────────────────────────── */
function TerminalTicker() {
    const [idx, setIdx] = useState(0)
    useEffect(() => {
        const id = setInterval(() => setIdx(p => (p + 1) % SYSTEM_LOGS.length), 2400)
        return () => clearInterval(id)
    }, [])
    return (
        <div className="flex items-center gap-3 overflow-hidden">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 animate-pulse" />
            <AnimatePresence mode="wait">
                <motion.span
                    key={idx}
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -12, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-[10px] font-bold tracking-[0.25em] text-blue-500/70 font-mono whitespace-nowrap"
                >
                    {SYSTEM_LOGS[idx]}
                </motion.span>
            </AnimatePresence>
        </div>
    )
}

function SectionBadge({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] font-bold uppercase tracking-[0.3em]">
            {children}
        </span>
    )
}

/* ─── LANGUAGE SELECTOR ─────────────────────────────────────────── */
function LangSelector({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
    const [open, setOpen] = useState(false)
    const current = LANG_OPTIONS.find(l => l.code === lang) || LANG_OPTIONS[0]

    return (
        <div className="relative">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(o => !o)}
                className="!rounded-2xl border border-[var(--border)] shadow-sm bg-[var(--card)] px-4 text-[11px] font-bold uppercase tracking-[0.2em] h-10 flex gap-3 items-center hover:bg-[var(--secondary)] transition-all overflow-hidden text-[var(--foreground)]"
            >
                <div className="relative w-5 h-5 flex items-center justify-center overflow-hidden rounded-full border border-[var(--border)] shadow-sm shrink-0">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={current.code}
                            initial={{ y: 12, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -12, opacity: 0 }}
                            className="absolute inset-0"
                        >
                            <current.Flag />
                        </motion.div>
                    </AnimatePresence>
                </div>
                <span>{current.label}</span>
            </Button>

            <AnimatePresence>
                {open && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 8 }}
                            className="absolute right-0 mt-2 w-52 bg-[var(--card)] border border-[var(--border)] rounded-[20px] shadow-2xl z-50 overflow-hidden p-1.5"
                        >
                            <div className="space-y-0.5">
                                {LANG_OPTIONS.map(opt => (
                                    <button
                                        key={opt.code}
                                        onClick={() => { setLang(opt.code); setOpen(false) }}
                                        className={cn(
                                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[11px] font-bold uppercase tracking-wider transition-all',
                                            lang === opt.code
                                                ? 'bg-[var(--secondary)] text-[var(--foreground)]'
                                                : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
                                        )}
                                    >
                                        <div className="w-5 h-5 rounded-full overflow-hidden border border-[var(--border)] shadow-sm shrink-0">
                                            <opt.Flag />
                                        </div>
                                        {opt.label} – {opt.name}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

/* ─── PAGE ──────────────────────────────────────────────────────── */
export default function LandingPage() {
    const { language } = useTranslation()
    const lang = (language as Lang) || 'es'

    // Apply light mode on mount (landing defaults to light)
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', 'light')
    }, [])

    const c = COPY[lang]
    const { scrollYProgress } = useScroll()
    const heroOpacity = useTransform(scrollYProgress, [0, 0.18], [1, 0])
    const heroY = useTransform(scrollYProgress, [0, 0.18], [0, -60])

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans overflow-x-hidden">

            {/* ── NAV ── */}
            <motion.header
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 sm:px-10 h-16 apple-blur border-b border-[var(--border)]"
            >
                <span className="text-xl font-black tracking-tighter text-blue-500">Serendipity</span>

                <div className="hidden sm:flex items-center gap-1 text-[12px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest">
                    {c.nav.map((label, i) => (
                        <a key={i} href={`#${['módulos', 'sistema', 'acceso'][i]}`}
                            className="px-3 py-1.5 rounded-lg hover:bg-[var(--secondary)] hover:text-[var(--foreground)] transition-all">
                            {label}
                        </a>
                    ))}
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Shared auth controls (lang + theme) */}
                    <AuthControls />

                    <Link href="/login" className="hidden sm:block">
                        <Button size="sm" className="!rounded-full h-10 bg-blue-600 text-white hover:bg-blue-500 px-5 gap-2 text-[11px] font-bold uppercase tracking-[0.2em]">
                            {c.enter} <ArrowRight size={14} />
                        </Button>
                    </Link>
                </div>
            </motion.header>

            {/* ── HERO ── */}
            <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 overflow-hidden">
                {/* Ambient blobs */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/6 rounded-full blur-[120px]" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-red-600/4 rounded-full blur-[100px]" />
                </div>

                {/* Grid pattern */}
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
                    style={{
                        backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
                        backgroundSize: '64px 64px'
                    }}
                />

                {/* Scanning line */}
                <motion.div
                    className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/25 to-transparent pointer-events-none"
                    animate={{ top: ['5%', '95%'] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                />

                <motion.div style={{ opacity: heroOpacity, y: heroY }} className="relative z-10 max-w-4xl mx-auto space-y-8">
                    {/* Terminal badge */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-[var(--border)] bg-[var(--card)]/80 apple-blur"
                    >
                        <TerminalTicker />
                    </motion.div>

                    {/* Headline — adapts per language */}
                    <motion.h1
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="text-[clamp(42px,8vw,88px)] font-black tracking-[-0.04em] leading-[0.95] text-balance"
                    >
                        <AnimatePresence mode="wait">
                            <motion.span key={lang + 'h1'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                {c.heroTag}{' '}
                                <span className="text-blue-500">{c.heroAccent}</span>
                                <br />
                                {c.heroSub}
                            </motion.span>
                        </AnimatePresence>
                    </motion.h1>

                    {/* Subheadline */}
                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, duration: 0.5 }}
                        className="text-[var(--muted-foreground)] text-lg sm:text-xl font-medium max-w-xl mx-auto leading-relaxed"
                    >
                        <AnimatePresence mode="wait">
                            <motion.span key={lang + 'desc'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                {c.heroDesc}
                            </motion.span>
                        </AnimatePresence>
                    </motion.p>

                    {/* CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Link href="/login">
                            <Button size="lg" className="!rounded-2xl bg-blue-600 text-white hover:bg-blue-500 gap-3 px-10 h-14 text-base font-bold shadow-lg shadow-blue-600/20">
                                {c.accessBtn}
                                <ArrowRight size={18} />
                            </Button>
                        </Link>
                        <Link href="/register">
                            <Button size="lg" variant="ghost" className="!rounded-2xl border border-[var(--border)] h-14 px-10 text-base font-bold hover:bg-[var(--secondary)]">
                                {c.signupBtn}
                            </Button>
                        </Link>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--muted-foreground)]/50"
                    >
                        {c.copyright}
                    </motion.p>
                </motion.div>

                {/* Scroll mouse indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2"
                >
                    <motion.div
                        animate={{ y: [0, 6, 0] }}
                        transition={{ duration: 1.6, repeat: Infinity }}
                        className="w-5 h-8 rounded-full border border-[var(--border)] flex items-start justify-center pt-1.5"
                    >
                        <div className="w-1 h-2 rounded-full bg-[var(--muted-foreground)]/50" />
                    </motion.div>
                </motion.div>
            </section>

            {/* ── STATS ── */}
            <section className="border-y border-[var(--border)] bg-[var(--card)]/40 apple-blur">
                <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8">
                    {STATS_VALUES.map((val, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="flex flex-col gap-2 text-center sm:text-left"
                        >
                            <div className="flex items-center justify-center sm:justify-start gap-2 text-blue-500">
                                {(() => { const Icon = STATS_ICONS[i]; return <Icon size={14} /> })()}
                                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">{c.statLabels[i]}</span>
                            </div>
                            <span className="text-4xl font-black tracking-tighter text-[var(--foreground)]">{val}</span>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ── MÓDULOS ── */}
            <section id="módulos" className="py-32 px-6">
                <div className="max-w-6xl mx-auto space-y-20">
                    <div className="text-center space-y-5">
                        <SectionBadge>{c.modulesBadge}</SectionBadge>
                        <h2 className="text-[clamp(32px,5vw,56px)] font-black tracking-tight">
                            {c.modulesH2a}<br />
                            <span className="text-blue-500">{c.modulesH2b}</span>
                        </h2>
                        <p className="text-[var(--muted-foreground)] text-lg font-medium max-w-lg mx-auto">{c.modulesDesc}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {c.modules.map((mod, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.08 }}
                                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                                className="group relative p-6 rounded-[24px] border border-[var(--border)] bg-[var(--card)] hover:border-blue-500/30 transition-all duration-300 cursor-default hover:shadow-lg hover:shadow-blue-500/5"
                            >
                                <div className="absolute top-5 right-5 text-[9px] font-black tracking-[0.3em] text-[var(--muted-foreground)]/40 font-mono">{MODULE_TAGS[i]}</div>
                                <div className={cn(
                                    'w-12 h-12 rounded-[14px] flex items-center justify-center mb-5',
                                    MODULE_COLORS[i] === 'red' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                                )}>
                                    {(() => { const Icon = MODULE_ICONS[i]; return <Icon size={22} /> })()}
                                </div>
                                <h3 className="font-bold text-[var(--foreground)] text-lg tracking-tight mb-2">{mod.title}</h3>
                                <p className="text-sm text-[var(--muted-foreground)] font-medium leading-relaxed">{mod.desc}</p>
                                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/0 group-hover:via-blue-500/30 to-transparent transition-all duration-500 rounded-b-[24px]" />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CLIMATE SYSTEM ── */}
            <section id="sistema" className="py-32 px-6 bg-[var(--card)]/30 border-y border-[var(--border)]">
                <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
                    <div className="space-y-8">
                        <SectionBadge>{c.climBadge}</SectionBadge>
                        <h2 className="text-[clamp(32px,4vw,52px)] font-black tracking-tight leading-tight">{c.climH2}</h2>
                        <p className="text-[var(--muted-foreground)] text-lg font-medium leading-relaxed">{c.climDesc}</p>
                        <div className="space-y-3">
                            {c.climates.map((cl, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -16 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.12 }}
                                    className="flex items-start gap-4 p-4 rounded-[16px] bg-[var(--card)] border border-[var(--border)] hover:border-blue-500/20 transition-all"
                                >
                                    <div className={cn('mt-0.5 w-2 h-2 rounded-full shrink-0', cl.name === 'TORMENTA' ? 'bg-red-500' : 'bg-blue-500')} />
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[var(--muted-foreground)] mb-1">{cl.name}</p>
                                        <p className="text-sm font-medium text-[var(--foreground)]">{cl.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                    <ClimateDemo lang={lang} />
                </div>
            </section>

            {/* ── SOPHIA ── */}
            <section className="py-32 px-6">
                <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
                    <SophiaVisual />
                    <div className="space-y-8">
                        <SectionBadge>{c.aiBadge}</SectionBadge>
                        <h2 className="text-[clamp(32px,4vw,52px)] font-black tracking-tight leading-tight">
                            {c.aiH2a}<br />
                            <span className="text-blue-500">{c.aiH2b}</span>
                        </h2>
                        <p className="text-[var(--muted-foreground)] text-lg font-medium leading-relaxed">{c.aiDesc}</p>
                        <ul className="space-y-3">
                            {c.aiFeats.map((feat, i) => (
                                <motion.li
                                    key={i}
                                    initial={{ opacity: 0, x: -12 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-center gap-3 text-sm font-semibold text-[var(--foreground)]"
                                >
                                    <CheckCircle2 size={16} className="text-blue-500 shrink-0" />
                                    {feat}
                                </motion.li>
                            ))}
                        </ul>
                        <Link href="/login">
                            <Button size="lg" className="!rounded-2xl bg-blue-600 text-white hover:bg-blue-500 gap-3 h-14 px-10 font-bold">
                                {c.aiBtn}
                                <Sparkles size={16} />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── ACCESS / ROLES ── */}
            <section id="acceso" className="py-32 px-6 border-t border-[var(--border)]">
                <div className="max-w-4xl mx-auto text-center space-y-16">
                    <div className="space-y-5">
                        <SectionBadge>{c.accessBadge}</SectionBadge>
                        <h2 className="text-[clamp(32px,5vw,56px)] font-black tracking-tight">
                            {c.accessH2a}<br />
                            <span className="text-blue-500">{c.accessH2b}</span>
                        </h2>
                        <p className="text-[var(--muted-foreground)] text-lg font-medium max-w-lg mx-auto">{c.accessDesc}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {c.roles.map((r, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="group p-6 rounded-[24px] border border-[var(--border)] bg-[var(--card)] hover:border-blue-500/30 transition-all duration-300 text-left space-y-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 rounded-[12px] bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                        {(() => { const Icon = ROLE_ICONS[i]; return <Icon size={18} /> })()}
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--muted-foreground)]/40 font-mono">{r.role}</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-[var(--foreground)] text-lg tracking-tight mb-2">{r.role}</h3>
                                    <p className="text-sm text-[var(--muted-foreground)] font-medium leading-relaxed">{r.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="py-32 px-6 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-blue-600/4" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/6 rounded-full blur-[120px]" />
                </div>
                <div className="relative max-w-3xl mx-auto text-center space-y-8">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        className="w-20 h-20 mx-auto bg-blue-600 rounded-[28px] flex items-center justify-center shadow-2xl shadow-blue-600/30"
                    >
                        <Shield size={36} className="text-white" />
                    </motion.div>
                    <h2 className="text-[clamp(32px,5vw,60px)] font-black tracking-tight">
                        {c.ctaH2a}<br />
                        <span className="text-blue-500">{c.ctaH2b}</span>
                    </h2>
                    <p className="text-[var(--muted-foreground)] text-lg font-medium max-w-md mx-auto">{c.ctaDesc}</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/login">
                            <Button size="lg" className="!rounded-2xl bg-blue-600 text-white hover:bg-blue-500 gap-3 px-12 h-14 text-base font-bold shadow-lg shadow-blue-600/20">
                                {c.ctaBtn}
                                <ArrowRight size={18} />
                            </Button>
                        </Link>
                        <Link href="/register">
                            <Button size="lg" variant="ghost" className="!rounded-2xl border border-[var(--border)] h-14 px-10 text-base font-bold hover:bg-[var(--secondary)]">
                                {c.signupBtn}
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer className="border-t border-[var(--border)] px-6 py-10">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span className="text-xl font-black tracking-tighter text-blue-500">Serendipity</span>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--muted-foreground)]/50 text-center">{c.copyright}</p>
                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                            {c.footerAccess}
                        </Link>
                        <Link href="/register" className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                            {c.footerReg}
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}

/* ─── CLIMATE DEMO ──────────────────────────────────────────────── */
function ClimateDemo({ lang }: { lang: Lang }) {
    const [active, setActive] = useState(0)

    const climas = [
        { name: 'SIEMBRA', color: 'blue', metrics: [{ l: 'Crecimiento', v: '+18.4%' }, { l: 'Eficiencia', v: '94.2%' }, { l: 'Estado', v: 'ÓPTIMO' }] },
        { name: 'COSECHA', color: 'blue', metrics: [{ l: 'Rendimiento', v: '+34.1%' }, { l: 'Margen', v: '61.8%' }, { l: 'Estado', v: 'POSITIVO' }] },
        { name: 'TORMENTA', color: 'red', metrics: [{ l: 'Alerta', v: 'ACTIVA' }, { l: 'Riesgo', v: 'ALTO' }, { l: 'Acción', v: 'URGENTE' }] },
    ]

    useEffect(() => {
        const id = setInterval(() => setActive(p => (p + 1) % climas.length), 3000)
        return () => clearInterval(id)
    }, [])

    const c = climas[active]
    const isRed = c.color === 'red'

    return (
        <motion.div
            key={active}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className={cn(
                'relative p-8 rounded-[28px] border transition-all duration-500 space-y-6',
                isRed
                    ? 'border-red-500/25 bg-red-500/[0.03] shadow-lg shadow-red-500/5'
                    : 'border-blue-500/25 bg-blue-500/[0.03] shadow-lg shadow-blue-500/5'
            )}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn('w-2 h-2 rounded-full animate-pulse', isRed ? 'bg-red-500' : 'bg-blue-500')} />
                    <span className={cn('text-[10px] font-black uppercase tracking-[0.35em]', isRed ? 'text-red-500' : 'text-blue-500')}>
                        CLIMA: {c.name}
                    </span>
                </div>
                <div className="flex gap-1.5">
                    {climas.map((_, i) => (
                        <button key={i} onClick={() => setActive(i)}
                            className={cn('h-1.5 rounded-full transition-all', i === active ? (isRed ? 'bg-red-500 w-4' : 'bg-blue-500 w-4') : 'bg-[var(--border)] w-1.5')} />
                    ))}
                </div>
            </div>

            <div className="space-y-1">
                {c.metrics.map((m, i) => (
                    <div key={i} className="flex justify-between items-center py-3 border-b border-[var(--border)] last:border-0">
                        <span className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">{m.l}</span>
                        <span className={cn('text-sm font-black', isRed ? 'text-red-500' : 'text-blue-500')}>{m.v}</span>
                    </div>
                ))}
            </div>

            <div className={cn(
                'h-1 rounded-full transition-all duration-1000',
                isRed ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-gradient-to-r from-blue-600 to-blue-400'
            )} style={{ width: `${(active + 1) * 33.3}%` }} />
        </motion.div>
    )
}

/* ─── SOPHIA VISUAL ─────────────────────────────────────────────── */
function SophiaVisual() {
    return (
        <div className="relative w-full aspect-square max-w-sm mx-auto flex items-center justify-center">
            {/* Orbiting rings — z-0 so they sit behind everything */}
            {[0, 1, 2].map(i => (
                <motion.div
                    key={i}
                    className="absolute rounded-full border border-blue-500/10"
                    style={{ inset: `${i * 15}%`, zIndex: 0 }}
                    animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                    transition={{ duration: 20 + i * 8, repeat: Infinity, ease: 'linear' }}
                />
            ))}

            {/* Orbiting dot — z-1 */}
            <motion.div
                className="absolute w-full h-full"
                style={{ zIndex: 1 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
            </motion.div>

            {/* Central brain icon — z-20, above rings & dot */}
            <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="relative w-24 h-24 rounded-[28px] bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-600/30"
                style={{ zIndex: 20 }}
            >
                <Brain size={40} className="text-white" />
                
                {/* PDF and File indicators orbiting Sophia */}
                <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-[-40px]"
                >
                    <div className="absolute top-0 right-0 w-8 h-8 rounded-xl bg-white border border-blue-100 flex items-center justify-center shadow-md">
                        <FileText size={16} className="text-blue-600" />
                    </div>
                </motion.div>
                
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-[-60px]"
                >
                    <div className="absolute bottom-4 left-0 w-8 h-8 rounded-xl bg-white border border-blue-100 flex items-center justify-center shadow-md">
                        <Archive size={16} className="text-blue-600" />
                    </div>
                </motion.div>
            </motion.div>

            {/* Floating label chips — z-30, always on top */}
            {[
                { label: 'ORCHESTRATING', x: '-70%', y: '-25%' },
                { label: 'SAGRARIO LINK', x: '60%', y: '-30%' },
                { label: 'OFFLINE_READY', x: '-65%', y: '40%' },
                { label: 'REPORT_GEN', x: '55%', y: '45%' },
            ].map((chip, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + i * 0.2 }}
                    className="absolute text-[8px] font-black uppercase tracking-[0.25em] bg-[var(--card)] border border-[var(--border)] px-3 py-2 rounded-full text-blue-500 whitespace-nowrap shadow-sm apple-blur"
                    style={{ left: chip.x, top: chip.y, zIndex: 30 }}
                >
                    {chip.label}
                </motion.div>
            ))}
        </div>
    )
}
