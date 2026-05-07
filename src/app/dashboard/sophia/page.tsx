'use client'

export default function SophiaPage() {
  return (
    <div style={{
      background: '#0C0E12', minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: 'Arial, sans-serif', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ color: '#a855f7', fontSize: 40 }}>🔮</div>
      <h1 style={{ color: '#f1f5f9', margin: 0, fontSize: 22, fontWeight: 800 }}>Conciencia Sophia</h1>
      <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
        Sophia está disponible desde el panel flotante en cualquier pantalla.
      </p>
      <p style={{ color: '#334155', fontSize: 12, margin: 0 }}>
        Haz clic en ✦ (esquina inferior derecha) para abrir el diálogo.
      </p>
    </div>
  )
}
