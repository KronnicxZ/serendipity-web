'use client'

import { useState } from 'react'
import { Card, Button, Input, Badge } from '@/components/ui-library'
import { Settings, Bell, Globe, Lock, Shield, UserCheck, ShieldAlert, Cpu, Database, Mail, MessageSquare, Clock, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/context/language-context'

import { useSettings } from '@/hooks/use-settings'
import { useUsers } from '@/hooks/use-users'
import { toast } from 'sonner'
import { BiometricSettings } from '@/components/settings/biometric-settings'

import { useAuth } from '@/context/auth-context'

export default function ConfiguracionPage() {
    const { t } = useTranslation()
    const { settings, updateSettings, updateNestedSetting } = useSettings()
    const { users, loading: loadingUsers, updateUserRole, createUser, deleteUser } = useUsers()
    const { user: currentUser } = useAuth()
    const isAdmin = currentUser?.role === 'ADMIN'
    const [activeTab, setActiveTab] = useState(isAdmin ? 'GLOBAL' : 'SECURITY')
    
    // User Creation State
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'OPERATIVO' })
    const [isCreating, setIsCreating] = useState(false)

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsCreating(true)
        const res = await createUser(newUser)
        setIsCreating(false)
        if (res.success) {
            toast.success(t('temple.userCreated'))
            setShowCreateForm(false)
            setNewUser({ name: '', email: '', password: '', role: 'OPERATIVO' })
        } else {
            toast.error(res.error || "Error")
        }
    }

    const handleDeleteUser = async (userId: string) => {
        if (!confirm(t('temple.confirmDelete'))) return
        const res = await deleteUser(userId)
        if (res.success) toast.success(t('temple.userDeleted'))
        else toast.error(res.error || "Error")
    }

    const handleSave = () => {
        toast.success(t('common.success'), {
            description: t('temple.updatedSuccess')
        })
    }

    const allTabs = [
        { id: 'GLOBAL', n: t('temple.globalParams'), i: Globe, adminOnly: true },
        { id: 'NOTIF', n: t('temple.notifications'), i: Bell, adminOnly: false },
        { id: 'SECURITY', n: t('temple.security'), i: Shield, adminOnly: false },
        { id: 'ROLES', n: t('temple.roles'), i: Lock, adminOnly: true },
        { id: 'USERS', n: t('common.permissions'), i: UserCheck, adminOnly: true },
    ]
    
    const tabs = allTabs.filter(tab => !tab.adminOnly || isAdmin)

    return (
        <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-2">
                    <Badge variant="default" className="mb-2">{t('common.parametrization')}</Badge>
                    <h1 className="text-3xl lg:text-[36px] font-semibold tracking-tight text-[var(--foreground)] leading-tight">
                        {t('temple.title')}
                    </h1>
                    <p className="text-[var(--muted-foreground)] text-lg font-medium transition-colors">{t('temple.subtitle')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-4 space-y-3">
                    {tabs.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={cn(
                                "w-full flex items-center justify-between p-5 rounded-[20px] transition-all font-bold text-[15px] border border-transparent",
                                activeTab === item.id ? "bg-[var(--card)] shadow-sm ring-1 ring-[var(--border)] text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <item.i size={20} />
                                {item.n}
                            </div>
                            {activeTab === item.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                        </button>
                    ))}
                </div>

                <Card className="lg:col-span-8 p-10 space-y-12 border-none ring-1 ring-[var(--border)] shadow-sm">
                    {activeTab === 'GLOBAL' && (
                        <section className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="space-y-8">
                                <div className="flex items-center gap-3">
                                    <Settings className="text-[var(--muted-foreground)]" size={20} />
                                    <h3 className="font-bold text-xl tracking-tight text-[var(--foreground)]">{t('common.sophia')}</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-[0.2em] ml-1">{t('temple.productionGoal')}</label>
                                        <Input
                                            type="number"
                                            value={settings.productionGoal}
                                            onChange={(e) => updateSettings({ productionGoal: Number(e.target.value) })}
                                            className="h-14 !rounded-[16px] border border-[var(--border)] bg-[var(--secondary)]/50 focus:bg-[var(--card)] transition-all font-bold text-lg"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-[0.2em] ml-1">{t('temple.criticalCashThreshold')}</label>
                                        <Input
                                            type="number"
                                            value={settings.criticalCashThreshold}
                                            onChange={(e) => updateSettings({ criticalCashThreshold: Number(e.target.value) })}
                                            className="h-14 !rounded-[16px] border border-[var(--border)] bg-[var(--secondary)]/50 focus:bg-[var(--card)] transition-all font-bold text-lg"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6 pt-6 border-t border-[var(--border)]">
                                <h4 className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-[0.2em]">{t('temple.activeEngines')}</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button
                                        onClick={() => updateSettings({ reinvestmentLogicEnabled: !settings.reinvestmentLogicEnabled })}
                                        className={cn(
                                            "p-4 rounded-xl border transition-all flex items-center gap-4 text-left w-full",
                                            settings.reinvestmentLogicEnabled ? "bg-amber-500/10 border-amber-500/20" : "bg-[var(--secondary)]/30 border-[var(--border)] opacity-60"
                                        )}
                                    >
                                        <Cpu size={20} className={settings.reinvestmentLogicEnabled ? "text-amber-500" : "text-[var(--muted-foreground)]"} />
                                        <div>
                                            <p className="text-sm font-bold">{t('temple.reinvestmentLogic')}</p>
                                            <p className="text-[10px] text-[var(--muted-foreground)] font-medium">{t('temple.frequency')}: 24h</p>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => updateSettings({ hybridRedundancyEnabled: !settings.hybridRedundancyEnabled })}
                                        className={cn(
                                            "p-4 rounded-xl border transition-all flex items-center gap-4 text-left w-full",
                                            settings.hybridRedundancyEnabled ? "bg-emerald-500/10 border-emerald-500/20" : "bg-[var(--secondary)]/30 border-[var(--border)] opacity-60"
                                        )}
                                    >
                                        <Database size={20} className={settings.hybridRedundancyEnabled ? "text-emerald-500" : "text-[var(--muted-foreground)]"} />
                                        <div>
                                            <p className="text-sm font-bold">{t('temple.hybridRedundancy')}</p>
                                            <p className="text-[10px] text-[var(--muted-foreground)] font-medium">{t('temple.status')}: {settings.hybridRedundancyEnabled ? t('common.synchronized') : t('common.disconnected')}</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </section>
                    )}

                    {activeTab === 'NOTIF' && (
                        <section className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="space-y-8">
                                <div className="flex items-center gap-3">
                                    <Bell className="text-[var(--muted-foreground)]" size={20} />
                                    <h3 className="font-bold text-xl tracking-tight text-[var(--foreground)]">{t('temple.alertChannels')}</h3>
                                </div>
                                <div className="space-y-4">
                                    {[
                                        { n: 'Slack (Anthropos-Alerts)', i: MessageSquare, s: settings.notifications.slack, desc: t('temple.slackDesc') },
                                        { n: t('temple.adminEmail'), i: Mail, s: settings.notifications.email, desc: t('temple.adminEmailDesc') },
                                        { n: t('temple.pushNotifications'), i: Bell, s: settings.notifications.push, desc: t('temple.pushNotificationsDesc') },
                                    ].map(ch => (
                                        <div key={ch.n} className="flex items-center justify-between p-6 rounded-[20px] bg-[var(--secondary)]/30 border border-[var(--border)] transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-[var(--card)] rounded-xl border border-[var(--border)]">
                                                    <ch.i size={20} className={ch.s ? "text-blue-500" : "text-[var(--muted-foreground)]"} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold">{ch.n}</p>
                                                    <p className="text-xs text-[var(--muted-foreground)]">{ch.desc}</p>
                                                </div>
                                            </div>
                                            <Button
                                                variant={ch.s ? "secondary" : "ghost"}
                                                size="sm"
                                                className="font-bold"
                                                onClick={() => {
                                                    const key = ch.n.includes('Slack') ? 'slack' : ch.n.includes('Mail') || ch.n.includes('Email') ? 'email' : 'push';
                                                    updateNestedSetting('notifications', { [key]: !ch.s });
                                                }}
                                            >
                                                {ch.s ? t('common.active') : t('common.connect')}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}

                    {activeTab === 'SECURITY' && (
                        <section className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="space-y-8">
                                <div className="flex items-center gap-3">
                                    <ShieldAlert className="text-[var(--muted-foreground)]" size={20} />
                                    <h3 className="font-bold text-xl tracking-tight text-[var(--foreground)]">{t('temple.dataProtection')}</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <Card glass className="p-6 space-y-4 border-white/5">
                                        <Lock size={20} className="text-amber-500" />
                                        <h4 className="font-bold text-sm">{t('temple.twoFactorAuth')}</h4>
                                        <p className="text-xs text-[var(--muted-foreground)]">{t('temple.twoFactorAuthDesc')}</p>
                                        <Badge variant="success">{t('common.enabled')}</Badge>
                                    </Card>
                                    <Card glass className="p-6 space-y-4 border-white/5">
                                        <Clock size={20} className="text-blue-500" />
                                        <h4 className="font-bold text-sm">{t('temple.sessionTime')}</h4>
                                        <p className="text-xs text-[var(--muted-foreground)]">{t('temple.sessionTimeDesc')}</p>
                                        <span className="text-sm font-bold">45 {t('common.minutes')}</span>
                                    </Card>
                                </div>
                                <div className="pt-4 border-t border-[var(--border)]">
                                    <BiometricSettings />
                                </div>
                            </div>
                        </section>
                    )}

                    {activeTab === 'ROLES' && (
                        <section className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="space-y-8">
                                <div className="flex items-center gap-3">
                                    <UserCheck className="text-[var(--muted-foreground)]" size={20} />
                                    <h3 className="font-bold text-xl tracking-tight text-[var(--foreground)]">{t('temple.hierarchy')}</h3>
                                </div>
                                <div className="space-y-4">
                                    {[
                                        { r: 'ADMIN', n: t('temple.supremeAdmin'), desc: t('temple.supremeAdminDesc'), c: 'emerald' },
                                        { r: 'SUPERVISOR', n: t('temple.flowManager'), desc: t('temple.flowManagerDesc'), c: 'amber' },
                                        { r: 'OPERATIVO', n: t('temple.plantAgent'), desc: t('temple.plantAgentDesc'), c: 'blue' },
                                    ].map(role => (
                                        <div key={role.r} className="p-6 rounded-[20px] bg-[var(--secondary)]/30 border border-[var(--border)] flex items-center justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-black tracking-widest">{role.r}</span>
                                                    <span className="text-xs font-medium text-[var(--muted-foreground)]">— {role.n}</span>
                                                </div>
                                                <p className="text-xs text-[var(--muted-foreground)]">{role.desc}</p>
                                            </div>
                                            <Button variant="ghost" size="sm" className="font-bold border border-[var(--border)]">{t('common.permissions')}</Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}
                    {activeTab === 'USERS' && (
                        <section className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="space-y-8">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-xl tracking-tight text-[var(--foreground)]">{t('common.permissions')}</h3>
                                        <Button 
                                            variant={showCreateForm ? "ghost" : "primary"} 
                                            size="sm" 
                                            onClick={() => setShowCreateForm(!showCreateForm)}
                                        >
                                            {showCreateForm ? t('common.backToStart') : t('temple.createUser')}
                                        </Button>
                                    </div>
                                </div>

                                {showCreateForm && (
                                    <form onSubmit={handleCreateUser} className="p-8 rounded-[24px] bg-blue-500/5 border border-blue-500/20 space-y-6 animate-in fade-in zoom-in-95 duration-300">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase tracking-wider ml-1 text-[var(--muted-foreground)]">{t('auth.nameLabel')}</label>
                                                <Input 
                                                    required 
                                                    value={newUser.name} 
                                                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                                                    placeholder="Ej. Juan Pérez"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase tracking-wider ml-1 text-[var(--muted-foreground)]">{t('auth.emailLabel')}</label>
                                                <Input 
                                                    required 
                                                    type="email" 
                                                    value={newUser.email} 
                                                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                                                    placeholder="juan@serendipity.com"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase tracking-wider ml-1 text-[var(--muted-foreground)]">{t('auth.password')}</label>
                                                <Input 
                                                    required 
                                                    type="password" 
                                                    value={newUser.password} 
                                                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase tracking-wider ml-1 text-[var(--muted-foreground)]">{t('auth.authority')}</label>
                                                <select 
                                                    className="w-full h-[46px] bg-[var(--secondary)] border border-[var(--border)] rounded-[12px] px-4 text-sm font-bold"
                                                    value={newUser.role}
                                                    onChange={e => setNewUser({...newUser, role: e.target.value})}
                                                >
                                                    <option value="ADMIN">ADMIN</option>
                                                    <option value="SUPERVISOR">SUPERVISOR</option>
                                                    <option value="OPERATIVO">OPERATIVO</option>
                                                </select>
                                            </div>
                                        </div>
                                        <Button type="submit" className="w-full h-12" isLoading={isCreating}>
                                            {t('temple.addUser')}
                                        </Button>
                                    </form>
                                )}

                                <div className="space-y-4">
                                    {loadingUsers ? (
                                        <div className="space-y-4">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="h-16 rounded-xl bg-[var(--secondary)]/20 animate-pulse" />
                                            ))}
                                        </div>
                                    ) : (
                                        users.map(user => (
                                            <div key={user.id} className="p-6 rounded-[20px] bg-[var(--secondary)]/30 border border-[var(--border)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className="font-bold text-[var(--foreground)]">{user.name}</p>
                                                        <p className="text-xs text-[var(--muted-foreground)]">{user.email}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full lg:w-auto">
                                                    <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl mr-2">
                                                        {(['ADMIN', 'SUPERVISOR', 'OPERATIVO'] as const).map(role => (
                                                            <button
                                                                key={role}
                                                                className={cn(
                                                                    "text-[10px] h-7 px-2.5 rounded-lg font-bold transition-all",
                                                                    user.role === role 
                                                                        ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm ring-1 ring-black/5" 
                                                                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                                                )}
                                                                onClick={async () => {
                                                                    if (user.id === currentUser?.id) {
                                                                        toast.error("No puedes cambiar tu propio rol");
                                                                        return;
                                                                    }
                                                                    const res = await updateUserRole(user.id, role);
                                                                    if (res.success) toast.success("Rol actualizado");
                                                                    else toast.error("Error al actualizar");
                                                                }}
                                                            >
                                                                {role}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    
                                                    {user.id !== currentUser?.id && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={() => handleDeleteUser(user.id)}
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    <section className="pt-10 border-t border-[var(--border)] flex flex-col sm:flex-row justify-end gap-4">
                        <Button variant="ghost" className="px-8 font-bold text-[var(--muted-foreground)] w-full sm:w-auto h-12 sm:h-auto hover:text-[var(--foreground)]">{t('temple.reset')}</Button>
                        <Button
                            className="px-6 sm:px-12 py-4 min-h-[56px] h-auto !rounded-[18px] shadow-lg text-sm sm:text-base w-full sm:w-auto flex-col sm:flex-row items-center justify-center text-center"
                            onClick={handleSave}
                        >
                            <span>{t('temple.update')}</span>
                            <span className="sm:ml-1 text-[10px] sm:text-inherit opacity-80 sm:opacity-100 uppercase sm:normal-case font-black sm:font-bold border-l border-white/20 sm:border-none pl-2 sm:pl-0 sm:pt-0">
                                {tabs.find(t_ => t_.id === activeTab)?.n}
                            </span>
                        </Button>
                    </section>
                </Card>
            </div>
        </div>
    )
}
