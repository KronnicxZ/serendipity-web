'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Activity,
    Clock,
    ShoppingCart,
    PlusCircle,
    ClipboardList,
    FlaskConical,
    ChevronRight,
    RefreshCw,
    Search,
    Menu,
    Bell,
    PlayCircle,
    CheckCircle2,
    Beaker,
    Layers,
    Save,
    AlertTriangle,
    Package,
    ChevronLeft,
    BoxSelect,
    Maximize,
    User,
    Sun,
    Moon,
    X,
    Sparkles,
    Settings,
    LogOut,
    CheckCircle,
    Plus,
    Warehouse,
    ArrowRight,
    ArrowLeft
} from 'lucide-react'
import { Card, Badge, Button, Skeleton, Input, EmptyState, StatCardSkeleton } from '@/components/ui-library'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/context/language-context'
import { LANGUAGES } from '@/components/flags'
import { useAuth } from '@/context/auth-context'

// ── Types ──────────────────────────────────────────────────
interface Chemical { id: number; name: string; category: string; unit: string; stock_kg: number; }
interface Formula { id: number; code: string; name: string; layer_count: number; }
interface FormulaLayer {
    id?: number; layer_order: number; layer_type: 'CHEMICAL' | 'MECHANICAL';
    name: string; chemical_id?: number; chemical_name?: string;
    qty_per_sf?: number; pct_in_mix?: number;
    machine?: string; temperature_c?: number; passes?: number;
}
interface ProductionOrder {
    id: number; po_number: string; sf_target: number; sf_produced: number; sf_packed: number;
    status: string; article_name: string; article_code: string; formula_name: string;
    owner: string; assigned_to: string; inventory_ok: boolean | null;
}
interface PurchaseRequest {
    id: number; type: string; item_name: string; qty_needed: number; unit: string;
    qty_in_stock: number; status: string; urgency: string; po_number: string;
}
interface BatchLayer {
    layer_order: number; layer_type: string; name: string;
    chemical_id?: number; layer_id?: number;
    qty_prepared_kg: string; qty_used_kg: string;
}
interface Shortage { name: string; type: string; needed: number; available: number; unit: string; }

type Screen =
    | 'home' | 'orders' | 'order-detail'
    | 'formula-list' | 'formula-builder'
    | 'batch' | 'inventory-check' | 'packing'
    | 'purchase-requests';

// ── Helpers ────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label_key: string, badge: 'default' | 'success' | 'warning' | 'critical', accent: string, icon: any }> = {
    PENDING: { label_key: 'common.idle', badge: 'default', accent: 'border-l-slate-500', icon: Clock },
    IN_PROGRESS: { label_key: 'common.active', badge: 'warning', accent: 'border-l-amber-500', icon: PlayCircle },
    PACKING: { label_key: 'operations.packing', badge: 'default', accent: 'border-l-blue-500', icon: BoxSelect },
    COMPLETED: { label_key: 'operations.completed', badge: 'success', accent: 'border-l-emerald-500', icon: CheckCircle2 },
    CANCELLED: { label_key: 'common.error', badge: 'critical', accent: 'border-l-red-500', icon: AlertTriangle },
};

function UserAvatar({ name }: { name: string }) {
    const initials = name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()

    const solidColors = [
        'bg-blue-600',
        'bg-purple-600',
        'bg-rose-600',
        'bg-teal-600',
        'bg-orange-600',
    ]
    const colorIdx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % solidColors.length
    const bgColor = solidColors[colorIdx]

    return (
        <div className={cn(
            'w-full h-full rounded-full flex items-center justify-center shadow-md transition-all overflow-hidden',
            bgColor
        )}>
            <span className="text-white text-[10px] sm:text-xs font-black tracking-tight leading-none text-center block w-full">{initials}</span>
        </div>
    )
}

