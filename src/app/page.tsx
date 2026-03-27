'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform, AnimatePresence, useInView } from 'framer-motion'
import { ReactLenis } from 'lenis/react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import {
    Shield, Brain, ArrowRight, Sparkles,
    CheckCircle2, FileText, Archive, Database,
    Fingerprint, Wifi, BarChart3, Users, Zap,
    Globe, DollarSign, Activity, Package, Sun, Moon
} from 'lucide-react'
import { Button } from '@/components/ui-library'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/context/language-context'
import { AuthControls } from '@/components/auth-controls'

/* ─── TYPES ── */
type Lang = 'es' | 'en' | 'vn'

/* ─── TRANSLATIONS ── */
const COPY = {
    es: {
        nav: ['Sistema', 'Módulos', 'Sophia', 'Acceso'],
        enter: 'Entrar',
        goToApp: 'Ir al Dashboard',
        // Hero
        heroEyebrow: 'Serendipity OS · Beta 2026',
        heroLine1: 'El sistema',
        heroLine2: 'que piensa',
        heroLine3: 'con tu negocio.',
        heroDesc: 'Gestión financiera y operativa con inteligencia artificial. Diseñado para organizaciones que exigen más.',
        heroCta: 'Acceder al sistema',
        heroCtaSecondary: 'Crear cuenta',
        // Feature bento
        bentoBadge: 'Capacidades del sistema',
        bentoTitle: 'Todo lo que necesitas, integrado.',
        bentoDesc: 'Seis módulos trabajando como uno solo.',
        // Climate
        climBadge: 'Sistema Adaptativo',
        climTitle: 'Una interfaz que respira con tu operación.',
        climDesc: 'El Clima Financiero analiza en tiempo real el estado de tu negocio y adapta la UI, colores y alertas. No es un dashboard más — es un sistema vivo.',
        climates: [
            { name: 'SIEMBRA', emoji: '🌱', desc: 'Crecimiento activo. El sistema en modo expansión óptima.' },
            { name: 'COSECHA', emoji: '🌾', desc: 'Rendimiento máximo. Recolección de resultados positivos.' },
            { name: 'TORMENTA', emoji: '⚡', desc: 'Alerta operativa. Foco en estabilización y contingencia.' },
        ],
        // Sophia
        sophiaBadge: 'Inteligencia Artificial',
        sophiaTitle: 'Sophia no es un chatbot.',
        sophiaTitle2: 'Es tu agente operativo.',
        sophiaDesc: 'Sophia orquesta micro-agentes especializados para monitorear finanzas, analizar el Sagrario y generar reportes ejecutivos. Mientras tú decides, ella trabaja.',
        sophiaFeats: [
            'Análisis del Sagrario (Memoria Histórica con RAG)',
            'Orquestación de Micro-Agentes especializados',
            'Reportes Ejecutivos en PDF bajo demanda',
            'Recomendaciones basadas en principios herméticos',
        ],
        sophiaCta: 'Consultar a Sophia',
        // Access
        accessBadge: 'Control de Acceso',
        accessTitle: 'Capas de acceso.',
        accessTitle2: 'Control total.',
        accessDesc: 'Roles granulares con biometría WebAuthn. Cada usuario ve exactamente lo que necesita.',
        roles: [
            { role: 'Admin', tag: 'SISTEMA', desc: 'Visibilidad total, configuración global y gestión de usuarios.' },
            { role: 'Supervisor', tag: 'EQUIPO', desc: 'Monitoreo de equipos, aprobaciones y seguimiento operativo.' },
            { role: 'Operativo', tag: 'CAMPO', desc: 'Registro de actividades, lotes y comunicación directa.' },
        ],
        // CTA
        ctaTitle: 'Listo para transformar tu operación.',
        ctaDesc: 'Únete a la organización que ya opera con inteligencia consciente.',
        ctaPrimary: 'Acceder ahora',
        ctaSecondary: 'Crear cuenta',
        // Footer
        copyright: '© 2026 Serendipity OS',
        // Modules
        modules: [
            { title: 'Finanzas', desc: 'Ingresos, gastos, liquidez y proyecciones en tiempo real.', tag: 'FIN_01', icon: 'BarChart3', size: 'large' },
            { title: 'Sophia IA', desc: 'Macro-agente que orquesta micro-agentes especializados.', tag: 'AI_CORE', icon: 'Brain', size: 'medium' },
            { title: 'Sagrario', desc: 'Bóveda de conocimiento con búsqueda semántica (RAG).', tag: 'VAULT', icon: 'Database', size: 'medium' },
            { title: 'Biometría', desc: 'WebAuthn: huella digital y FaceID integrados.', tag: 'SEC_03', icon: 'Fingerprint', size: 'small' },
            { title: 'Offline Sync', desc: 'Opera sin red. Sincronización automática al volver.', tag: 'SYNC_04', icon: 'Wifi', size: 'small' },
            { title: 'Trazabilidad', desc: 'Lotes de producción y eficiencias por estación.', tag: 'OPS_05', icon: 'Zap', size: 'small' },
        ],
    },
    en: {
        nav: ['System', 'Modules', 'Sophia', 'Access'],
        enter: 'Enter',
        goToApp: 'Go to Dashboard',
        heroEyebrow: 'Serendipity OS · Beta 2026',
        heroLine1: 'The system',
        heroLine2: 'that thinks',
        heroLine3: 'with your business.',
        heroDesc: 'Financial and operational management powered by AI. Built for organizations that demand more.',
        heroCta: 'Access the system',
        heroCtaSecondary: 'Create account',
        bentoBadge: 'System Capabilities',
        bentoTitle: 'Everything you need, integrated.',
        bentoDesc: 'Six modules working as one.',
        climBadge: 'Adaptive System',
        climTitle: 'An interface that breathes with your operation.',
        climDesc: 'The Financial Climate analyzes your business in real time and adapts the UI, colors and alerts. Not just a dashboard — a living system.',
        climates: [
            { name: 'SIEMBRA', emoji: '🌱', desc: 'Active growth. System in optimal expansion mode.' },
            { name: 'COSECHA', emoji: '🌾', desc: 'Maximum performance. Harvesting positive results.' },
            { name: 'TORMENTA', emoji: '⚡', desc: 'Operational alert. Focus on stabilization and contingency.' },
        ],
        sophiaBadge: 'Artificial Intelligence',
        sophiaTitle: "Sophia isn't a chatbot.",
        sophiaTitle2: "She's your operational agent.",
        sophiaDesc: 'Sophia orchestrates specialized micro-agents to monitor finances, analyze the Vault and generate executive reports. While you decide, she works.',
        sophiaFeats: [
            'Sagrario analysis (Historical Memory with RAG)',
            'Orchestration of specialized Micro-Agents',
            'Executive PDF Reports on demand',
            'Recommendations based on hermetic principles',
        ],
        sophiaCta: 'Consult Sophia',
        accessBadge: 'Access Control',
        accessTitle: 'Access layers.',
        accessTitle2: 'Total control.',
        accessDesc: 'Granular roles with WebAuthn biometrics. Each user sees exactly what they need.',
        roles: [
            { role: 'Admin', tag: 'SYSTEM', desc: 'Total visibility, global configuration and user management.' },
            { role: 'Supervisor', tag: 'TEAM', desc: 'Team monitoring, approvals and operational tracking.' },
            { role: 'Operative', tag: 'FIELD', desc: 'Activity logging, batches and direct communication.' },
        ],
        ctaTitle: 'Ready to transform your operation.',
        ctaDesc: 'Join the organization already operating with conscious intelligence.',
        ctaPrimary: 'Access now',
        ctaSecondary: 'Create account',
        copyright: '© 2026 Serendipity OS',
        modules: [
            { title: 'Finance', desc: 'Revenue, expenses, liquidity and projections in real time.', tag: 'FIN_01', icon: 'BarChart3', size: 'large' },
            { title: 'Sophia AI', desc: 'Macro-agent orchestrating specialized micro-agents.', tag: 'AI_CORE', icon: 'Brain', size: 'medium' },
            { title: 'Sagrario', desc: 'Knowledge vault with semantic search (RAG).', tag: 'VAULT', icon: 'Database', size: 'medium' },
            { title: 'Biometrics', desc: 'WebAuthn: fingerprint and FaceID integrated.', tag: 'SEC_03', icon: 'Fingerprint', size: 'small' },
            { title: 'Offline Sync', desc: 'Work offline. Auto-sync when back online.', tag: 'SYNC_04', icon: 'Wifi', size: 'small' },
            { title: 'Traceability', desc: 'Production batches and efficiency per station.', tag: 'OPS_05', icon: 'Zap', size: 'small' },
        ],
    },
    vn: {
        nav: ['Hệ thống', 'Mô-đun', 'Sophia', 'Truy cập'],
        enter: 'Vào',
        goToApp: 'Đến Dashboard',
        heroEyebrow: 'Serendipity OS · Beta 2026',
        heroLine1: 'Hệ thống',
        heroLine2: 'suy nghĩ',
        heroLine3: 'cùng doanh nghiệp.',
        heroDesc: 'Quản lý tài chính và vận hành với AI. Được thiết kế cho các tổ chức đòi hỏi cao hơn.',
        heroCta: 'Truy cập hệ thống',
        heroCtaSecondary: 'Tạo tài khoản',
        bentoBadge: 'Khả năng hệ thống',
        bentoTitle: 'Tất cả bạn cần, tích hợp.',
        bentoDesc: 'Sáu mô-đun hoạt động như một.',
        climBadge: 'Hệ thống thích ứng',
        climTitle: 'Giao diện hít thở cùng hoạt động.',
        climDesc: 'Khí hậu tài chính phân tích thời gian thực và điều chỉnh UI, màu sắc và cảnh báo.',
        climates: [
            { name: 'SIEMBRA', emoji: '🌱', desc: 'Tăng trưởng tích cực. Hệ thống ở chế độ mở rộng tối ưu.' },
            { name: 'COSECHA', emoji: '🌾', desc: 'Hiệu suất tối đa. Thu hoạch kết quả tích cực.' },
            { name: 'TORMENTA', emoji: '⚡', desc: 'Cảnh báo hoạt động. Tập trung ổn định và dự phòng.' },
        ],
        sophiaBadge: 'Trí tuệ nhân tạo',
        sophiaTitle: 'Sophia không phải chatbot.',
        sophiaTitle2: 'Cô ấy là đặc vụ vận hành của bạn.',
        sophiaDesc: 'Sophia điều phối các micro-agent chuyên biệt để giám sát tài chính và tạo báo cáo điều hành.',
        sophiaFeats: [
            'Phân tích Sagrario (Bộ nhớ lịch sử với RAG)',
            'Điều phối các Micro-Agent chuyên biệt',
            'Báo cáo điều hành PDF theo yêu cầu',
            'Khuyến nghị dựa trên nguyên tắc hermetic',
        ],
        sophiaCta: 'Tư vấn Sophia',
        accessBadge: 'Kiểm soát truy cập',
        accessTitle: 'Các lớp truy cập.',
        accessTitle2: 'Toàn quyền kiểm soát.',
        accessDesc: 'Vai trò chi tiết với sinh trắc học WebAuthn.',
        roles: [
            { role: 'Admin', tag: 'HỆ THỐNG', desc: 'Tầm nhìn toàn bộ, cấu hình toàn cầu và quản lý người dùng.' },
            { role: 'Giám sát', tag: 'ĐỘI', desc: 'Giám sát nhóm, phê duyệt và theo dõi hoạt động.' },
            { role: 'Vận hành', tag: 'THỰC ĐỊA', desc: 'Ghi chép hoạt động, lô hàng và giao tiếp trực tiếp.' },
        ],
        ctaTitle: 'Sẵn sàng chuyển đổi hoạt động.',
        ctaDesc: 'Tham gia tổ chức đã hoạt động với trí tuệ có ý thức.',
        ctaPrimary: 'Truy cập ngay',
        ctaSecondary: 'Tạo tài khoản',
        copyright: '© 2026 Serendipity OS',
        modules: [
            { title: 'Tài chính', desc: 'Doanh thu, chi phí, thanh khoản và dự báo thời gian thực.', tag: 'FIN_01', icon: 'BarChart3', size: 'large' },
            { title: 'Sophia AI', desc: 'Đặc vụ macro điều phối các micro-agent chuyên biệt.', tag: 'AI_CORE', icon: 'Brain', size: 'medium' },
            { title: 'Sagrario', desc: 'Kho kiến thức với tìm kiếm ngữ nghĩa (RAG).', tag: 'VAULT', icon: 'Database', size: 'medium' },
            { title: 'Sinh trắc', desc: 'WebAuthn: vân tay và FaceID tích hợp.', tag: 'SEC_03', icon: 'Fingerprint', size: 'small' },
            { title: 'Offline Sync', desc: 'Làm việc offline. Tự động đồng bộ khi có mạng.', tag: 'SYNC_04', icon: 'Wifi', size: 'small' },
            { title: 'Truy xuất', desc: 'Lô sản xuất và hiệu quả theo trạm.', tag: 'OPS_05', icon: 'Zap', size: 'small' },
        ],
    }
}

