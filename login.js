import { supabase, obterPerfil } from "./config.js";

const form = document.getElementById("form-login");
const erro = document.getElementById("erro");
const botao = document.getElementById("btn-entrar");

const mostrarErro = (msg) => { erro.textContent = msg; erro.hidden = false; };

/** Decide o destino conforme o perfil. Conta inativa não entra. */
async function redirecionar() {
  const perfil = await obterPerfil();
  if (!perfil) {
    await supabase.auth.signOut();
    return mostrarErro("Não foi possível carregar seu perfil. Fale com o administrador.");
  }
  if (!perfil.ativo) {
    await supabase.auth.signOut();
    return mostrarErro("Sua conta está inativa. Fale com o administrador.");
  }
  location.replace(perfil.tipo === "admin" ? "admin.html" : "aluno.html");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  erro.hidden = true;
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;
  if (!email || !senha) return mostrarErro("Informe e-mail e senha.");

  botao.disabled = true;
  botao.textContent = "Entrando...";
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    mostrarErro("E-mail ou senha incorretos.");
  } else {
    await redirecionar();
  }
  botao.disabled = false;
  botao.textContent = "Entrar";
});

// Mensagem vinda de um redirecionamento (ex.: conta inativa)
if (new URLSearchParams(location.search).get("motivo") === "inativo") {
  mostrarErro("Sua conta está inativa. Fale com o administrador.");
} else {
  // Se já existe sessão válida, segue direto para o painel
  supabase.auth.getSession().then(({ data }) => { if (data.session) redirecionar(); });
}
