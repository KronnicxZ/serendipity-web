const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testVault() {
    console.log('--- Test de Sagrario (Vault) ---');

    console.log('1. Listando documentos...');
    const { data: docs, error: listError } = await supabase
        .from('vault_documents')
        .select('*');

    if (listError) {
        console.error('Error listando:', listError.message);
        return;
    }

    console.log(`Documentos encontrados: ${docs.length}`);
    docs.forEach(d => console.log(`- ${d.name} (${d.status})` ));

    if (docs.length > 0) {
        const docToDelete = docs[0];
        console.log(`2. Probando eliminación de: ${docToDelete.name} [ID: ${docToDelete.id}]`);
        
        // Manual delete to simulate API
        const { error: delError } = await supabase
            .from('vault_documents')
            .delete()
            .eq('id', docToDelete.id);

        if (delError) {
            console.error('Error eliminando:', delError.message);
        } else {
            console.log('✅ Documento eliminado de vault_documents.');
            
            // Check embeddings
            const { data: embeds } = await supabase
                .from('vault_embeddings')
                .select('id')
                .eq('document_id', docToDelete.id);
            
            if (embeds && embeds.length === 0) {
                console.log('✅ Embeddings eliminados correctamente (Cascade).');
            } else {
                console.log(`⚠️ Quedan ${embeds?.length} embeddings. No hay cascade habilitado.`);
            }
        }
    }

    console.log('--- Test de Vault Finalizado ---');
}

testVault();