const MODULE_ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    BarChart3, Brain, Database, Fingerprint, Wifi, Zap
}

/* ─── FADE-IN SECTION ── */
function FadeIn({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
    const ref = useRef<HTMLDivElement>(null)
    const isInView = useInView(ref, { once: true, margin: '-80px' })
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 32 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

/* ─── EYEBROW / BADGE ── */
function Eyebrow({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-blue-600 font-mono">
            <span className="w-4 h-px bg-blue-600 inline-block" />
            {children}
            <span className="w-4 h-px bg-blue-600 inline-block" />
        </span>
    )
}

/* ─── HORIZONTAL TICKER ── */
const TICKER_ITEMS = [
    'Sophia Macro-Agent', '·', 'Financial Climate', '·', 'Sagrario Vault', '·',
    'WebAuthn Biometrics', '·', 'Offline Sync', '·', 'PDF Reports', '·',
    'RAG Memory', '·', 'Role-Based Access', '·', 'Real-time Analytics', '·',
]

function Ticker() {
    return (
        <div className="overflow-hidden py-3 select-none" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--background)' }}>
            <motion.div
                className="flex gap-8 whitespace-nowrap"
                animate={{ x: ['0%', '-50%'] }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            >
                {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                    <span key={i} className="text-[11px] font-bold uppercase tracking-[0.2em]"
                        style={{ color: item === '·' ? '#3b82f6' : 'var(--muted-foreground)' }}>
                        {item}
                    </span>
                ))}
            </motion.div>
        </div>
    )
}

