import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { ENV } from "./env.js";

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY (veja scripts/gerar-env.mjs).");
}

// Somente a publishable key no navegador. O acesso é limitado pelo RLS.
export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_PUBLISHABLE_KEY);

/** Escapa texto vindo do banco antes de colocar em innerHTML (evita XSS). */
export const esc = (valor) =>
  String(valor ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const fmtData = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");

export async function sair() {
  await supabase.auth.signOut();
  location.replace("index.html");
}

/** Lê o perfil do usuário logado. O token é validado no servidor (getUser). */
export async function obterPerfil() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("perfis")
    .select("id, nome, email, tipo, ativo, criado_em")
    .eq("id", user.id)
    .single();
  return error ? null : data;
}

/**
 * Guarda de página: só libera se houver sessão, conta ativa e o tipo esperado.
 * É apenas UX: quem impede o acesso a dados de verdade é o RLS no banco.
 */
export async function exigirPerfil(tipoEsperado) {
  const perfil = await obterPerfil();
  if (!perfil) {
    await supabase.auth.signOut();
    location.replace("index.html");
    return null;
  }
  if (!perfil.ativo) {
    await supabase.auth.signOut();
    location.replace("index.html?motivo=inativo");
    return null;
  }
  if (perfil.tipo !== tipoEsperado) {
    location.replace(perfil.tipo === "admin" ? "admin.html" : "aluno.html");
    return null;
  }
  return perfil;
}
