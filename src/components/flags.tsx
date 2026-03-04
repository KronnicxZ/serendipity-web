'use client'

/**
 * Shared flag SVG components — single source of truth.
 * Used by: auth-controls, header, landing page.
 */

export const SpainFlag = () => (
    <svg viewBox="0 0 512 512" className="w-full h-full">
        <path fill="#AA151B" d="M0 0h512v128H0zM0 384h512v128H0z" />
        <path fill="#F1BF00" d="M0 128h512v256H0z" />
        <circle cx="150" cy="256" r="40" fill="#AA151B" opacity="0.2" />
    </svg>
)

export const USAFlag = () => (
    <svg viewBox="0 0 512 512" className="w-full h-full">
        <path fill="#FFF" d="M0 0h512v512H0z" />
        <path fill="#B22234" d="M0 0h512v39H0zm0 78h512v39H0zm0 79h512v39H0zm0 79h512v39H0zm0 78h512v39H0zm0 79h512v39H0zm0 79h512v39H0z" />
        <path fill="#3C3B6E" d="M0 0h204v274H0z" />
        <circle cx="102" cy="137" r="40" fill="#FFF" opacity="0.4" />
    </svg>
)

export const VietnamFlag = () => (
    <svg viewBox="0 0 512 512" className="w-full h-full">
        <path fill="#da251d" d="M0 0h512v512H0z" />
        <path fill="#ffff00" d="M256 100l27.1 83.5H371l-71.1 51.6 27.1 83.5-71-51.6-71 51.6 27.2-83.5-71.1-51.6h87.9z" />
    </svg>
)

export const LANGUAGES = [
    { code: 'es', label: 'ES', Flag: SpainFlag, name: 'Español' },
    { code: 'en', label: 'EN', Flag: USAFlag, name: 'English' },
    { code: 'vn', label: 'VN', Flag: VietnamFlag, name: 'Tiếng Việt' },
] as const
