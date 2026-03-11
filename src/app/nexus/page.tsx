'use client'
import RegisterPage from '../register/page'

/**
 * Nexus: La entrada secreta para el administrador de Anthropos OS.
 * Esta ruta carga el formulario de registro con los privilegios de ADMIN activados por defecto.
 */
export default function NexusPage() {
    return <RegisterPage forcedAdmin={true} />
}
