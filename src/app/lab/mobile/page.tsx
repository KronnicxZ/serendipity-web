'use client'

import { useState, useEffect, useCallback } from 'react'
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
    User
} from 'lucide-react'
import { Card, Badge, Button, Skeleton, Input, EmptyState } from '@/components/ui-library'
import { cn } from '@/lib/utils'

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

type Screen =
    | 'home' | 'orders' | 'order-detail'
    | 'formula-list' | 'formula-builder'
    | 'batch' | 'inventory-check' | 'packing'
    | 'purchase-requests';

// ── Helpers ────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string, badge: 'default' | 'success' | 'warning' | 'critical', accent: string, icon: any }> = {
    PENDING: { label: 'Pendiente', badge: 'default', accent: 'border-l-slate-500', icon: Clock },
    IN_PROGRESS: { label: 'En Progreso', badge: 'warning', accent: 'border-l-amber-500', icon: PlayCircle },
    PACKING: { label: 'Empacando', badge: 'default', accent: 'border-l-blue-500', icon: BoxSelect },
    COMPLETED: { label: 'Completado', badge: 'success', accent: 'border-l-emerald-500', icon: CheckCircle2 },
    CANCELLED: { label: 'Cancelado', badge: 'critical', accent: 'border-l-red-500', icon: AlertTriangle },
};

