'use client'

export default function ConfiguracionPage() {
  return (
    <div style={{
      background: '#0C0E12', minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: 'Arial, sans-serif', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ color: '#2ECC71', fontSize: 40 }}>🔧</div>
      <h1 style={{ color: '#f1f5f9', margin: 0, fontSize: 22, fontWeight: 800 }}>El Taller</h1>
      <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>Empleados, fórmulas, químicos, roles e integraciones — próximamente.</p>
      <p style={{ color: '#334155', fontSize: 12, margin: 0 }}>
        27 empleados · 6 fórmulas aprobadas · Integraciones Sofia
      </p>
    </div>
  )
}
