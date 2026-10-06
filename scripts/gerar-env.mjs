// Uso: SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... node scripts/gerar-env.mjs
// Use como "Build command" na Netlify, Vercel, Cloudflare Pages etc.
import { writeFileSync } from "node:fs";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error("Defina SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY.");
  process.exit(1);
}

const conteudo = `export const ENV = ${JSON.stringify({ SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY }, null, 2)};\n`;
writeFileSync(new URL("../js/env.js", import.meta.url), conteudo);
console.log("js/env.js gerado.");
