import { useState, useEffect } from 'react';
import { SystemSettings, DEFAULT_SETTINGS } from '@/types/settings';

export function useSettings() {
    const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem('serendipity_system_settings');
        if (saved) {
            try {
                setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
            } catch (e) {
                console.error("Failed to load settings", e);
            }
        }
        setIsLoading(false);
    }, []);

    const updateSettings = (partial: Partial<SystemSettings>) => {
        const newSettings = { ...settings, ...partial };
        setSettings(newSettings);
        localStorage.setItem('serendipity_system_settings', JSON.stringify(newSettings));
    };

    const updateNestedSetting = <K extends keyof SystemSettings>(
        category: K,
        partial: Partial<SystemSettings[K]>
    ) => {
        const newSettings = {
            ...settings,
            [category]: {
                ...(settings[category] as any),
                ...partial
            }
        };
        setSettings(newSettings);
        localStorage.setItem('serendipity_system_settings', JSON.stringify(newSettings));
    };

    return {
        settings,
        isLoading,
        updateSettings,
        updateNestedSetting
    };
}