/* ─── BENTO GRID ── */
type BentoModule = { title: string; desc: string; tag: string; icon: string; size: string }

function BentoGrid({ modules }: { modules: BentoModule[] }) {
    const [featuredIdx, setFeaturedIdx] = useState(0)
    const [progress, setProgress] = useState(0)
    const INTERVAL = 3500

    // Rotate featured every INTERVAL ms, also track progress for the bar
    useEffect(() => {
        let frame: number
        const startRef = { t: Date.now() }

        const tick = () => {
            const elapsed = (Date.now() - startRef.t) % INTERVAL
            setProgress(elapsed / INTERVAL * 100)
            frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)

        const rotate = setInterval(() => {
            startRef.t = Date.now()
            setFeaturedIdx(i => (i + 1) % modules.length)
        }, INTERVAL)

        return () => { cancelAnimationFrame(frame); clearInterval(rotate) }
    }, [modules.length])

    // Reorder: featured first, then remaining in original order
    const ordered = [
        modules[featuredIdx],
        ...modules.filter((_, i) => i !== featuredIdx),
    ]

    return (
        /* Fixed 3-col grid. Auto-placement rule:
           Item 0: col-span-2 row-span-2 → occupies cols 1-2, rows 1-2
           Items 1-2: col-span-1 → auto-place at col 3 rows 1 & 2
           Items 3-5: col-span-1 → auto-place at cols 1-3 row 3
           ⟹ No blank spaces. */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:auto-rows-[200px]">

            {/* ── FEATURED CARD ── col-span-2 row-span-2 */}
            <div className="md:col-span-2 md:row-span-2 relative min-h-[200px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={featuredIdx}
                        initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -14, filter: 'blur(6px)' }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0 rounded-[28px] border overflow-hidden shadow-lg cursor-default"
                        style={{
                            borderColor: 'rgba(37,99,235,0.3)',
                            background: 'linear-gradient(135deg, var(--featured-bg-from, #eff6ff), var(--featured-bg-to, #eef2ff))',
                            '--featured-bg-from': 'rgba(37,99,235,0.06)',
                            '--featured-bg-to': 'rgba(99,102,241,0.04)',
                        } as React.CSSProperties}
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(37,99,235,0.08),transparent_60%)]" />

                        {/* Navigation dots */}
                        <div className="absolute top-5 right-5 flex items-center gap-2 z-20">
                            {modules.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setFeaturedIdx(i)}
                                    className={cn(
                                        'h-1.5 rounded-full transition-all duration-500',
                                        i === featuredIdx ? 'bg-blue-600 w-5' : 'bg-blue-300/50 w-1.5 hover:bg-blue-400/70'
                                    )}
                                />
                            ))}
                        </div>

                        <div className="relative z-10 p-8 h-full flex flex-col justify-between">
                            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
                                {(() => { const Icon = MODULE_ICON_MAP[ordered[0].icon]; return <Icon size={28} /> })()}
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500/70 font-mono">
                                    {ordered[0].tag}
                                </p>
                                <h3 className="text-[clamp(28px,4vw,42px)] font-black tracking-tight leading-[1.05]"
                                    style={{ fontFamily: 'var(--font-outfit), sans-serif', color: 'var(--foreground)' }}>
                                    {ordered[0].title}
                                </h3>
                                <p className="font-medium text-base leading-relaxed max-w-sm" style={{ color: 'var(--muted-foreground)' }}>
                                    {ordered[0].desc}
                                </p>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="absolute bottom-0 inset-x-0 h-[3px] bg-blue-100/60">
                            <div
                                className="h-full bg-blue-600 rounded-full transition-none"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* ── REMAINING 5 CARDS ── auto-placed by CSS grid */}
            {ordered.slice(1).map((mod, i) => {
                const Icon = MODULE_ICON_MAP[mod.icon]
                return (
                    <motion.div
                        key={mod.tag}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                        className="group relative rounded-[28px] border overflow-hidden cursor-default transition-all duration-300 hover:shadow-xl hover:shadow-black/8 hover:-translate-y-1"
                        style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-100/0 group-hover:from-blue-50/60 group-hover:to-indigo-50/40 transition-all duration-500 rounded-[28px]" />
                        <div className="absolute top-4 right-4 text-[9px] font-black tracking-[0.3em] font-mono group-hover:text-blue-400 transition-colors" style={{ color: 'var(--muted-foreground)' }}>
                            {mod.tag}
                        </div>
                        <div className="relative z-10 p-6 h-full flex flex-col justify-between">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:bg-blue-100 group-hover:text-blue-600 transition-all" style={{ background: 'var(--secondary)', color: 'var(--muted-foreground)' }}>
                                <Icon size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-lg mb-1 tracking-tight"
                                    style={{ fontFamily: 'var(--font-outfit), sans-serif', color: 'var(--foreground)' }}>
                                    {mod.title}
                                </h3>
                                <p className="text-xs font-medium leading-snug" style={{ color: 'var(--muted-foreground)' }}>{mod.desc}</p>
                            </div>
                        </div>
                        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500/0 group-hover:via-blue-500/50 to-transparent transition-all duration-500" />
                    </motion.div>
                )
            })}
        </div>
    )
}

