const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manuel .env.local parsing
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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testUserFlow() {
  const testEmail = `demo_${Math.floor(Math.random() * 10000)}@serendipity.com`;
  const testPassword = 'Password123!';
  const testName = 'Agente Demo Test';
  const testRole = 'SUPERVISOR';

  console.log(`--- Iniciando Test de Usuario: ${testEmail} ---`);

  // 1. Crear Usuario
  console.log('1. Creando usuario en Auth...');
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { name: testName, role: testRole }
  });

  if (authError) {
    console.error('Error creando en Auth:', authError.message);
    return;
  }
  const userId = authData.user.id;
  console.log('✅ Usuario creado en Auth ID:', userId);

  // 2. Insertar en Public (Solo si no existe ya por trigger)
  console.log('2. Verificando si ya existe en public.users (trigger?)...');
  const { data: existingPublic } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  if (existingPublic) {
    console.log('ℹ️ Registro en public.users ya existe (probablemente creado por trigger).');
  } else {
    console.log('2b. Insertando manualmente en public.users...');
    const { error: publicError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email: testEmail,
        name: testName,
        role: testRole
      });

    if (publicError) {
      console.error('Error en public.users:', publicError.message);
      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return;
    }
    console.log('✅ Registro en public.users creado manualmente.');
  }

  // 3. Verificar Lectura
  console.log('3. Verificando lectura...');
  const { data: userData, error: fetchError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (fetchError || !userData) {
    console.error('Error leyendo usuario:', fetchError?.message);
  } else {
    console.log('✅ Usuario verificado:', userData.name, 'Rol:', userData.role);
  }

  // 4. Borrar Usuario (Prueba de Delete)
  console.log('4. Probando eliminación...');
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error('Error eliminando:', deleteError.message);
  } else {
    console.log('✅ Usuario eliminado exitosamente.');
  }

  console.log('--- Test Finalizado con Éxito ---');
}

testUserFlow();
