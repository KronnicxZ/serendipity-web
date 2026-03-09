import { useFinance } from './use-finance';
import { useOperations } from './use-operations';
import { SophiaService, HERMETIC_PRINCIPLES, getPracticalAgentsStatus } from '@/services/sophia.service';
import { AIService } from '@/services/ai.service';
import { VaultService } from '@/services/vault.service';
import { useMemo, useState, useEffect } from 'react';
import { ChatMessage, SophiaAlert, VaultDocument } from '@/types/sophia';
import { useTranslation } from '@/context/language-context';
import { useSettings } from './use-settings';

export function useSophia() {
    const { data: finance } = useFinance();
    const { orders, stations } = useOperations();
    const { settings } = useSettings();
    const { t } = useTranslation();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isTyping, setIsTyping] = useState(false);

    // Load initial messages
    useEffect(() => {
        const saved = localStorage.getItem('sophia_chat_history');
        if (saved) {
            try {
                setMessages(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse local history");
                setMessages([{ id: 'welcome', role: 'sophia', content: t('sophia.welcomeMsg'), timestamp: new Date().toISOString() }]);
            }
        } else {
            setMessages([{ id: 'welcome', role: 'sophia', content: t('sophia.welcomeMsg'), timestamp: new Date().toISOString() }]);
        }
    }, [t]);

    // Save messages on change
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem('sophia_chat_history', JSON.stringify(messages));
        }
    }, [messages]);

    // Vault State
    const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        setVaultDocs(VaultService.getDocuments());
    }, []);

    const alerts = useMemo(() => {
        return SophiaService.getGlobalAlerts(finance, orders, stations, settings);
    }, [finance, orders, stations, settings]);

    const sendMessage = async (content: string) => {
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        try {
            const response = await AIService.generateResponse(content, finance, orders, stations);
            setMessages(prev => [...prev, response]);
        } catch (error) {
            console.error("AI Error:", error);
        } finally {
            setIsTyping(false);
        }
    };

    const uploadToVault = async (file: File) => {
        setIsUploading(true);
        try {
            const newDoc = await VaultService.uploadDocument(file);
            setVaultDocs(prev => [newDoc, ...prev]);
            return newDoc;
        } finally {
            setIsUploading(false);
        }
    };

    const deleteFromVault = (id: string) => {
        VaultService.deleteDocument(id);
        setVaultDocs(prev => prev.filter(d => d.id !== id));
    };

    const generateDailyReport = () => {
        setIsTyping(true);
        setTimeout(() => {
            const reportContent = SophiaService.generateProactiveAnalysis(finance, orders, stations, settings);
            const reportMsg: ChatMessage = {
                id: Date.now().toString(),
                role: 'sophia',
                content: reportContent,
                timestamp: new Date().toISOString(),
                agentSource: 'PROCESS'
            };
            setMessages(prev => [...prev, reportMsg]);
            setIsTyping(false);
        }, 1500);
    };

    const criticalAlerts = alerts.filter(a => a.type === 'CRITICAL');
    const warningAlerts = alerts.filter(a => a.type === 'WARNING');

    const practicalAgents = useMemo(() => {
        return getPracticalAgentsStatus(finance, orders, stations);
    }, [finance, orders, stations]);

    return {
        alerts,
        criticalAlerts,
        warningAlerts,
        hasAlerts: alerts.length > 0,
        sophiaStatus: criticalAlerts.length > 0 ? 'ALERTA' : alerts.length > 0 ? 'VIGILANTE' : 'BALANCE',
        practicalAgents,
        hermeticPrinciples: HERMETIC_PRINCIPLES,
        agents: practicalAgents,
        messages,
        sendMessage,
        generateDailyReport,
        isTyping,
        // Vault Exports
        vaultDocs,
        isUploading,
        uploadToVault,
        deleteFromVault
    };
}