/* APP MOCKUP */
function AppMockup({ lang }: { lang: 'es' | 'en' | 'vn' }) {
    const [isDark, setIsDark] = useState(false)
    const [activeIdx, setActiveIdx] = useState(0)
    const T = 'transition-all duration-500'

    // Internal color tokens
    const bg0     = isDark ? '#09090b' : '#f5f5f7'
    const bg1     = isDark ? '#09090b' : '#f5f5f7'
    const topBg   = isDark ? '#09090b' : '#ffffff'
    const topBdr  = isDark ? '#27272a' : '#e4e7eb'
    const cardBg  = isDark ? '#1c1c1f' : '#ffffff'
    const cardBdr = isDark ? '#3f3f46' : '#e4e7eb'
    const urlBg   = isDark ? '#27272a' : '#ffffff'
    const urlBdr  = isDark ? '#3f3f46' : '#e4e7eb'
    const txt0    = isDark ? '#f4f4f5' : '#09090b'
    const txt1    = isDark ? '#a1a1aa' : '#6b7280'
    const txt2    = isDark ? '#52525b' : '#9ca3af'
    const sidebarBg  = '#0f0f11'
    const sidebarBdr = 'rgba(255,255,255,0.06)'

    const sideItems = [
        { icon: BarChart3, name: 'El Punto Cero',      sub: 'FINANZAS EN TIEMPO REAL',     active: true  },
        { icon: Activity,  name: 'Matriz de Ritmos',   sub: 'PRODUCCI\u00d3N DE LA PLANTA',    active: false },
        { icon: Database,  name: 'Jard\u00edn de Datos',    sub: 'REPORTES / ANAL\u00cdTICA',       active: false },
        { icon: Brain,     name: 'Conciencia Sophia',  sub: 'SABIDUR\u00cdA DOCUMENTAL',       active: false },
        { icon: Shield,    name: 'El Templo',          sub: 'CONFIGURACI\u00d3N / ADMIN',      active: false },
    ]

    return (
        <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.8, duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[1000px]"
        >
            {/* Hint */}
            <div className={`absolute -top-7 right-1 flex items-center gap-1.5 text-[10px] font-bold select-none pointer-events-none ${T} ${isDark ? 'text-blue-400' : 'text-zinc-400'}`}>
                {isDark ? <Sun size={10} /> : <Moon size={10} />}
                <span>{isDark ? (lang === 'es' ? 'Modo Oscuro' : 'Dark Mode') : (lang === 'es' ? 'Modo Claro' : 'Light Mode')}</span>
                <span className="opacity-40 flex items-center gap-1">&middot; click <Sparkles size={10} className="text-blue-500" /></span>
            </div>

            {/* Glow */}
            <div className={`absolute -inset-x-10 -bottom-4 h-60 rounded-full blur-[80px] pointer-events-none ${T}`} style={{ background: isDark ? 'rgba(37,99,235,0.18)' : 'rgba(37,99,235,0.07)' }} />

            {/* Browser chrome */}
            <div className={`rounded-[18px] border overflow-hidden ${T}`} style={{ borderColor: isDark ? '#3f3f46' : 'rgba(228,228,235,0.9)', boxShadow: isDark ? '0 28px 70px rgba(0,0,0,0.65)' : '0 28px 70px rgba(0,0,0,0.13)' }}>

                {/* Browser top bar */}
                <div className={`flex items-center gap-3 px-4 py-2.5 border-b ${T}`} style={{ background: isDark ? '#1c1c1f' : '#f4f4f5', borderColor: topBdr }}>
                    {/* Traffic lights */}
                    <div className="flex gap-1.5 shrink-0">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                        <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                        <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                    </div>
                    {/* URL bar */}
                    <div className="flex-1 mx-2">
                        <div className={`h-6 rounded-md border flex items-center px-3 ${T}`} style={{ background: urlBg, borderColor: urlBdr }}>
                            <span className={`text-[10px] font-mono ${T}`} style={{ color: txt2 }}>app.serendipity.com/dashboard</span>
                        </div>
                    </div>
                    {/* Theme toggle */}
                    <button
                        onClick={() => setIsDark(d => !d)}
                        className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer ${T}`}
                        style={{ background: isDark ? '#3f3f46' : '#e4e7eb', color: isDark ? '#a1a1aa' : '#71717a' }}
                        title={isDark ? 'Switch to Light' : 'Switch to Dark'}
                    >
                        {isDark ? <Sun size={13} /> : <Moon size={13} />}
                    </button>
                </div>

                {/* App shell */}
                <div className={`flex ${T} h-[280px] sm:h-[420px] lg:h-[520px]`} style={{ background: bg0 }}>

                    {/* Sidebar */}
                    <div className="flex-shrink-0 flex flex-col" style={{ width: '176px', background: sidebarBg, borderRight: `1px solid ${sidebarBdr}` }}>
                        {/* Logo */}
                        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${sidebarBdr}` }}>
                            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                                <Shield size={13} className="text-white" />
                            </div>
                            <span className="text-white font-black text-[12px] tracking-tight">Serendipity OS</span>
                        </div>
                        {/* Nav */}
                        <div className="p-2 flex flex-col gap-0.5 flex-1 overflow-hidden">
                            {sideItems.map((item, i) => {
                                const isActive = activeIdx === i
                                return (
                                    <motion.div
                                        key={i}
                                        onClick={() => setActiveIdx(i)}
                                        whileHover={{ background: isActive ? '#2563eb' : 'rgba(255,255,255,0.05)' }}
                                        className="flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-pointer"
                                        style={{ background: isActive ? '#2563eb' : 'transparent' }}
                                    >
                                        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)' }}>
                                            <item.icon size={12} style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.45)' }} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold truncate leading-none mb-0.5" style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.55)' }}>{item.name}</p>
                                            <p className="text-[7px] font-black uppercase tracking-wider truncate" style={{ color: 'rgba(255,255,255,0.28)' }}>{item.sub}</p>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                        {/* User */}
                        <div className="p-3 flex items-center gap-2" style={{ borderTop: `1px solid ${sidebarBdr}` }}>
                            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-black shrink-0">AD</div>
                            <div className="min-w-0">
                                <p className="text-white text-[10px] font-bold truncate">Admin</p>
                                <p className="text-[7px] font-black uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>ADMINISTRADOR</p>
                            </div>
                        </div>
                    </div>

                    {/* Main content */}
                    <div className={`flex-1 flex flex-col overflow-hidden ${T}`} style={{ background: bg1 }}>

                        {/* App top bar */}
                        <div className={`flex items-center justify-between px-4 py-2 border-b shrink-0 ${T}`} style={{ background: topBg, borderColor: topBdr }}>
                            <div>
                                <p className="text-[8px] font-bold uppercase tracking-[0.2em] font-mono mb-0.5" style={{ color: txt2 }}>SISTEMA ANTHROPOS</p>
                                <p className="font-black text-[13px] leading-none" style={{ color: txt0 }}>Centro de Mando</p>
                            </div>
                            {/* Climate badge */}
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border" style={isDark ? { background: 'rgba(20,83,45,0.3)', borderColor: 'rgba(22,101,52,0.5)' } : { background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                                <span className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap" style={{ color: isDark ? '#4ade80' : '#15803d' }}>COSECHA ðŸŒ¾</span>
                            </div>
                        </div>

                        {/* Page content */}
                        <div className="flex-1 p-3 sm:p-4 overflow-y-auto overflow-x-hidden flex flex-col gap-3 hide-scrollbar">

                            {/* Badge + Greeting */}
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border mb-1.5" style={isDark ? { background: 'rgba(20,83,45,0.25)', borderColor: 'rgba(22,101,52,0.4)' } : { background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                                    <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: isDark ? '#4ade80' : '#15803d' }}>SISTEMA OPERATIVO CONECTADO</span>
                                </div>
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h3 className="text-[16px] font-black leading-tight" style={{ color: txt0 }}>
                                            {lang === 'es' ? 'Buen día, Admin' : 'Good morning, Admin'}
                                        </h3>
                                        <p className="text-[10px] font-medium mt-0.5 max-w-[200px] leading-snug" style={{ color: txt1 }}>
                                            {lang === 'es' ? 'Época de Cosecha. El balance es estable y el futuro, claro.' : 'Harvest season. Balance stable.'}
                                        </p>
                                    </div>
                                    {/* Status panel */}
                                    <div className="shrink-0 text-right">
                                        <p className="text-[7px] font-black uppercase tracking-widest mb-0.5" style={{ color: txt2 }}>STATUS: SIEMBRA</p>
                                        <p className="text-[8px] font-bold" style={{ color: '#3b82f6' }}>Simetría Sagrada</p>
                                        <p className="text-[7px] mt-0.5" style={{ color: txt2 }}>miércoles, 11 de marzo</p>
                                    </div>
                                </div>
                            </div>

                            {/* 2 primary progress cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {[
                                    { title: 'Matriz de Ritmos', sub: lang === 'es' ? 'Progreso de producción' : 'Production', value: '108.000 SF', meta: 'Meta: 150.000 SF', icon: Activity, color: '#3b82f6', pct: 72, desc: lang === 'es' ? 'Días de sol. El sistema respira tranquilo.' : 'System running steady.' },
                                    { title: 'Fondo de Paz',     sub: lang === 'es' ? 'Amortización Prara Asia' : 'Amortization', value: '$15.000', meta: 'Meta: $40.000', icon: Shield, color: '#22c55e', pct: 37, desc: lang === 'es' ? 'Flujo activo. Reintegro constante.' : 'Active flow. Steady.' },
                                ].map((card, i) => (
                                    <div key={i} className={`rounded-xl border p-3 flex flex-col justify-between ${T}`} style={{ background: cardBg, borderColor: cardBdr, minHeight: '105px' }}>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: i === 0 ? (isDark ? 'rgba(37,99,235,0.15)' : '#eff6ff') : (isDark ? 'rgba(22,163,74,0.15)' : '#f0fdf4') }}>
                                                <card.icon size={12} style={{ color: card.color }} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black truncate" style={{ color: txt0 }}>{card.title}</p>
                                                <p className="text-[8px] truncate" style={{ color: txt2 }}>{card.sub}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-baseline justify-between mb-1">
                                                <p className="text-[13px] sm:text-[15px] font-black" style={{ color: txt0 }}>{card.value}</p>
                                                <p className="text-[7px] sm:text-[8px]" style={{ color: txt2 }}>{card.meta}</p>
                                            </div>
                                            <div className="h-1 rounded-full mb-1 sm:mb-1.5" style={{ background: isDark ? '#3f3f46' : '#f1f5f9' }}>
                                                <div className="h-full rounded-full" style={{ width: `${card.pct}%`, background: card.color }} />
                                            </div>
                                            <p className="text-[7px] sm:text-[8px] leading-tight" style={{ color: txt2 }}>{card.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* 4 stat chips */}
                            <div className="flex overflow-x-auto sm:grid sm:grid-cols-4 gap-1.5 snap-x hide-scrollbar pb-1 sm:pb-0">
                                {[
                                    { l: lang === 'es' ? 'SALDO CAJA' : 'CASH',     v: '$4.300',  tag: '+12%', up: true,  sub: 'EL PUNTO CERO',     Icon: DollarSign },
                                    { l: lang === 'es' ? 'SF PROCESADOS' : 'SF',    v: '108.000', tag: '88.2%', up: true,  sub: 'MATRIZ DE RITMOS',  Icon: Activity   },
                                    { l: lang === 'es' ? 'NÓMINA PEND.' : 'PAYROLL', v: '$8.200',  tag: '-5%',  up: false, sub: 'EL TEMPLO',         Icon: Users      },
                                    { l: lang === 'es' ? 'AMORTIZ. PRARIA' : 'AMORT.', v: '$15.000', tag: '37%',   up: true,  sub: 'FONDO DE PAZ',      Icon: Package    },
                                ].map((s, i) => (
                                    <div key={i} className={`shrink-0 w-[130px] snap-center sm:shrink sm:w-auto rounded-xl border p-2 ${T}`} style={{ background: cardBg, borderColor: cardBdr }}>
                                        <div className="flex items-start justify-between mb-1">
                                            <div className="w-4 h-4 rounded-md flex items-center justify-center" style={{ background: isDark ? '#27272a' : '#f1f5f9' }}>
                                                <s.Icon size={9} style={{ color: txt2 }} />
                                            </div>
                                            <span className="text-[7px] font-black" style={{ color: s.up ? '#22c55e' : '#ef4444' }}>{s.tag}</span>
                                        </div>
                                        <p className="text-[6px] font-bold uppercase tracking-wide leading-tight mb-0.5 mt-1" style={{ color: txt2 }}>{s.l}</p>
                                        <p className="text-[11px] sm:text-[11px] font-black" style={{ color: txt0 }}>{s.v}</p>
                                        <p className="text-[6px] sm:hidden uppercase font-black tracking-wide mt-0.5 truncate" style={{ color: txt2 }}>{s.sub}</p>
                                    </div>
                                ))}
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

