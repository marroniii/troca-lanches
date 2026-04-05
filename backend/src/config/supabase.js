const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
// Servidor Express: preferir SERVICE_ROLE (acesso completo, nunca expor ao browser).
// ANON só como fallback (ex.: ambiente sem service role configurada).
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Faltam variáveis de ambiente. Configure em .env:\n' +
    '- SUPABASE_URL\n' +
    '- SUPABASE_ANON_KEY\n' +
    '- SUPABASE_SERVICE_ROLE_KEY (desenvolvimento)'
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;