import { VaultDocument } from '@/types/sophia';

export class VaultService {
    static async getDocuments(): Promise<VaultDocument[]> {
        try {
            const res = await fetch('/api/vault');
            if (!res.ok) throw new Error('Failed to fetch documents');
            return await res.json();
        } catch (error) {
            console.error('Error fetching vault documents:', error);
            return [];
        }
    }

    static async uploadDocument(file: File): Promise<VaultDocument> {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/vault/parse', {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to parse document');
        }

        const data = await res.json();
        
        // El backend devuelve el documentId y el texto.
        // Volvemos a obtener la lista para tener el objeto completo o construimos uno temporal.
        return {
            id: data.documentId,
            name: file.name,
            type: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            encrypted: true,
            status: 'READY'
        };
    }

    static async deleteDocument(id: string): Promise<void> {
        const res = await fetch(`/api/vault?id=${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete document');
        }
    }

    static async getVaultContext(): Promise<string> {
        // El RAG profundo (PgVector) se maneja ahora a nivel backend de manera nativa.
        return "";
    }
}