/* ─── CLIMATE DEMO ── */
function ClimateOrb({ active, clima }: { active: boolean; clima: { name: string; emoji: string; desc: string } }) {
    const isRed = clima.name === 'TORMENTA'
    return (
        <motion.div
            layout
            className={cn(
                'relative overflow-hidden rounded-[24px] border p-6 transition-all duration-500',
                active
                    ? isRed
                        ? 'border-red-400/40 bg-gradient-to-br from-red-50 to-rose-50 shadow-lg shadow-red-500/10 scale-[1.02]'
                        : 'border-blue-400/40 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg shadow-blue-500/10 scale-[1.02]'
                    : 'opacity-50'
            )}
            style={
                active
                    ? {
                          borderColor: isRed ? 'rgba(239, 68, 68, 0.4)' : 'rgba(37, 99, 235, 0.4)',
                          background: isRed
                              ? 'linear-gradient(135deg, color-mix(in srgb, var(--background), rgba(239,68,68,0.08)), color-mix(in srgb, var(--background), rgba(225,29,72,0.05)))'
                              : 'linear-gradient(135deg, color-mix(in srgb, var(--background), rgba(37,99,235,0.08)), color-mix(in srgb, var(--background), rgba(79,70,229,0.05)))'
                      }
                    : { borderColor: 'var(--border)', background: 'var(--secondary)' }
            }
        >
            {active && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn(
                        'absolute inset-0 rounded-[24px] pointer-events-none',
                        isRed
                            ? 'bg-[radial-gradient(ellipse_at_top_right,rgba(239,68,68,0.08),transparent_60%)]'
                            : 'bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.06),transparent_60%)]'
                    )}
                />
            )}
            <div className="flex items-start gap-4 relative z-10">
                <span className="text-2xl">{clima.emoji}</span>
                <div>
                    <p className={cn(
                        'text-[10px] font-black uppercase tracking-[0.3em] mb-1 font-mono',
                        active ? (isRed ? 'text-red-500' : 'text-blue-600') : ''
                    )}
                    style={!active ? { color: 'var(--muted-foreground)' } : {}}
                    >
                        {clima.name}
                    </p>
                    <p
                        className="text-sm font-medium leading-snug transition-colors"
                        style={{ color: active ? 'var(--foreground)' : 'var(--muted-foreground)' }}
                    >
                        {clima.desc}
                    </p>
                </div>
            </div>
        </motion.div>
    )
}


