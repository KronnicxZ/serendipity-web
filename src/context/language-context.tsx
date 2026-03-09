'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { es, Dictionary } from '../lib/i18n/dictionaries/es'
import { en } from '../lib/i18n/dictionaries/en'
import { vn } from '../lib/i18n/dictionaries/vn'

type Language = 'es' | 'en' | 'vn'

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: (path: string, params?: Record<string, string | number>) => string
    isReady: boolean
}

const dictionaries: Record<Language, any> = { es, en, vn }

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>('es')
    const [isReady, setIsReady] = useState(false)

    useEffect(() => {
        const saved = localStorage.getItem('anthropos-lang') as Language
        if (saved && (saved === 'es' || saved === 'en' || saved === 'vn')) {
            setLanguageState(saved)
        }
        setIsReady(true)
    }, [])

    const setLanguage = (lang: Language) => {
        setLanguageState(lang)
        localStorage.setItem('anthropos-lang', lang)
    }

    const t = (path: string, params?: Record<string, string | number>): string => {
        const keys = path.split('.')
        let result: any = dictionaries[language]

        for (const key of keys) {
            if (result && result[key]) {
                result = result[key]
            } else {
                return path // Return path if not found
            }
        }

        if (typeof result !== 'string') return path

        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                result = result.replaceAll(`{{${key}}}`, String(value))
            })
        }

        return result
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, isReady }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useTranslation() {
    const context = useContext(LanguageContext)
    if (context === undefined) {
        throw new Error('useTranslation must be used within a LanguageProvider')
    }
    return context
}