export default function MobileLabPage() {
    const [screen, setScreen] = useState<Screen>('home');
    const [chemicals, setChemicals] = useState<Chemical[]>([]);
    const [formulas, setFormulas] = useState<Formula[]>([]);
    const [allOrders, setAllOrders] = useState<ProductionOrder[]>([]);
    const [activeOrders, setActiveOrders] = useState<ProductionOrder[]>([]);
    const [purchaseReqs, setPurchaseReqs] = useState<PurchaseRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [owner, setOwner] = useState<'Serendipity' | 'PRARA'>('Serendipity');
    const [searchTerm, setSearchTerm] = useState('');

    // Selected PO context
    const [selectedPO, setSelectedPO] = useState<ProductionOrder | null>(null);

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

    // ── Screen Rendering ──────────────────────────────────────

    const Header = ({ title, subtitle, showBack = false, onBack = () => setScreen('home') }: { title: string, subtitle?: string, showBack?: boolean, onBack?: () => void }) => (
        <header className="sticky top-0 z-50 apple-blur border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                {showBack ? (
                    <Button variant="ghost" size="icon" onClick={onBack} className="mr-1">
                        <ChevronLeft size={24} />
                    </Button>
                ) : (
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                        <Activity size={20} strokeWidth={2.5} />
                    </div>
                )}
                <div>
                    <h1 className="text-lg font-bold leading-none tracking-tight font-outfit">{title}</h1>
                    {subtitle && <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">{subtitle}</p>}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={load} className="rounded-full">
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </Button>
                <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 p-0.5">
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-[12px] font-bold text-white">
                        T
                    </div>
                </div>
            </div>
        </header>
    );

    const BottomNav = () => (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-md z-50">
            <Card glass className="p-2 border-none ring-1 ring-white/10 shadow-2xl shadow-black/40 !rounded-[24px] flex items-center justify-between">
                <button onClick={() => setScreen('home')} className={cn("flex-1 flex flex-col items-center gap-1 p-2 transition-all", screen === 'home' ? 'text-blue-500' : 'text-[var(--muted-foreground)]')}>
                    <Activity size={24} strokeWidth={2.5} />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Dash</span>
                </button>
                <button onClick={() => setScreen('orders')} className={cn("flex-1 flex flex-col items-center gap-1 p-2 transition-all", screen === 'orders' ? 'text-blue-500' : 'text-[var(--muted-foreground)]')}>
                    <ClipboardList size={22} />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Órdenes</span>
                </button>
                <button onClick={() => setScreen('batch')} className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/30 -mt-8 border-4 border-[var(--background)] active:scale-95 transition-all">
                    <PlusCircle size={28} />
                </button>
                <button onClick={() => setScreen('formula-list')} className={cn("flex-1 flex flex-col items-center gap-1 p-2 transition-all", screen === 'formula-list' ? 'text-blue-500' : 'text-[var(--muted-foreground)]')}>
                    <FlaskConical size={22} />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Lab</span>
                </button>
                <button onClick={() => setScreen('purchase-requests')} className={cn("flex-1 flex flex-col items-center gap-1 p-2 transition-all", screen === 'purchase-requests' ? 'text-blue-500' : 'text-[var(--muted-foreground)]')}>
                    <ShoppingCart size={22} />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Compras</span>
                </button>
            </Card>
        </div>
    );

    // ── Screens ──────────────────────────────────────────────

    const StatCardSkeleton = () => (
        <Card glass className="p-5 border-none ring-1 ring-[var(--border)] bg-[var(--card)] animate-pulse">
            <div className="flex justify-between items-start">
                <div className="space-y-3 w-full">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-5 w-20" />
                    </div>
                    <Skeleton className="h-6 w-3/4" />
                </div>
                <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
            <div className="mt-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-5 w-5 rounded-full" />
            </div>
        </Card>
    );

    const HomeScreen = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="space-y-6">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight font-outfit">Xin chào, Thanh 👋</h2>
                    <div className="flex items-center gap-2">
                        <Badge variant="success">Sistema Online</Badge>
                        <p className="text-[var(--muted-foreground)] font-medium text-sm">Laboratorio Serendipity</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <Card glass className="p-4 flex flex-col items-center justify-center gap-2 border-none ring-1 ring-blue-500/10 shadow-xl shadow-blue-900/5 group hover:ring-blue-500/30 transition-all">
                        <span className="text-2xl font-black text-blue-500 font-outfit">{activeOrders.filter(o => o.status === 'IN_PROGRESS').length}</span>
                        <span className="text-[9px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Activas</span>
                    </Card>
                    <Card glass className="p-4 flex flex-col items-center justify-center gap-2 border-none ring-1 ring-amber-500/10 shadow-xl shadow-amber-900/5">
                        <span className="text-2xl font-black text-amber-500 font-outfit">{activeOrders.filter(o => o.status === 'PENDING').length}</span>
                        <span className="text-[9px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Pendientes</span>
                    </Card>
                    <Card glass className="p-4 flex flex-col items-center justify-center gap-2 border-none ring-1 ring-rose-500/10 shadow-xl shadow-rose-900/5">
                        <span className="text-2xl font-black text-rose-500 font-outfit">{purchaseReqs.length}</span>
                        <span className="text-[9px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Compras</span>
                    </Card>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4">
                <Button onClick={() => setScreen('batch')} variant="primary" className="h-16 rounded-2xl text-lg flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 border border-blue-400/20 font-outfit">
                    <Beaker size={24} />
                    Nuevo lote / Lô mới
                </Button>
                <div className="grid grid-cols-2 gap-4">
                    <Button onClick={() => setScreen('orders')} variant="secondary" className="h-14 rounded-2xl flex items-center gap-3 bg-[var(--secondary)]/50 border border-[var(--border)]">
                        <ClipboardList size={18} className="text-blue-500" />
                        Órdenes
                    </Button>
                    <Button onClick={() => setScreen('formula-list')} variant="secondary" className="h-14 rounded-2xl flex items-center gap-3 bg-[var(--secondary)]/50 border border-[var(--border)]">
                        <FlaskConical size={18} className="text-blue-500" />
                        Fórmulas
                    </Button>
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-xl font-bold tracking-tight font-outfit">Producción de Hoy</h3>
                    <button onClick={() => setScreen('orders')} className="text-sm font-bold text-blue-500 flex items-center gap-1">
                        Ver todas <ChevronRight size={16} />
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
                                            "p-5 border-none border-l-4 ring-1 ring-[var(--border)] bg-[var(--card)] hover:ring-blue-500/20 transition-all cursor-pointer group shadow-sm",
                                            config.accent
                                        )}>
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-widest">{order.po_number}</span>
                                                        <Badge variant={config.badge}>{config.label}</Badge>
                                                    </div>
                                                    <h4 className="font-bold text-lg leading-tight group-hover:text-blue-500 transition-colors font-outfit">
                                                        {order.article_name || order.formula_name}
                                                    </h4>
                                                </div>
                                                <div className={cn("p-2 rounded-xl bg-opacity-10 shadow-inner", 
                                                    config.badge === 'success' ? 'bg-emerald-500 text-emerald-500' : 
                                                    config.badge === 'warning' ? 'bg-amber-500 text-amber-500' : 
                                                    'bg-blue-500 text-blue-500'
                                                )}>
                                                    <StatusIcon size={20} />
                                                </div>
                                            </div>
                                            
                                            <div className="mt-6 flex items-center justify-between">
                                                <div className="flex items-center gap-4 text-[var(--muted-foreground)] text-[10px] font-bold uppercase tracking-wider">
                                                    <div className="flex items-center gap-1.5">
                                                        <Package size={14} className="text-blue-500" />
                                                        {order.sf_target} SF
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <User size={14} />
                                                        {order.owner}
                                                    </div>
                                                </div>
                                                <ChevronRight size={20} className="text-[var(--border)] group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </Card>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    )}
                    {!loading && activeOrders.length === 0 && (
                        <Card glass className="py-12 border-dashed border-2">
                            <EmptyState 
                                icon={ClipboardList} 
                                title="No hay órdenes activas" 
                                description="Todo está al día en la planta. ¡Buen trabajo!"
                            />
                        </Card>
                    )}
                </div>
            </section>
        </div>
    );

    const OrdersScreen = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={18} />
                <Input 
                    placeholder="Buscar por PO o Artículo..." 
                    className="pl-12 bg-[var(--secondary)]/40 border-none ring-1 ring-[var(--border)] focus:ring-2 focus:ring-blue-500/50"
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
                                "p-5 border-none border-l-4 ring-1 ring-[var(--border)] bg-[var(--card)] shadow-sm",
                                config.accent
                            )}>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-widest">{order.po_number}</span>
                                    <Badge variant={config.badge}>{config.label}</Badge>
                                </div>
                                <h4 className="font-bold text-lg font-outfit mb-4">{order.article_name || '—'}</h4>
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]/50 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
                                    <div className="space-y-1">
                                        <span>Target</span>
                                        <p className="text-sm text-[var(--foreground)]">{order.sf_target} SF</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <span>Producido</span>
                                        <p className={cn("text-sm", order.sf_produced > 0 ? "text-emerald-500" : "text-[var(--foreground)]")}>{order.sf_produced || 0} SF</p>
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
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card glass className="p-8 space-y-8 border-none ring-1 ring-blue-500/10">
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Progreso Real</span>
                            <span className="text-3xl font-black text-[var(--foreground)] font-outfit">{progress}%</span>
                        </div>
                        <div className="h-3 bg-blue-500/10 rounded-full overflow-hidden ring-1 ring-inset ring-blue-500/20">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, progress)}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="h-full bg-blue-500 rounded-full relative overflow-hidden"
                            >
                                <div className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
                            </motion.div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 pt-4 border-t border-[var(--border)]/50">
                        <div className="text-center space-y-1">
                            <p className="text-[9px] text-[var(--muted-foreground)] font-black uppercase tracking-widest">Meta</p>
                            <p className="text-lg font-bold font-outfit">{selectedPO.sf_target}</p>
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest">Hecho</p>
                            <p className="text-lg font-bold text-amber-500 font-outfit">{selectedPO.sf_produced || 0}</p>
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">Empacado</p>
                            <p className="text-lg font-bold text-emerald-500 font-outfit">{selectedPO.sf_packed || 0}</p>
                        </div>
                    </div>
                </Card>

                <div className="space-y-4">
                    <Card className="p-6 flex items-center justify-between bg-[var(--secondary)]/40 border-none ring-1 ring-[var(--border)]">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest">Fórmula Activa</p>
                            <p className="text-lg font-bold font-outfit">{selectedPO.formula_name || 'Sin asignar'}</p>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                            <FlaskConical size={24} />
                        </div>
                    </Card>

                    {selectedPO.inventory_ok !== null && (
                        <Card className={cn(
                            "p-6 flex items-center gap-4 border-none ring-1",
                            selectedPO.inventory_ok ? "bg-emerald-500/5 ring-emerald-500/20" : "bg-rose-500/5 ring-rose-500/20"
                        )}>
                            <div className={cn("p-3 rounded-2xl", selectedPO.inventory_ok ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                                {selectedPO.inventory_ok ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                            </div>
                            <div>
                                <p className="font-bold font-outfit">{selectedPO.inventory_ok ? 'Inventario Disponible' : 'Falta de Stock'}</p>
                                <p className="text-xs text-[var(--muted-foreground)]">{selectedPO.inventory_ok ? 'Todos los materiales listos' : 'Se requiere aprobación de compra'}</p>
                            </div>
                        </Card>
                    )}
                </div>

                <div className="pt-4">
                    {selectedPO.status === 'PENDING' && (
                        <Button className="w-full h-16 rounded-[24px] text-xl font-bold font-outfit shadow-xl shadow-emerald-950/20" variant="primary">
                            <PlayCircle size={24} className="mr-3" /> ENVIAR A PLANTA
                        </Button>
                    )}
                    {selectedPO.status === 'IN_PROGRESS' && (
                        <Button className="w-full h-16 rounded-[24px] text-xl font-bold font-outfit shadow-xl shadow-blue-950/20" variant="primary" onClick={() => setScreen('batch')}>
                            <Beaker size={24} className="mr-3" /> EJECUTAR LOTE
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    // ── Main Render ──────────────────────────────────────────

    const getScreenConfig = () => {
        switch (screen) {
            case 'home': return { title: 'SERENDIPITY LAB', subtitle: 'Mobile Access', showBack: false };
            case 'orders': return { title: 'ÓRDENES', subtitle: 'Producción Total', showBack: true };
            case 'order-detail': return { title: selectedPO?.po_number || 'DETALLE', subtitle: 'Estado de Orden', showBack: true, onBack: () => setScreen('orders') };
            case 'formula-list': return { title: 'FÓRMULAS', subtitle: 'Base de Datos', showBack: true };
            case 'purchase-requests': return { title: 'COMPRAS', subtitle: 'Solicitudes', showBack: true };
            default: return { title: screen.toUpperCase(), subtitle: 'Laboratory', showBack: true };
        }
    }

    const config = getScreenConfig();

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-blue-500/30 overflow-x-hidden">
            <Header {...config} />

            <main className="p-6 pb-40 max-w-lg mx-auto">
                {screen === 'home' && <HomeScreen />}
                {screen === 'orders' && <OrdersScreen />}
                {screen === 'order-detail' && <OrderDetailScreen />}
                {/* Simplified placeholders for other screens to keep it responsive */}
                {['batch', 'formula-list', 'formula-builder', 'purchase-requests', 'inventory-check', 'packing'].includes(screen) && screen !== 'home' && screen !== 'orders' && screen !== 'order-detail' && (
                    <Card glass className="py-20 text-center space-y-6">
                        <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto text-blue-500">
                            <FlaskConical size={40} />
                        </div>
                        <h2 className="text-2xl font-bold font-outfit">Módulo en Desarrollo</h2>
                        <p className="text-[var(--muted-foreground)] px-8">Estamos migrando este módulo al nuevo diseño premium. Estará listo en breve.</p>
                        <Button onClick={() => setScreen('home')} variant="secondary">Volver al Inicio</Button>
                    </Card>
                )}
            </main>

            <BottomNav />
            
            {/* Global Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-[-1] opacity-40">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full" />
            </div>
        </div>
    );
}
