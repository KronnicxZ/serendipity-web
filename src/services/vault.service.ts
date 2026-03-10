import { VaultDocument } from '@/types/sophia';
import { get, set, del } from 'idb-keyval';

const STORAGE_KEY = 'anthropos_vault_docs';
const TEXT_STORAGE_PREFIX = 'anthropos_vault_text_';

export class VaultService {
    static getDocuments(): VaultDocument[] {
        if (typeof window === 'undefined') return [];
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    static async uploadDocument(file: File): Promise<VaultDocument> {
        // Enviar archivo al backend para parseo
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
        const extractedText = data.text;

        const docs = this.getDocuments();
        const newDoc: VaultDocument = {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            type: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            // Todo se encripta lógicamente en el flujo
            encrypted: true,
            status: 'READY'
        };

        const updatedDocs = [newDoc, ...docs];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDocs));

        // Guardar el texto extraído en IndexedDB para no saturar LocalStorage
        await set(TEXT_STORAGE_PREFIX + newDoc.id, extractedText);

        return newDoc;
    }

    static async deleteDocument(id: string): Promise<void> {
        const docs = this.getDocuments();
        const updatedDocs = docs.filter(d => d.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDocs));
        await del(TEXT_STORAGE_PREFIX + id);
    }

    static async getVaultContext(): Promise<string> {
        const docs = this.getDocuments();
        if (docs.length === 0) return "No hay documentos adicionales en el Sagrario.";

        let context = "Contenido extraído de los documentos en el Sagrario de Datos (Clasificado):\n\n";

        for (const doc of docs) {
            try {
                const text = await get(TEXT_STORAGE_PREFIX + doc.id);
                if (text) {
                    context += `--- INICIO DE DOCUMENTO: ${doc.name} ---\n`;
                    // Limitando el tamaño para no saturar la llamada al LLM (aprox 10k caracteres)
                    context += String(text).substring(0, 10000) + (String(text).length > 10000 ? '\n[...Contenido Truncado por seguridad...]' : '');
                    context += `\n--- FIN DE DOCUMENTO ---\n\n`;
                }
            } catch (e) {
                console.error("Error leyendo doc de idb:", e);
            }
        }

        return context;
    }
}