/* ─── PAGE ── */
export default function LandingPage() {
    const { language } = useTranslation()
    const { user } = useAuth()
    const lang = (language as Lang) || 'es'
    const c = COPY[lang]
    const [climateIdx, setClimateIdx] = useState(0)
    const [isDark, setIsDark] = useState(false)

    // Detectar tema activo (controlado por AuthControls vía data-theme)
    useEffect(() => {
        const getTheme = () => {
            const stored = localStorage.getItem('theme')
            return (stored || document.documentElement.getAttribute('data-theme') || 'light') === 'dark'
        }
        setIsDark(getTheme())
        const observer = new MutationObserver(() => setIsDark(getTheme()))
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        const id = setInterval(() => setClimateIdx(i => (i + 1) % 3), 3200)
        return () => clearInterval(id)
    }, [])

    const { scrollYProgress } = useScroll()
    const heroY = useTransform(scrollYProgress, [0, 0.25], [0, -80])
    const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0])

    return (
        <ReactLenis root>
            <div className="min-h-screen font-sans overflow-x-hidden antialiased" style={{ fontFamily: 'var(--font-inter), var(--font-outfit), sans-serif', background: 'var(--background)', color: 'var(--foreground)' }}>

            {/* ── NAV ── */}
            <motion.header
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className={cn(
                    "fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 sm:px-10 h-16 backdrop-blur-md border-b border-[var(--border)]",
                    isDark ? "bg-black/80" : "bg-white/95"
                )}
            >
                <div className="relative h-9 w-40 shrink-0">
                    <Image
                        src={isDark ? '/dark_icon.png' : '/light_icon.png'}
                        alt="Serendipity OS"
                        fill
                        className="object-contain object-left"
                        priority
                    />
                </div>

                <div className="hidden sm:flex items-center gap-1 text-[12px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest">
                    {c.nav.map((label, i) => (
                        <a key={i} href={`#${['system', 'modules', 'sophia', 'access'][i]}`}
                            className="px-3 py-1.5 rounded-lg hover:bg-[var(--secondary)] hover:text-[var(--foreground)] transition-all">
                            {label}
                        </a>
                    ))}
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Auth controls: language selector + theme toggle */}
                    <AuthControls />
                    {user ? (
                        <Link href="/dashboard" className="hidden sm:block">
                            <Button size="sm" className="!rounded-full h-10 bg-blue-600 text-white hover:bg-blue-500 px-5 gap-2 text-[11px] font-bold uppercase tracking-[0.2em]">
                                {c.goToApp} <ArrowRight size={14} />
                            </Button>
                        </Link>
                    ) : (
                        <Link href="/login" className="hidden sm:block">
                            <Button size="sm" className="!rounded-full h-10 bg-blue-600 text-white hover:bg-blue-500 px-5 gap-2 text-[11px] font-bold uppercase tracking-[0.2em]">
                                {c.enter} <ArrowRight size={14} />
                            </Button>
                        </Link>
                    )}
                </div>
            </motion.header>

            {/* HERO */}
            <section className="relative overflow-hidden pt-24 pb-12 flex flex-col items-center justify-center" style={{ background: 'var(--background)', minHeight: '100dvh' }}>

                {/* Subtle grid */}
                <div
                    className="absolute inset-0 opacity-[0.035] pointer-events-none"
                    style={{
                        backgroundImage: 'linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)',
                        backgroundSize: '48px 48px'
                    }}
                />

                {/* Glows */}
                <div className="absolute top-1/2 left-[15%] -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[130px] pointer-events-none" style={{ background: 'rgba(37,99,235,0.11)' }} />
                <div className="absolute top-[30%] right-[5%] w-[450px] h-[450px] rounded-full blur-[120px] pointer-events-none" style={{ background: 'rgba(99,102,241,0.08)' }} />

                {/* 2-col layout */}
                <motion.div
                    style={{ y: heroY, opacity: heroOpacity }}
                    className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-12 w-full"
                >
                    <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-16 items-center">

                        {/* LEFT: text */}
                        <div className="flex flex-col gap-6 text-left">

                            {/* Eyebrow */}
                            <motion.div
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            >
                                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.25em] text-blue-600 font-mono" style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.28)' }}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                                    {c.heroEyebrow}
                                </span>
                            </motion.div>

                            {/* H1 */}
                            <motion.h1
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.18, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                className="font-black leading-[0.9] tracking-[-0.04em]"
                                style={{
                                    fontSize: 'clamp(42px, 5.5vw, 80px)',
                                    fontFamily: 'var(--font-outfit), var(--font-inter), sans-serif',
                                    color: 'var(--foreground)'
                                }}
                            >
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={lang}
                                        initial={{ opacity: 0, filter: 'blur(10px)' }}
                                        animate={{ opacity: 1, filter: 'blur(0px)' }}
                                        exit={{ opacity: 0, filter: 'blur(8px)' }}
                                        transition={{ duration: 0.55 }}
                                        className="block"
                                    >
                                        {c.heroLine1}<br />
                                        <span className="text-blue-600">{c.heroLine2}</span><br />
                                        {c.heroLine3}
                                    </motion.span>
                                </AnimatePresence>
                            </motion.h1>

                            {/* Sub */}
                            <motion.p
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.35, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                className="text-[17px] font-medium leading-relaxed max-w-md"
                                style={{ color: 'var(--muted-foreground)' }}
                            >
                                {c.heroDesc}
                            </motion.p>

                            {/* CTAs */}
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.6 }}
                                className="flex flex-col sm:flex-row items-start gap-3"
                            >
                                <Link href={user ? "/dashboard" : "/login"}>
                                    <motion.button
                                        whileHover={{ scale: 1.02, y: -1 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="flex items-center gap-3 px-8 rounded-2xl text-white text-[15px] font-bold shadow-lg transition-all whitespace-nowrap bg-blue-600 dark:bg-blue-600 shadow-blue-500/20 dark:shadow-blue-900/40"
                                        style={{ height: '54px' }}
                                    >
                                        {user ? c.goToApp : c.heroCta}
                                        <ArrowRight size={18} />
                                    </motion.button>
                                </Link>
                                <Link href="/register">
                                    <motion.button
                                        whileHover={{ scale: 1.02, y: -1 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="flex items-center gap-3 px-8 rounded-2xl text-[15px] font-bold transition-all whitespace-nowrap"
                                        style={{ border: '2px solid var(--border)', color: 'var(--foreground)', height: '54px', background: 'transparent' }}
                                    >
                                        {c.heroCtaSecondary}
                                    </motion.button>
                                </Link>
                            </motion.div>

                            {/* Social proof */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.7, duration: 0.6 }}
                                className="flex items-center gap-3"
                            >
                                <div className="flex -space-x-2">
                                    {['#3b82f6','#8b5cf6','#10b981'].map((color, i) => (
                                        <div key={i} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black text-white" style={{ background: color, zIndex: 3 - i }}>
                                            {['S','B','R'][i]}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[12px] font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                                    {lang === 'es' ? 'Usado por el equipo Serendipity Bros' : lang === 'vn' ? 'Doi Serendipity Bros dang dung' : 'Used by the Serendipity Bros team'}
                                </p>
                            </motion.div>
                        </div>

                        {/* RIGHT: Mockup */}
                        <div className="w-full flex items-center justify-center lg:justify-end">
                            <AppMockup lang={lang} />
                        </div>

                    </div>
                </motion.div>

                {/* Scroll hint */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:flex"
                >
                    <motion.div
                        animate={{ y: [0, 6, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity }}
                        className="w-5 h-8 rounded-full border flex items-start justify-center pt-1.5"
                        style={{ borderColor: 'var(--border)' }}
                    >
                        <div className="w-1 h-2 rounded-full" style={{ background: 'var(--muted-foreground)', opacity: 0.35 }} />
                    </motion.div>
                </motion.div>
            </section>

            {/* ── TICKER ── */}
            <Ticker />

            {/* ── STATS ROW ── */}
            <section className="py-20 px-6 border-b" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                <div className="max-w-5xl mx-auto">
                    <FadeIn>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-3xl overflow-hidden border" style={{ background: 'var(--border)', borderColor: 'var(--border)' }}>
                            {[
                                { value: '6', label: lang === 'es' ? 'Módulos integrados' : lang === 'vn' ? 'Mô-đun tích hợp' : 'Integrated modules', suffix: '' },
                                { value: '3', label: lang === 'es' ? 'Climas adaptativos' : lang === 'vn' ? 'Khí hậu thích ứng' : 'Adaptive climates', suffix: '' },
                                { value: '100', label: lang === 'es' ? 'Offline primero' : lang === 'vn' ? 'Ưu tiên ngoại tuyến' : 'Offline first', suffix: '%' },
                                { value: '0', label: lang === 'es' ? 'Contraseñas necesarias' : lang === 'vn' ? 'Mật khẩu cần thiết' : 'Passwords needed', suffix: '' },
                            ].map((stat, i) => (
                                <div key={i} className="px-8 py-8 text-center" style={{ background: 'var(--background)' }}>
                                    <motion.p
                                        initial={{ opacity: 0, y: 12 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                        className="text-[clamp(36px,5vw,52px)] font-black tracking-tight leading-none"
                                        style={{ fontFamily: 'var(--font-outfit), sans-serif', color: 'var(--foreground)' }}
                                    >
                                        {stat.value}<span className="text-blue-600">{stat.suffix}</span>
                                    </motion.p>
                                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] mt-2" style={{ color: 'var(--muted-foreground)' }}>{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* ── BENTO MODULES ── */}
            <section id="modules" className="py-32 px-6" style={{ background: 'var(--secondary)' }}>
                <div className="max-w-6xl mx-auto space-y-16">
                    <FadeIn className="text-center space-y-4">
                        <Eyebrow>{c.bentoBadge}</Eyebrow>
                        <h2
                            className="text-[clamp(36px,6vw,72px)] font-black leading-[1] tracking-[-0.04em]"
                            style={{ fontFamily: 'var(--font-outfit), sans-serif', color: 'var(--foreground)' }}
                        >
                            {c.bentoTitle}
                        </h2>
                        <p className="text-lg font-medium" style={{ color: 'var(--muted-foreground)' }}>{c.bentoDesc}</p>
                    </FadeIn>

                    {/* Bento Grid — fixed 3-col layout, no blank spaces */}
                    {/* Featured card always occupies col 1-2 rows 1-2; remaining 5 fill the rest perfectly */}
                    <BentoGrid modules={c.modules} />
                </div>
            </section>

            {/* ── CLIMATE SYSTEM ── */}
            <section id="system" className="py-32 px-6 border-t" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
                    <FadeIn className="space-y-8">
                        <Eyebrow>{c.climBadge}</Eyebrow>
                        <h2
                            className="text-[clamp(36px,5vw,60px)] font-black leading-[1.05] tracking-[-0.04em]"
                            style={{ fontFamily: 'var(--font-outfit), sans-serif', color: 'var(--foreground)' }}
                        >
                            {c.climTitle}
                        </h2>
                        <p className="text-lg font-medium leading-relaxed max-w-md" style={{ color: 'var(--muted-foreground)' }}>{c.climDesc}</p>

                        {/* Climate list */}
                        <div className="space-y-3">
                            {c.climates.map((cl, i) => (
                                <ClimateOrb key={i} active={climateIdx === i} clima={cl} />
                            ))}
                        </div>
                    </FadeIn>

                    {/* Live Climate Display */}
                    <FadeIn delay={0.2}>
                        <motion.div
                            key={climateIdx}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className={cn(
                                'rounded-[32px] border p-8 space-y-6 transition-all duration-700',
                                climateIdx === 2
                                    ? 'border-red-200 bg-gradient-to-br from-red-50 to-zinc-50 shadow-xl shadow-red-500/10'
                                    : 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-xl shadow-blue-500/10'
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn('w-3 h-3 rounded-full animate-pulse shadow-lg', climateIdx === 2 ? 'bg-red-500 shadow-red-500/50' : 'bg-blue-600 shadow-blue-600/50')} />
                                    <span className={cn('text-[11px] font-black uppercase tracking-[0.3em] font-mono', climateIdx === 2 ? 'text-red-600' : 'text-blue-700')}>
                                        CLIMATE: {c.climates[climateIdx].name}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    {c.climates.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setClimateIdx(i)}
                                            className={cn(
                                                'h-2 rounded-full transition-all duration-500',
                                                i === climateIdx
                                                    ? (climateIdx === 2 ? 'bg-red-500 w-6' : 'bg-blue-600 w-6')
                                                    : 'bg-zinc-300 w-2 hover:bg-zinc-400'
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>

                            {[
                                { l: 'Ingresos / Revenue', v: climateIdx === 2 ? '-12.3%' : climateIdx === 1 ? '+34.1%' : '+18.4%' },
                                { l: 'Margen / Margin', v: climateIdx === 2 ? '23.5%' : climateIdx === 1 ? '61.8%' : '44.2%' },
                                { l: 'Estado / Status', v: climateIdx === 2 ? 'URGENTE' : climateIdx === 1 ? 'POSITIVO' : 'ÓPTIMO' },
                            ].map((row, i) => (
                                <div key={i} className="flex justify-between items-center py-3 border-b border-current/10 last:border-0 group">
                                    <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500 group-hover:text-zinc-700 transition-colors">{row.l}</span>
                                    <span className={cn(
                                        'text-lg font-black',
                                        climateIdx === 2 ? 'text-red-600' : 'text-blue-700'
                                    )} style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                                        {row.v}
                                    </span>
                                </div>
                            ))}

                            <div className="h-2 w-full bg-white/60 rounded-full overflow-hidden">
                                <motion.div
                                    animate={{ width: climateIdx === 2 ? '30%' : climateIdx === 1 ? '100%' : '65%' }}
                                    transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                                    className={cn('h-full rounded-full', climateIdx === 2 ? 'bg-red-500' : 'bg-blue-600')}
                                />
                            </div>
                        </motion.div>
                    </FadeIn>
                </div>
            </section>

            {/* ── SOPHIA ── */}
            <section id="sophia" className="py-32 px-6 bg-zinc-900 text-white overflow-hidden relative">
                {/* Background effects */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]" />
                    <div
                        className="absolute inset-0 opacity-[0.04]"
                        style={{
                            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                            backgroundSize: '60px 60px'
                        }}
                    />
                </div>

                <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-20 items-center relative z-10">
                    {/* Left: Sophia Visual */}
                    <FadeIn>
                        <div className="relative w-full aspect-square max-w-sm mx-auto flex items-center justify-center">
                            {/* Ambient glow */}
                            <div className="absolute w-[70%] h-[70%] bg-blue-500/20 rounded-full blur-[80px] animate-pulse" />

                            {/* Orbiting rings */}
                            {[0, 1, 2].map(i => (
                                <motion.div
                                    key={i}
                                    className={cn('absolute rounded-full', i === 1 ? 'border border-dashed border-white/10' : 'border border-white/8')}
                                    style={{ inset: `${i * 12}%` }}
                                    animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                                    transition={{ duration: 30 + i * 12, repeat: Infinity, ease: 'linear' }}
                                />
                            ))}

                            {/* Orbiting Node */}
                            <motion.div
                                className="absolute w-full h-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                            >
                                <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-blue-400 shadow-lg shadow-blue-400/50" />
                            </motion.div>

                            {/* Core */}
                            <div className="relative z-10">
                                <motion.div
                                    animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.8, 0.4] }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    className="absolute inset-[-32px] rounded-full bg-blue-500/25 blur-2xl"
                                />
                                <motion.div
                                    animate={{ scale: [1, 1.04, 1] }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                    className="relative w-32 h-32 rounded-[36px] bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-2xl shadow-blue-500/40 ring-1 ring-white/20"
                                >
                                    <Brain size={52} className="text-white" />

                                    {/* Micro-agent icons */}
                                    <motion.div animate={{ rotate: -360 }} transition={{ duration: 14, repeat: Infinity, ease: 'linear' }} className="absolute inset-[-50px]">
                                        <div className="absolute top-1 right-1 w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl">
                                            <FileText size={20} className="text-white" />
                                        </div>
                                    </motion.div>

                                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }} className="absolute inset-[-70px]">
                                        <div className="absolute bottom-3 left-1 w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl">
                                            <Archive size={20} className="text-white" />
                                        </div>
                                    </motion.div>
                                </motion.div>
                            </div>

                            {/* Chips */}
                            {[
                                { label: 'ORCHESTRATING', x: '0%', y: '2%' },
                                { label: 'RAG_MEMORY', x: '0%', y: '85%' },
                                { label: 'PDF_EXPORT', x: '62%', y: '15%' },
                                { label: 'BIOMETRIC', x: '58%', y: '78%' },
                            ].map((chip, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.8 + i * 0.2, ease: [0.16, 1, 0.3, 1] }}
                                    className="absolute flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] bg-white/10 backdrop-blur-xl border border-white/15 px-3 py-2 rounded-full text-blue-200 whitespace-nowrap font-mono"
                                    style={{ left: chip.x, top: chip.y }}
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                    {chip.label}
                                </motion.div>
                            ))}
                        </div>
                    </FadeIn>

                    {/* Right: Text */}
                    <FadeIn delay={0.15} className="space-y-8">
                        <Eyebrow>{c.sophiaBadge}</Eyebrow>
                        <h2
                            className="text-[clamp(36px,5vw,60px)] font-black leading-[1.05] tracking-[-0.04em] text-white"
                            style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                        >
                            {c.sophiaTitle}<br />
                            <span className="text-blue-400">{c.sophiaTitle2}</span>
                        </h2>
                        <p className="text-zinc-400 text-lg font-medium leading-relaxed">{c.sophiaDesc}</p>

                        <ul className="space-y-4">
                            {c.sophiaFeats.map((feat, i) => (
                                <motion.li
                                    key={i}
                                    initial={{ opacity: 0, x: -16 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-start gap-3 text-sm font-medium text-zinc-300"
                                >
                                    <CheckCircle2 size={16} className="text-blue-400 shrink-0 mt-0.5" />
                                    {feat}
                                </motion.li>
                            ))}
                        </ul>

                        <Link href="/login">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                className="flex items-center gap-3 h-14 px-8 rounded-2xl bg-blue-600 text-white text-[15px] font-bold shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-colors mt-2"
                            >
                                <Sparkles size={18} />
                                {c.sophiaCta}
                            </motion.button>
                        </Link>
                    </FadeIn>
                </div>
            </section>

            {/* ── ACCESS / ROLES ── */}
            <section id="access" className="py-32 px-6 border-t" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                <div className="max-w-5xl mx-auto space-y-20">
                    <FadeIn className="text-center space-y-4">
                        <Eyebrow>{c.accessBadge}</Eyebrow>
                        <h2
                            className="text-[clamp(40px,7vw,80px)] font-black leading-[0.95] tracking-[-0.04em]"
                            style={{ fontFamily: 'var(--font-outfit), sans-serif', color: 'var(--foreground)' }}
                        >
                            {c.accessTitle}<br />
                            <span className="text-blue-600">{c.accessTitle2}</span>
                        </h2>
                        <p className="text-lg font-medium max-w-md mx-auto" style={{ color: 'var(--muted-foreground)' }}>{c.accessDesc}</p>
                    </FadeIn>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {c.roles.map((r, i) => (
                            <FadeIn key={i} delay={i * 0.1}>
                                <div className="group h-full p-8 rounded-[28px] border hover:shadow-xl hover:shadow-black/5 transition-all duration-300 text-left space-y-5 cursor-default" style={{ borderColor: 'var(--border)', background: 'var(--secondary)' }}>
                                    <div className="flex items-center justify-between">
                                        <div className={cn(
                                            'w-12 h-12 rounded-2xl flex items-center justify-center',
                                            i === 0 ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-700 group-hover:bg-zinc-900 group-hover:text-white transition-all'
                                        )}>
                                            {i === 0 ? <Shield size={20} /> : i === 1 ? <Users size={20} /> : <Globe size={20} />}
                                        </div>
                                        <span className="text-[9px] font-black tracking-[0.4em] font-mono group-hover:text-blue-400 transition-colors" style={{ color: 'var(--muted-foreground)' }}>{r.tag}</span>
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl mb-2" style={{ fontFamily: 'var(--font-outfit), sans-serif', color: 'var(--foreground)' }}>{r.role}</h3>
                                        <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>{r.desc}</p>
                                    </div>
                                </div>
                            </FadeIn>
                        ))}
                    </div>

                    {/* WebAuthn Badge */}
                    <FadeIn delay={0.3}>
                        <div className="text-center">
                            <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-zinc-200/50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700">
                                <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-zinc-950 flex items-center justify-center shrink-0">
                                    <Fingerprint size={16} className="text-white" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400 font-mono">WebAuthn Standard</p>
                                    <p className="text-sm font-bold text-black dark:text-white">Biometric authentication · Zero passwords</p>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* ── CTA FINAL ── */}
            <section className="py-32 px-6 bg-zinc-900 text-white relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-500/15 rounded-full blur-[120px]" />
                </div>
                <FadeIn className="relative max-w-3xl mx-auto text-center space-y-8 z-10">
                    <motion.div className="w-20 h-20 mx-auto rounded-[28px] bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-2xl shadow-blue-500/30">
                        <Shield size={36} className="text-white" />
                    </motion.div>
                    <h2
                        className="text-[clamp(36px,6vw,72px)] font-black leading-[1] tracking-[-0.04em] text-white"
                        style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                    >
                        {c.ctaTitle}
                    </h2>
                    <p className="text-zinc-400 text-lg font-medium max-w-md mx-auto">{c.ctaDesc}</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href={user ? "/dashboard" : "/login"}>
                            <motion.button
                                whileHover={{ scale: 1.02, y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex items-center gap-3 h-14 px-10 rounded-2xl bg-white text-zinc-900 text-[15px] font-bold shadow-lg shadow-white/10 hover:bg-zinc-100 transition-colors"
                            >
                                {user ? c.goToApp : c.ctaPrimary}
                                <ArrowRight size={18} />
                            </motion.button>
                        </Link>
                        {!user && (
                            <Link href="/register">
                                <motion.button
                                    whileHover={{ scale: 1.02, y: -1 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex items-center gap-3 h-14 px-10 rounded-2xl border border-white/20 text-zinc-300 text-[15px] font-bold hover:border-white/40 hover:text-white transition-all"
                                >
                                    {c.ctaSecondary}
                                </motion.button>
                            </Link>
                        )}
                    </div>
                </FadeIn>
            </section>

            {/* ── FOOTER ── */}
            <footer className="border-t border-zinc-800 bg-zinc-900 px-6 py-8">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span className="text-[15px] font-black tracking-tighter text-white">
                        Serendipity OS
                    </span>
                    <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-600">{c.copyright}</p>
                    <div className="flex items-center gap-6">
                        <Link href="/login" className="text-[11px] font-bold uppercase tracking-widest text-zinc-600 hover:text-white transition-colors">{c.enter}</Link>
                        <Link href="/register" className="text-[11px] font-bold uppercase tracking-widest text-zinc-600 hover:text-white transition-colors">{lang === 'es' ? 'Registro' : lang === 'vn' ? 'Đăng ký' : 'Register'}</Link>
                    </div>
                </div>
            </footer>
        </div>
        </ReactLenis>
    )
}