export default function MobileLabPage() {
    const { t, language, setLanguage } = useTranslation();
    const { user, logout } = useAuth();
    const [screen, setScreen] = useState<Screen>('home');
    const [chemicals, setChemicals] = useState<Chemical[]>([]);
    const [formulas, setFormulas] = useState<Formula[]>([]);
    const [allOrders, setAllOrders] = useState<ProductionOrder[]>([]);
    const [activeOrders, setActiveOrders] = useState<ProductionOrder[]>([]);
    const [purchaseReqs, setPurchaseReqs] = useState<PurchaseRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [owner, setOwner] = useState<'Serendipity' | 'PRARA'>('Serendipity');

    // Selected PO context
    const [selectedPO, setSelectedPO] = useState<ProductionOrder | null>(null);
    const [selectedFormula, setSelectedFormula] = useState<{ id: number; layers: FormulaLayer[] } | null>(null);

    // Inventory check result
    const [checkResult, setCheckResult] = useState<{ ok: boolean; shortages: Shortage[] } | null>(null);

    // Formula builder
    const [newFormulaName, setNewFormulaName] = useState('');
    const [newFormulaDesc, setNewFormulaDesc] = useState('');
    const [builderLayers, setBuilderLayers] = useState<FormulaLayer[]>([]);

    // Batch
    const [sfProduced, setSfProduced] = useState('');
    const [batchLayers, setBatchLayers] = useState<BatchLayer[]>([]);

    // Packing
    const [sfPacked, setSfPacked] = useState('');
    const [packedBy, setPackedBy] = useState('Warehouse');

    // Theme Logic
    const toggleTheme = useCallback(() => {
        setIsDarkMode(prev => {
            const next = !prev
            const theme = next ? 'dark' : 'light'
            document.documentElement.setAttribute('data-theme', theme)
            localStorage.setItem('theme', theme)
            return next
        })
    }, [])

    useEffect(() => {
        const stored = localStorage.getItem('theme')
        if (stored) {
            setIsDarkMode(stored === 'dark')
            document.documentElement.setAttribute('data-theme', stored)
        }
    }, [])

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [cRes, fRes, aoRes, allRes, prRes] = await Promise.all([
                fetch(`/api/chemicals?owner=${owner}`),
                fetch('/api/formulas'),
                fetch('/api/production-orders?status=PENDING,IN_PROGRESS,PACKING'),
                fetch('/api/production-orders?status=PENDING,IN_PROGRESS,PACKING,COMPLETED'),
                fetch('/api/purchase-requests?status=PENDING,APPROVED'),
            ]);
            setChemicals(await cRes.json());
            setFormulas(await fRes.json());
            setActiveOrders(await aoRes.json());
            setAllOrders(await allRes.json());
            setPurchaseReqs(await prRes.json());
        } catch (e) {
            console.error("Error loading lab data", e);
        } finally {
            setLoading(false);
        }
    }, [owner]);

    useEffect(() => { load(); }, [load]);

    async function loadFormulaLayers(formulaId: number) {
        const res = await fetch(`/api/formulas/${formulaId}`);
        const data = await res.json();
        setSelectedFormula(data);
        setBatchLayers(
            data.layers
                .filter((l: FormulaLayer) => l.layer_type === 'CHEMICAL')
                .map((l: FormulaLayer) => ({
                    layer_order: l.layer_order, layer_type: l.layer_type,
                    name: l.name, chemical_id: l.chemical_id, layer_id: l.id,
                    qty_prepared_kg: '', qty_used_kg: '',
                })),
        );
    }

    async function sendToProduction(poId: number) {
        setLoading(true);
        try {
            const res = await fetch(`/api/production-orders/${poId}/send-to-production`, { method: 'POST' });
            const result = await res.json();
            setCheckResult({ ok: result.ok, shortages: result.shortages ?? [] });
            setScreen('inventory-check');
            if (result.ok) load();
        } finally {
            setLoading(false);
        }
    }

    async function submitBatch() {
        if (!sfProduced) return;
        setLoading(true);
        try {
            const res = await fetch('/api/batches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    po_id: selectedPO?.id ?? null,
                    formula_id: selectedFormula?.id ?? null,
                    sf_produced: parseFloat(sfProduced),
                    owner,
                    layers: batchLayers.map(l => ({
                        ...l,
                        qty_prepared_kg: parseFloat(l.qty_prepared_kg) || null,
                        qty_used_kg: parseFloat(l.qty_used_kg) || null,
                    })),
                }),
            });
            if (res.ok) {
                // Background sync
                fetch('/api/sheets/sync', { method: 'POST' }).catch(() => { });
                setSaved(true);
                setTimeout(() => { setSaved(false); setScreen('home'); load(); }, 2000);
            }
        } finally {
            setLoading(false);
        }
    }

    async function completePacking() {
        if (!sfPacked || !selectedPO) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/production-orders/${selectedPO.id}/complete-packing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sf_packed: parseFloat(sfPacked), packed_by: packedBy }),
            });
            if (res.ok) {
                setSaved(true);
                setTimeout(() => { setSaved(false); setScreen('orders'); load(); }, 2000);
            }
        } finally {
            setLoading(false);
        }
    }

    async function saveFormula() {
        if (!newFormulaName || !builderLayers.length) return;
        setLoading(true);
        try {
            const res = await fetch('/api/formulas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newFormulaName, description: newFormulaDesc, layers: builderLayers }),
            });
            if (res.ok) {
                setSaved(true);
                setNewFormulaName(''); setNewFormulaDesc(''); setBuilderLayers([]);
                setTimeout(() => { setSaved(false); setScreen('formula-list'); load(); }, 1500);
            }
        } finally {
            setLoading(false);
        }
    }

    async function approvePurchase(id: number) {
        await fetch('/api/purchase-requests', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: 'APPROVED', approved_by: user?.name || 'Thanh' }),
        });
        load();
    }

    function wasteInfo(layer: BatchLayer) {
        const prep = parseFloat(layer.qty_prepared_kg);
        const used = parseFloat(layer.qty_used_kg);
        if (!prep || !used || isNaN(prep) || isNaN(used)) return null;
        const waste = prep - used;
        const pct = (waste / prep) * 100;
        return { waste: waste.toFixed(3), pct: pct.toFixed(1), alert: pct > 15 };
    }

    const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

    // ── Components ──────────────────────────────────────────

    const Header = ({ title, showBack = false, onBack = () => setScreen('home') }: { title: string, showBack?: boolean, onBack?: () => void }) => (
        <header className="fixed top-0 left-0 right-0 h-16 sm:h-20 apple-blur border-b border-[var(--border)] z-[60] px-3 sm:px-4 flex items-center justify-between transition-all duration-300">
            <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                {showBack ? (
                    <Button variant="ghost" size="icon" onClick={onBack} className="!rounded-full hover:bg-[var(--secondary)] w-8 h-8 sm:w-10 sm:h-10">
                        <ChevronLeft size={18} />
                    </Button>
                ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/30 shrink-0">
                        <Activity size={18} strokeWidth={2.5} />
                    </div>
                )}
                <div className="flex flex-col min-w-0">
                    <h1 className="text-[11px] sm:text-sm font-bold tracking-tight leading-none text-[var(--foreground)] font-outfit uppercase truncate">{title}</h1>
                    <div className="hidden sm:flex items-center gap-1 mt-1">
                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[8px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest truncate">CONNECTED</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Sync Button */}
                <Button variant="ghost" size="icon" onClick={load} disabled={loading} className="!rounded-full border border-[var(--border)] bg-[var(--card)] w-8 h-8 sm:w-9 sm:h-9 shadow-sm shrink-0">
                    <RefreshCw size={16} className={cn(loading && "animate-spin text-blue-500")} />
                </Button>
...
                {/* Owner Toggle */}
                <button
                    onClick={() => setOwner(o => o === 'Serendipity' ? 'PRARA' : 'Serendipity')}
                    className={cn(
                        "h-8 sm:h-9 px-2 sm:px-3 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest border transition-all active:scale-95 shrink-0",
                        owner === 'Serendipity' 
                            ? "bg-blue-600/10 border-blue-500/30 text-blue-500" 
                            : "bg-orange-600/10 border-orange-500/30 text-orange-500"
                    )}
                >
                    {owner}
                </button>

                {/* Language Switcher */}
                <div className="relative shrink-0">
                    <button
                        onClick={() => setIsLangOpen(!isLangOpen)}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[var(--border)] bg-[var(--card)] flex items-center justify-center overflow-hidden shadow-sm active:scale-95 transition-all"
                    >
                        <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full overflow-hidden border border-white/10">
                            <currentLang.Flag />
                        </div>
                    </button>
                    <AnimatePresence>
                        {isLangOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsLangOpen(false)} />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    className="absolute right-0 mt-4 w-44 bg-[var(--card)] border border-[var(--border)] rounded-[20px] shadow-2xl z-50 overflow-hidden p-1.5"
                                >
                                    {LANGUAGES.map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => {
                                                setLanguage(lang.code as any)
                                                setIsLangOpen(false)
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[10px] font-bold uppercase tracking-wider transition-all",
                                                language === lang.code
                                                    ? "bg-blue-500/10 text-blue-500"
                                                    : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
                                            )}
                                        >
                                            <div className="w-4 h-4 rounded-full overflow-hidden border border-[var(--border)]">
                                                <lang.Flag />
                                            </div>
                                            {lang.label}
                                        </button>
                                    ))}
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                {/* Theme Toggle - Hidden on very small mobile to save space */}
                <Button variant="ghost" size="icon" onClick={toggleTheme} className="hidden sm:flex !rounded-full border border-[var(--border)] bg-[var(--card)] w-9 h-9 shadow-sm shrink-0">
                    {isDarkMode ? <Sun size={16} className="text-blue-500" /> : <Moon size={16} />}
                </Button>

                {/* User Avatar */}
                <button 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border border-[var(--border)] hover:border-blue-500/50 transition-all active:scale-95 shadow-sm shrink-0 flex items-center justify-center"
                >
                    <UserAvatar name={user?.name || 'User'} />
                </button>
            </div>

            {/* Profile Dropdown */}
            <AnimatePresence>
                {isProfileOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute right-4 top-16 w-56 bg-[var(--card)] border border-[var(--border)] rounded-[20px] shadow-2xl z-50 overflow-hidden p-1.5"
                        >
                            <div className="px-3 py-2.5 mb-1 flex items-center gap-3 border-b border-[var(--border)]/50">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-500/10 flex items-center justify-center text-blue-500 text-[10px] font-black">
                                    {user?.name?.[0].toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-[var(--foreground)] leading-none">{user?.name}</p>
                                    <p className="text-[8px] font-bold uppercase text-[var(--muted-foreground)] tracking-widest mt-1">{user?.role}</p>
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[10px] font-bold text-[var(--muted-foreground)] hover:bg-blue-500/5 hover:text-blue-500 transition-all">
                                    <Settings size={14} />
                                    {t('common.accountSettings')}
                                </button>
                                <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 transition-all">
                                    <LogOut size={14} />
                                    {t('common.logout')}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </header>
    );

    const BottomNav = () => (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-md z-50">
            <Card className="p-1.5 border-none ring-1 ring-white/5 shadow-2xl shadow-black/20 !rounded-full flex items-center justify-between apple-blur !bg-opacity-80">
                <button onClick={() => setScreen('home')} className={cn("flex-1 flex flex-col items-center gap-0.5 p-1.5 transition-all", screen === 'home' ? 'text-blue-500' : 'text-[var(--muted-foreground)]')}>
                    <Activity size={20} strokeWidth={2.5} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Dash</span>
                </button>
                <button onClick={() => setScreen('orders')} className={cn("flex-1 flex flex-col items-center gap-0.5 p-1.5 transition-all", screen === 'orders' ? 'text-blue-500' : 'text-[var(--muted-foreground)]')}>
                    <ClipboardList size={20} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Lotes</span>
                </button>
                <button 
                    onClick={() => { setScreen('batch'); setSelectedPO(null); setSelectedFormula(null); setBatchLayers([]); }} 
                    className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-600/30 active:scale-90 transition-all border-2 border-[var(--background)] mx-1"
                >
                    <Plus size={24} strokeWidth={3} />
                </button>
                <button onClick={() => setScreen('formula-list')} className={cn("flex-1 flex flex-col items-center gap-0.5 p-1.5 transition-all", screen === 'formula-list' ? 'text-blue-500' : 'text-[var(--muted-foreground)]')}>
                    <FlaskConical size={20} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Lab</span>
                </button>
                <button onClick={() => setScreen('purchase-requests')} className={cn("flex-1 flex flex-col items-center gap-0.5 p-1.5 transition-all", screen === 'purchase-requests' ? 'text-blue-500' : 'text-[var(--muted-foreground)]')}>
                    <ShoppingCart size={20} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Stock</span>
                </button>
            </Card>
        </div>
    );

    const HomeScreen = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="space-y-6 pt-4">
                <div className="space-y-2">
                    <Badge variant="success" className="bg-emerald-500/10 text-emerald-500">{t('common.systemConnected')}</Badge>
                    <h2 className="text-4xl font-bold tracking-tight font-outfit text-balance leading-[1.1]">
                        {t('common.greeting')}, {user?.name?.split(' ')[0] || 'Agente'}
                    </h2>
                    <p className="text-[var(--muted-foreground)] font-medium text-lg leading-relaxed max-w-[80%]">
                        {t('dashboard.messageOfTheDay')}
                    </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <Card glass className="p-4 flex flex-col items-center justify-center gap-2 border-none ring-1 ring-blue-500/10 shadow-xl shadow-blue-900/5 group hover:ring-blue-500/30 transition-all">
                        <span className="text-2xl font-black text-blue-500 font-outfit">{activeOrders.filter(o => o.status === 'IN_PROGRESS').length}</span>
                        <span className="text-[9px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">{t('common.active')}</span>
                    </Card>
                    <Card glass className="p-4 flex flex-col items-center justify-center gap-2 border-none ring-1 ring-amber-500/10 shadow-xl shadow-amber-900/5">
                        <span className="text-2xl font-black text-amber-500 font-outfit">{activeOrders.filter(o => o.status === 'PENDING').length}</span>
                        <span className="text-[9px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">{t('common.idle')}</span>
                    </Card>
                    <Card glass className="p-4 flex flex-col items-center justify-center gap-2 border-none ring-1 ring-rose-500/10 shadow-xl shadow-rose-900/5">
                        <span className="text-2xl font-black text-rose-500 font-outfit">{purchaseReqs.length}</span>
                        <span className="text-[9px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">{t('common.reports')}</span>
                    </Card>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4">
                <Button onClick={() => setScreen('batch')} variant="primary" className="h-16 rounded-3xl text-lg flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 border border-blue-400/20 font-outfit active:scale-95 transition-transform">
                    <Beaker size={24} />
                    {t('operations.newBatchIdentified')}
                </Button>
                <div className="grid grid-cols-2 gap-4">
                    <Button onClick={() => setScreen('orders')} variant="secondary" className="h-14 rounded-2xl flex items-center gap-3 bg-[var(--secondary)]/50 border border-[var(--border)] hover:bg-[var(--secondary)] transition-all">
                        <ClipboardList size={18} className="text-blue-500" />
                        {t('operations.batches')}
                    </Button>
                    <Button onClick={() => setScreen('formula-list')} variant="secondary" className="h-14 rounded-2xl flex items-center gap-3 bg-[var(--secondary)]/50 border border-[var(--border)] hover:bg-[var(--secondary)] transition-all">
                        <FlaskConical size={18} className="text-blue-500" />
                        {t('operations.stationDirectory')}
                    </Button>
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-xl font-bold tracking-tight font-outfit">{t('dashboard.plantActivity')}</h3>
                    <button onClick={() => setScreen('orders')} className="text-sm font-bold text-blue-500 flex items-center gap-1 group">
                        {t('common.viewAll')} <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <StatCardSkeleton key={i} />
                        ))
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {activeOrders.slice(0, 3).map((order, idx) => {
                                const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                                const StatusIcon = config.icon;
                                return (
                                    <motion.div
                                        key={order.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                    >
                                        <Card onClick={() => { setSelectedPO(order); setScreen('order-detail'); }} className={cn(
                                            "p-6 border-none border-l-4 ring-1 ring-[var(--border)] bg-[var(--card)] hover:ring-blue-500/20 transition-all cursor-pointer group shadow-sm",
                                            config.accent
                                        )}>
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-widest">{order.po_number}</span>
                                                        <Badge variant={config.badge}>{t(config.label_key)}</Badge>
                                                    </div>
                                                    <h4 className="font-bold text-xl leading-tight group-hover:text-blue-500 transition-colors font-outfit">
                                                        {order.article_name || order.formula_name}
                                                    </h4>
                                                </div>
                                                <div className={cn("p-3 rounded-2xl bg-opacity-10 shadow-inner", 
                                                    config.badge === 'success' ? 'bg-emerald-500 text-emerald-500' : 
                                                    config.badge === 'warning' ? 'bg-amber-500 text-amber-500' : 
                                                    'bg-blue-500 text-blue-500'
                                                )}>
                                                    <StatusIcon size={24} />
                                                </div>
                                            </div>
                                            
                                            <div className="mt-8 flex items-center justify-between">
                                                <div className="flex items-center gap-6 text-[var(--muted-foreground)] text-[10px] font-bold uppercase tracking-widest">
                                                    <div className="flex items-center gap-2">
                                                        <Package size={16} className="text-blue-500" />
                                                        {order.sf_target} SF
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <User size={16} />
                                                        {order.owner}
                                                    </div>
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-[var(--secondary)] flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                                                    <ChevronRight size={18} />
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    )}
                    {!loading && activeOrders.length === 0 && (
                        <Card glass className="py-20 border-dashed border-2 ring-0">
                            <EmptyState 
                                icon={ClipboardList} 
                                title={t('operations.noBatches')} 
                                description={t('operations.understood')}
                            />
                        </Card>
                    )}
                </div>
            </section>
        </div>
    );

    const OrdersScreen = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pt-4">
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={18} />
                <Input 
                    placeholder={t('common.searching')} 
                    className="pl-12 bg-[var(--secondary)]/40 border-none ring-1 ring-[var(--border)] focus:ring-2 focus:ring-blue-500/50 h-14 rounded-2xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="space-y-4">
                {allOrders
                    .filter(o => o.po_number.toLowerCase().includes(searchTerm.toLowerCase()) || o.article_name?.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((order, idx) => {
                        const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                        return (
                            <Card key={order.id} onClick={() => { setSelectedPO(order); setScreen('order-detail'); }} className={cn(
                                "p-6 border-none border-l-4 ring-1 ring-[var(--border)] bg-[var(--card)] shadow-sm hover:ring-blue-500/20 transition-all cursor-pointer",
                                config.accent
                            )}>
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-widest">{order.po_number}</span>
                                    <Badge variant={config.badge}>{t(config.label_key)}</Badge>
                                </div>
                                <h4 className="font-bold text-xl font-outfit mb-6">{order.article_name || '—'}</h4>
                                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-[var(--border)]/50 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
                                    <div className="space-y-2">
                                        <span>Target</span>
                                        <p className="text-base text-[var(--foreground)] font-outfit font-black">{order.sf_target} SF</p>
                                    </div>
                                    <div className="space-y-2 text-right">
                                        <span>Producido</span>
                                        <p className={cn("text-base font-outfit font-black", order.sf_produced > 0 ? "text-emerald-500" : "text-[var(--foreground)]")}>{order.sf_produced || 0} SF</p>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
            </div>
        </div>
    );

    const OrderDetailScreen = () => {
        if (!selectedPO) return null;
        const progress = Math.round(((selectedPO.sf_produced || 0) / selectedPO.sf_target) * 100);
        const config = STATUS_CONFIG[selectedPO.status] || STATUS_CONFIG.PENDING;

        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4">
                <Card glass className="p-8 space-y-10 border-none ring-1 ring-blue-500/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[60px] rounded-full" />
                    
                    <div className="space-y-6 relative z-10">
                        <div className="flex justify-between items-end">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">{t('dashboard.productionProgress')}</span>
                                <h3 className="text-4xl font-black text-[var(--foreground)] font-outfit">{progress}%</h3>
                            </div>
                            <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500 shadow-inner">
                                <Activity size={32} />
                            </div>
                        </div>
                        <div className="h-4 bg-blue-500/10 rounded-full overflow-hidden ring-1 ring-inset ring-blue-500/20">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, progress)}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full relative overflow-hidden"
                            >
                                <div className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
                            </motion.div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-8 pt-6 border-t border-[var(--border)]/50 relative z-10">
                        <div className="text-center space-y-2">
                            <p className="text-[10px] text-[var(--muted-foreground)] font-black uppercase tracking-widest">{t('dashboard.goal')}</p>
                            <p className="text-2xl font-black font-outfit">{selectedPO.sf_target}</p>
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest">Done</p>
                            <p className="text-2xl font-black text-amber-500 font-outfit">{selectedPO.sf_produced || 0}</p>
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">{t('operations.completed')}</p>
                            <p className="text-2xl font-black text-emerald-500 font-outfit">{selectedPO.sf_packed || 0}</p>
                        </div>
                    </div>
                </Card>

                <div className="space-y-4">
                    <Card className="p-6 flex items-center justify-between bg-[var(--secondary)]/40 border-none ring-1 ring-[var(--border)] hover:bg-[var(--secondary)] transition-all">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-widest">Fórmula Activa</p>
                            <p className="text-xl font-bold font-outfit">{selectedPO.formula_name || 'Sin asignar'}</p>
                        </div>
                        <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500 shadow-sm">
                            <FlaskConical size={28} />
                        </div>
                    </Card>

                    {selectedPO.inventory_ok !== null && (
                        <Card className={cn(
                            "p-6 flex items-center gap-5 border-none ring-1 transition-all",
                            selectedPO.inventory_ok ? "bg-emerald-500/5 ring-emerald-500/20" : "bg-rose-500/5 ring-rose-500/20"
                        )}>
                            <div className={cn("p-4 rounded-2xl shadow-inner", selectedPO.inventory_ok ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                                {selectedPO.inventory_ok ? <CheckCircle2 size={28} /> : <AlertTriangle size={28} />}
                            </div>
                            <div className="space-y-1">
                                <p className="font-black font-outfit text-lg">{selectedPO.inventory_ok ? 'Inventario OK' : 'Falta de Stock'}</p>
                                <p className="text-xs text-[var(--muted-foreground)] font-medium leading-relaxed">{selectedPO.inventory_ok ? 'Todos los materiales listos' : 'Se requiere aprobación de compra'}</p>
                            </div>
                        </Card>
                    )}
                </div>

                <div className="pt-6">
                    {selectedPO.status === 'PENDING' && (
                        <Button className="w-full h-20 rounded-[32px] text-xl font-black font-outfit shadow-2xl shadow-emerald-950/20 active:scale-95 transition-all" variant="primary" onClick={() => sendToProduction(selectedPO.id)}>
                            <PlayCircle size={28} className="mr-3" /> {t('common.connect').toUpperCase()} PLANTA
                        </Button>
                    )}
                    {selectedPO.status === 'IN_PROGRESS' && (
                        <Button className="w-full h-20 rounded-[32px] text-xl font-black font-outfit shadow-2xl shadow-blue-950/20 active:scale-95 transition-all" variant="primary" onClick={() => {
                             if (selectedFormula) setScreen('batch');
                             else { loadFormulaLayers(selectedPO.id).then(() => setScreen('batch')); }
                        }}>
                            <Beaker size={28} className="mr-3" /> {t('operations.batch').toUpperCase()}
                        </Button>
                    )}
                    {selectedPO.status === 'PACKING' && (
                        <Button className="w-full h-20 rounded-[32px] text-xl font-black font-outfit shadow-2xl shadow-purple-950/20 active:scale-95 transition-all" variant="primary" onClick={() => setScreen('packing')}>
                            <BoxSelect size={28} className="mr-3" /> {t('operations.packing').toUpperCase()}
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    const FormulaListScreen = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pt-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-bold font-outfit">Catálogo de Fórmulas</h3>
                <Button variant="ghost" size="icon" onClick={() => setScreen('formula-builder')} className="bg-emerald-500/10 text-emerald-500 rounded-xl w-12 h-12">
                    <Plus size={24} />
                </Button>
            </div>
            
            <div className="space-y-4">
                {formulas.map(f => (
                    <Card key={f.id} className="p-6 border-none ring-1 ring-[var(--border)] bg-[var(--card)] shadow-sm hover:ring-blue-500/20 transition-all cursor-pointer group">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-widest">{f.code}</span>
                                <h4 className="font-bold text-xl font-outfit group-hover:text-blue-500 transition-colors">{f.name}</h4>
                                <p className="text-xs text-[var(--muted-foreground)]">{f.layer_count} pasos definidos</p>
                            </div>
                            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                                <Layers size={20} />
                            </div>
                        </div>
                    </Card>
                ))}
                {formulas.length === 0 && <EmptyState icon={FlaskConical} title="No hay fórmulas" description="Crea tu primera fórmula para empezar." />}
            </div>
        </div>
    );

    const FormulaBuilderScreen = () => {
        const addLayer = (type: 'CHEMICAL' | 'MECHANICAL') => {
            const order = builderLayers.length + 1;
            const newLayer: FormulaLayer = type === 'CHEMICAL' 
                ? { layer_order: order, layer_type: 'CHEMICAL', name: `Químico ${order}`, chemical_id: chemicals[0]?.id, chemical_name: chemicals[0]?.name, pct_in_mix: 100, qty_per_sf: 0.01 }
                : { layer_order: order, layer_type: 'MECHANICAL', name: `Mecánico ${order}`, machine: 'Spray', passes: 1 };
            setBuilderLayers([...builderLayers, newLayer]);
        };

        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4 pb-20">
                <div className="space-y-4">
                    <Input 
                        placeholder="Nombre de la fórmula" 
                        value={newFormulaName} 
                        onChange={e => setNewFormulaName(e.target.value)}
                        className="h-16 text-lg font-bold font-outfit bg-[var(--secondary)]/40 border-none ring-1 ring-[var(--border)]"
                    />
                    <Input 
                        placeholder="Descripción (opcional)" 
                        value={newFormulaDesc} 
                        onChange={e => setNewFormulaDesc(e.target.value)}
                        className="bg-[var(--secondary)]/40 border-none ring-1 ring-[var(--border)]"
                    />
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-sm font-black uppercase tracking-widest text-[var(--muted-foreground)]">Pasos de Proceso ({builderLayers.length})</h3>
                    </div>

                    <AnimatePresence mode="popLayout">
                        {builderLayers.map((layer, idx) => (
                            <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                                <Card className="p-5 border-none ring-1 ring-[var(--border)] bg-[var(--card)] space-y-4 relative">
                                    <button onClick={() => setBuilderLayers(ls => ls.filter((_, i) => i !== idx))} className="absolute top-4 right-4 text-rose-500 p-1">
                                        <X size={18} />
                                    </button>
                                    
                                    <div className="flex items-center gap-3">
                                        <Badge variant={layer.layer_type === 'CHEMICAL' ? 'default' : 'warning'} className="uppercase font-black text-[9px] tracking-widest px-2">
                                            {layer.layer_type === 'CHEMICAL' ? 'Hóa chất' : 'Cơ học'}
                                        </Badge>
                                        <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">PASO {layer.layer_order}</span>
                                    </div>

                                    {layer.layer_type === 'CHEMICAL' ? (
                                        <div className="space-y-3">
                                            <select
                                                value={layer.chemical_id ?? ''}
                                                onChange={e => {
                                                    const chem = chemicals.find(c => c.id === Number(e.target.value));
                                                    setBuilderLayers(ls => ls.map((l, i) => i === idx ? { ...l, chemical_id: chem?.id, chemical_name: chem?.name } : l));
                                                }}
                                                className="w-full h-12 rounded-xl bg-[var(--secondary)]/50 border border-[var(--border)] px-4 text-sm font-bold appearance-none outline-none focus:ring-2 ring-blue-500/30"
                                            >
                                                <option value="">Seleccionar químico</option>
                                                {chemicals.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase ml-1">% Mezcla</label>
                                                    <Input type="number" value={layer.pct_in_mix ?? ''} onChange={e => setBuilderLayers(ls => ls.map((l, i) => i === idx ? { ...l, pct_in_mix: Number(e.target.value) } : l))} placeholder="100" className="h-12 bg-[var(--secondary)]/30" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase ml-1">kg / SF</label>
                                                    <Input type="number" value={layer.qty_per_sf ?? ''} onChange={e => setBuilderLayers(ls => ls.map((l, i) => i === idx ? { ...l, qty_per_sf: Number(e.target.value) } : l))} placeholder="0.010" className="h-12 bg-[var(--secondary)]/30" />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase ml-1">Máquina</label>
                                                <Input value={layer.machine ?? ''} onChange={e => setBuilderLayers(ls => ls.map((l, i) => i === idx ? { ...l, machine: e.target.value } : l))} placeholder="Ej: Spray" className="h-12 bg-[var(--secondary)]/30" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase ml-1">Temp °C</label>
                                                <Input type="number" value={layer.temperature_c ?? ''} onChange={e => setBuilderLayers(ls => ls.map((l, i) => i === idx ? { ...l, temperature_c: Number(e.target.value) } : l))} placeholder="80" className="h-12 bg-[var(--secondary)]/30" />
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <Button variant="secondary" onClick={() => addLayer('CHEMICAL')} className="h-14 rounded-2xl flex items-center justify-center gap-2 border-dashed border-2 bg-blue-500/5 text-blue-500 font-bold border-blue-500/20">
                            <Beaker size={18} /> + Químico
                        </Button>
                        <Button variant="secondary" onClick={() => addLayer('MECHANICAL')} className="h-14 rounded-2xl flex items-center justify-center gap-2 border-dashed border-2 bg-purple-500/5 text-purple-500 font-bold border-purple-500/20">
                            <Settings size={18} /> + Mecánico
                        </Button>
                    </div>
                </div>

                <div className="pt-8">
                    <Button 
                        onClick={saveFormula} 
                        disabled={loading || !newFormulaName || !builderLayers.length} 
                        variant="primary" 
                        className="w-full h-16 rounded-3xl text-lg font-black shadow-xl shadow-emerald-500/20 border border-emerald-400/20 transition-all"
                    >
                        {loading ? <RefreshCw size={24} className="animate-spin mr-2" /> : (saved ? <CheckCircle2 size={24} className="mr-2" /> : <Save size={24} className="mr-2" />)}
                        {saved ? 'FÓRMULA GUARDADA' : 'GUARDAR FÓRMULA'}
                    </Button>
                </div>
            </div>
        );
    };

    const BatchScreen = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4 pb-20">
            <div className="space-y-6">
                <div className="space-y-2 px-1">
                    <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">{t('operations.batches').toUpperCase()}</label>
                    <select 
                        value={selectedPO?.id ?? ''} 
                        onChange={e => {
                            const po = activeOrders.find(o => o.id === Number(e.target.value)) ?? null;
                            setSelectedPO(po);
                            if (po?.formula_name) loadFormulaLayers(po.id);
                        }}
                        className="w-full h-12 rounded-xl bg-[var(--secondary)]/50 border-none ring-1 ring-[var(--border)] px-4 text-sm font-bold appearance-none outline-none focus:ring-2 ring-blue-500/50 transition-all"
                    >
                        <option value="">— Seleccionar Orden —</option>
                        {activeOrders.filter(o => o.status === 'IN_PROGRESS').map(o => (
                            <option key={o.id} value={o.id}>{o.po_number} · {o.article_name}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2 px-1">
                    <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Fórmula de Mezcla</label>
                    <select 
                        value={selectedFormula?.id ?? ''} 
                        onChange={e => { if (e.target.value) loadFormulaLayers(Number(e.target.value)); }}
                        className="w-full h-12 rounded-xl bg-[var(--secondary)]/50 border-none ring-1 ring-[var(--border)] px-4 text-sm font-bold appearance-none outline-none focus:ring-2 ring-blue-500/50 transition-all"
                    >
                        <option value="">— Seleccionar Fórmula —</option>
                        {formulas.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                </div>

                <div className="space-y-2 px-1">
                    <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Pies Cuadrados (SF) Reales</label>
                    <Input 
                        type="number" 
                        inputMode="decimal" 
                        value={sfProduced} 
                        onChange={e => setSfProduced(e.target.value)}
                        placeholder="Ej: 520.5" 
                        className="h-16 text-2xl font-black font-outfit text-center bg-blue-500/5 border-none ring-1 ring-blue-500/20 rounded-2xl placeholder:text-blue-500/20"
                    />
                </div>
            </div>

            <AnimatePresence>
                {batchLayers.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-6">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-sm font-black uppercase tracking-widest text-[var(--muted-foreground)]">Pesaje de Químicos</h3>
                        </div>

                        <div className="space-y-4">
                            {batchLayers.map((layer, idx) => {
                                const w = wasteInfo(layer);
                                return (
                                    <Card key={idx} className={cn(
                                        "p-4 border-none ring-1 transition-all",
                                        w?.alert ? "bg-rose-500/5 ring-rose-500/30" : "bg-[var(--card)] ring-[var(--border)]"
                                    )}>
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-bold text-sm font-outfit uppercase tracking-wider">{layer.name}</h4>
                                            {w && (
                                                <Badge variant={w.alert ? 'critical' : 'success'} className="px-2 py-0.5 text-[8px] font-black">
                                                    {w.alert ? 'MERMA ALTA' : 'OK'} {w.pct}%
                                                </Badge>
                                            )}
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black text-[var(--muted-foreground)] uppercase">Preparado (kg)</label>
                                                <Input 
                                                    type="number" 
                                                    inputMode="decimal" 
                                                    value={layer.qty_prepared_kg}
                                                    onChange={e => setBatchLayers(ls => ls.map((l, i) => i === idx ? { ...l, qty_prepared_kg: e.target.value } : l))}
                                                    className="h-10 text-sm font-bold bg-[var(--secondary)]/40 border-none ring-1 ring-[var(--border)]"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black text-[var(--muted-foreground)] uppercase">Utilizado (kg)</label>
                                                <Input 
                                                    type="number" 
                                                    inputMode="decimal" 
                                                    value={layer.qty_used_kg}
                                                    onChange={e => setBatchLayers(ls => ls.map((l, i) => i === idx ? { ...l, qty_used_kg: e.target.value } : l))}
                                                    className="h-10 text-sm font-bold bg-[var(--secondary)]/40 border-none ring-1 ring-[var(--border)]"
                                                />
                                            </div>
                                        </div>
                                        {w && <p className={cn("text-[9px] font-bold uppercase tracking-widest mt-3 text-center", w.alert ? "text-rose-500" : "text-[var(--muted-foreground)]")}>Hao hụt: {w.waste} kg</p>}
                                    </Card>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="pt-10">
                <Button 
                    onClick={submitBatch} 
                    disabled={loading || !sfProduced} 
                    variant="primary" 
                    className="w-full h-20 rounded-[32px] text-xl font-black font-outfit shadow-2xl shadow-blue-600/20 active:scale-95 transition-all"
                >
                    {loading ? <RefreshCw size={28} className="animate-spin mr-3" /> : (saved ? <CheckCircle2 size={28} className="mr-3" /> : <Save size={28} className="mr-3" />)}
                    {saved ? 'LOTE REGISTRADO' : 'REGISTRAR LOTE'}
                </Button>
            </div>
        </div>
    );

    const InventoryCheckScreen = () => (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 pt-4">
            {checkResult?.ok ? (
                <Card glass className="py-20 text-center space-y-8 border-none ring-1 ring-emerald-500/20">
                    <div className="w-24 h-24 bg-emerald-500/10 rounded-[32px] flex items-center justify-center mx-auto text-emerald-500 shadow-inner">
                        <CheckCircle2 size={48} className="animate-bounce" />
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-3xl font-black font-outfit tracking-tight text-emerald-500">¡TODO LISTO!</h2>
                        <p className="text-[var(--muted-foreground)] px-10 text-lg font-medium leading-relaxed">
                            Todos los químicos y cueros necesarios están disponibles en almacén.
                        </p>
                    </div>
                    <Button onClick={() => setScreen('home')} variant="primary" className="h-16 px-10 rounded-2xl font-black uppercase tracking-widest bg-emerald-600 shadow-emerald-500/20">
                        VOLVER AL INICIO
                    </Button>
                </Card>
            ) : (
                <div className="space-y-6">
                    <Card className="p-8 text-center space-y-4 bg-rose-500/5 border-none ring-1 ring-rose-500/30">
                        <AlertTriangle size={48} className="text-rose-500 mx-auto" />
                        <h2 className="text-2xl font-black font-outfit text-rose-500 uppercase">Falta de Stock</h2>
                        <p className="text-sm text-[var(--muted-foreground)]">Se ha notificado a compras. La orden queda en espera de stock.</p>
                    </Card>

                    <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted-foreground)] px-1">Materiales Faltantes</h3>
                    
                    <div className="space-y-4">
                        {checkResult?.shortages.map((s, i) => (
                            <Card key={i} className="p-6 border-none ring-1 ring-rose-500/10 bg-[var(--card)]">
                                <div className="flex items-center justify-between mb-6">
                                    <p className="font-bold text-xl font-outfit">{s.name}</p>
                                    <Badge variant="critical" className="uppercase font-black text-[9px]">{s.type}</Badge>
                                </div>
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-[var(--muted-foreground)] uppercase">Requerido</p>
                                        <p className="text-lg font-black text-rose-500 font-outfit">{s.needed.toFixed(1)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-[var(--muted-foreground)] uppercase">Stock</p>
                                        <p className="text-lg font-black text-[var(--foreground)] font-outfit">{s.available.toFixed(1)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-[var(--muted-foreground)] uppercase">Déficit</p>
                                        <p className="text-lg font-black text-rose-500 font-outfit">{(s.needed - s.available).toFixed(1)}</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    <Button onClick={() => setScreen('purchase-requests')} className="w-full h-16 rounded-2xl bg-rose-600 text-white font-black uppercase shadow-xl shadow-rose-500/20">
                        VER SOLICITUDES DE COMPRA
                    </Button>
                </div>
            )}
        </div>
    );

    const PurchaseRequestsScreen = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pt-4 pb-20">
            {purchaseReqs.length === 0 && <EmptyState icon={ShoppingCart} title="Sin solicitudes" description="No hay pedidos de compra pendientes en este momento." />}
            
            {purchaseReqs.map(pr => (
                <Card key={pr.id} className={cn(
                    "p-6 border-none ring-1 transition-all",
                    pr.urgency === 'URGENT' ? "bg-rose-500/5 ring-rose-500/30 shadow-lg shadow-rose-900/10" : "bg-[var(--card)] ring-[var(--border)]"
                )}>
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-xl font-outfit">{pr.item_name}</h4>
                        <div className="flex gap-2">
                            {pr.urgency === 'URGENT' && <Badge variant="critical" className="font-black animate-pulse">URGENTE</Badge>}
                            <Badge variant="default" className="font-black uppercase tracking-tighter text-[9px]">{pr.type}</Badge>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 py-6 border-y border-[var(--border)]/30 text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">
                        <div className="space-y-2">
                            <span>PO Origen</span>
                            <p className="text-sm text-[var(--foreground)] font-bold">{pr.po_number || 'SISTEMA'}</p>
                        </div>
                        <div className="space-y-2 text-right">
                            <span>Falta</span>
                            <p className="text-lg text-rose-500 font-black font-outfit">{pr.qty_needed} {pr.unit}</p>
                        </div>
                    </div>

                    {pr.status === 'PENDING' && (
                        <Button onClick={() => approvePurchase(pr.id)} className="w-full h-14 mt-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase active:scale-95 transition-all">
                            APROBAR COMPRA (T. QUIN)
                        </Button>
                    )}
                    {pr.status === 'APPROVED' && (
                        <div className="mt-6 flex items-center justify-center gap-2 text-emerald-500 font-black uppercase text-xs">
                            <CheckCircle2 size={20} /> Aprobado • Procesando
                        </div>
                    )}
                </Card>
            ))}
        </div>
    );

    const PackingScreen = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4 pb-20">
            <Card glass className="p-8 text-center space-y-4 border-none ring-1 ring-purple-500/20">
                <Warehouse size={48} className="text-purple-500 mx-auto" />
                <h2 className="text-2xl font-black font-outfit uppercase">{selectedPO?.po_number}</h2>
                <p className="text-sm text-[var(--muted-foreground)] font-medium leading-relaxed">{selectedPO?.article_name}</p>
                <div className="pt-4 flex justify-center gap-8">
                    <div className="text-center">
                        <p className="text-[9px] font-black uppercase text-[var(--muted-foreground)]">Target</p>
                        <p className="text-xl font-black font-outfit">{selectedPO?.sf_target}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[9px] font-black uppercase text-[var(--muted-foreground)]">Producido</p>
                        <p className="text-xl font-black font-outfit text-emerald-500">{selectedPO?.sf_produced}</p>
                    </div>
                </div>
            </Card>

            <div className="space-y-6">
                <div className="space-y-2 px-1">
                    <label className="text-[10px] font-black text-purple-500 uppercase tracking-[0.2em]">Pies Reales Empacados (SF)</label>
                    <Input 
                        type="number" 
                        inputMode="decimal" 
                        value={sfPacked} 
                        onChange={e => setSfPacked(e.target.value)}
                        placeholder="0.0" 
                        className="h-20 text-4xl font-black font-outfit text-center bg-purple-500/5 border-none ring-1 ring-purple-500/20 rounded-3xl"
                    />
                </div>

                <div className="space-y-2 px-1">
                    <label className="text-[10px] font-black text-purple-500 uppercase tracking-[0.2em]">Responsable de Empaque</label>
                    <Input 
                        value={packedBy} 
                        onChange={e => setPackedBy(e.target.value)}
                        className="h-14 font-bold bg-[var(--secondary)]/40 border-none ring-1 ring-[var(--border)]"
                    />
                </div>

                {sfPacked && selectedPO?.sf_produced && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                        <Card className={cn(
                            "p-6 text-center border-none ring-1 transition-all",
                            Math.abs(parseFloat(sfPacked) - selectedPO.sf_produced) / selectedPO.sf_produced > 0.05 
                                ? "bg-amber-500/5 ring-amber-500/30" 
                                : "bg-emerald-500/5 ring-emerald-500/30"
                        )}>
                            <p className="text-xs font-black uppercase tracking-widest mb-1">Diferencia de Rendimiento</p>
                            <p className={cn(
                                "text-2xl font-black font-outfit",
                                Math.abs(parseFloat(sfPacked) - selectedPO.sf_produced) / selectedPO.sf_produced > 0.05 ? "text-amber-500" : "text-emerald-500"
                            )}>
                                {(parseFloat(sfPacked) - (selectedPO?.sf_produced ?? 0)).toFixed(1)} SF
                                <span className="text-sm ml-2 opacity-60">
                                    ({(((parseFloat(sfPacked) - (selectedPO?.sf_produced ?? 0)) / (selectedPO?.sf_produced ?? 1)) * 100).toFixed(1)}%)
                                </span>
                            </p>
                        </Card>
                    </motion.div>
                )}
            </div>

            <div className="pt-6">
                <Button 
                    onClick={completePacking} 
                    disabled={loading || !sfPacked} 
                    className="w-full h-20 rounded-[32px] text-xl font-black font-outfit bg-purple-600 shadow-2xl shadow-purple-950/20 active:scale-95 transition-all"
                >
                    {loading ? <RefreshCw size={28} className="animate-spin mr-3" /> : (saved ? <CheckCircle2 size={28} className="mr-3" /> : <Warehouse size={28} className="mr-3" />)}
                    {saved ? 'ORDEN FINALIZADA' : 'CONFIRMAR EMPAQUE'}
                </Button>
            </div>
        </div>
    );

    // ── Main Layout ──────────────────────────────────────────

    const getScreenConfig = () => {
        switch (screen) {
            case 'home': return { title: 'SERENDIPITY LAB', showBack: false };
            case 'orders': return { title: t('operations.batches'), showBack: true };
            case 'order-detail': return { title: selectedPO?.po_number || 'DETALLE', showBack: true, onBack: () => setScreen('orders') };
            case 'formula-list': return { title: 'CATÁLOGO FÓRMULAS', showBack: true };
            case 'formula-builder': return { title: 'NUEVA FÓRMULA', showBack: true, onBack: () => setScreen('formula-list') };
            case 'batch': return { title: 'PEDIDO AL LAB', showBack: true };
            case 'inventory-check': return { title: 'INVENTARIO', showBack: true, onBack: () => setScreen('order-detail') };
            case 'purchase-requests': return { title: 'STOCK REQUERIDO', showBack: true };
            case 'packing': return { title: 'FINALIZAR PRODUCCIÓN', showBack: true, onBack: () => setScreen('order-detail') };
            default: return { title: String(screen).toUpperCase(), showBack: true };
        }
    }

    const config = getScreenConfig();

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-blue-500/30 overflow-x-hidden transition-colors duration-500">
            <Header {...config} />

            <main className="p-4 sm:p-6 pt-20 sm:pt-24 pb-44 max-w-lg mx-auto relative z-10">
                {screen === 'home' && <HomeScreen />}
                {screen === 'orders' && <OrdersScreen />}
                {screen === 'order-detail' && <OrderDetailScreen />}
                {screen === 'formula-list' && <FormulaListScreen />}
                {screen === 'formula-builder' && <FormulaBuilderScreen />}
                {screen === 'batch' && <BatchScreen />}
                {screen === 'inventory-check' && <InventoryCheckScreen />}
                {screen === 'purchase-requests' && <PurchaseRequestsScreen />}
                {screen === 'packing' && <PackingScreen />}
            </main>

            <BottomNav />
            
            {/* Global Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-600/10 blur-[140px] rounded-full dark:bg-blue-500/5" />
                <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-indigo-600/10 blur-[140px] rounded-full dark:bg-indigo-500/5" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] dark:opacity-[0.05] mix-blend-overlay" />
            </div>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
                .font-outfit { font-family: 'Outfit', sans-serif; }
                
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }
                
                .apple-blur {
                    backdrop-filter: blur(20px) saturate(180%);
                    -webkit-backdrop-filter: blur(20px) saturate(180%);
                    background-color: var(--header-bg, rgba(255, 255, 255, 0.7));
                }
                
                [data-theme='dark'] .apple-blur {
                    background-color: rgba(15, 23, 42, 0.8);
                }
            `}</style>
        </div>
    );
}
