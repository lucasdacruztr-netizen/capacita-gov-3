import { supabase, obterPerfil } from "./config.js";
const form = document.getElementById("form-login");
const erro = document.getElementById("erro");
const botao = document.getElementById("btn-entrar");

const mostrarErro = (msg) => {
  erro.textContent = msg;
  erro.hidden = false;
};

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

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha
  });

  if (error) {
    mostrarErro("E-mail ou senha incorretos.");
  } else {
    await redirecionar();
  }

  botao.disabled = false;
  botao.textContent = "Entrar";
});

// ===============================
// SOLICITAÇÃO PÚBLICA DE ACESSO
// ===============================

const btnSolicitarAcesso = document.getElementById("btn-solicitar-acesso");
const formCadastro = document.getElementById("form-cadastro");
const erroCadastro = document.getElementById("erro-cadastro");
const btnCadastrar = document.getElementById("btn-cadastrar");
const btnVoltarLogin = document.getElementById("btn-voltar-login");

const mostrarErroCadastro = (msg) => {
  erroCadastro.textContent = msg;
  erroCadastro.hidden = false;
};

const limparErroCadastro = () => {
  erroCadastro.textContent = "";
  erroCadastro.hidden = true;
};

btnSolicitarAcesso.addEventListener("click", () => {
  form.hidden = true;
  formCadastro.hidden = false;
  limparErroCadastro();
});

btnVoltarLogin.addEventListener("click", () => {
  formCadastro.hidden = true;
  form.hidden = false;
  limparErroCadastro();
});

formCadastro.addEventListener("submit", async (e) => {
  e.preventDefault();

  limparErroCadastro();

  const nome = document.getElementById("cadastro-nome").value.trim();
  const email = document.getElementById("cadastro-email").value.trim();
  const senha = document.getElementById("cadastro-senha").value;

  if (!nome || !email || !senha) {
    return mostrarErroCadastro(
      "Informe seu nome, e-mail e senha para solicitar acesso."
    );
  }

  if (senha.length < 6) {
    return mostrarErroCadastro(
      "A senha deve ter pelo menos 6 caracteres."
    );
  }

  btnCadastrar.disabled = true;
  btnCadastrar.textContent = "Enviando...";

  const { data, error } = await supabase.functions.invoke(
    "solicitar-acesso",
    {
      body: {
        nome,
        email,
        senha
      }
    }
  );

  if (error) {
    mostrarErroCadastro(
      data?.erro || error.message || "Não foi possível enviar a solicitação."
    );
  } else if (data?.erro) {
    mostrarErroCadastro(data.erro);
  } else {
    mostrarErroCadastro(
      "Solicitação enviada. Aguarde a autorização do administrador."
    );

    formCadastro.reset();
  }

  btnCadastrar.disabled = false;
  btnCadastrar.textContent = "Solicitar acesso";
});

// Mensagem vinda de um redirecionamento (ex.: conta inativa)
if (new URLSearchParams(location.search).get("motivo") === "inativo") {
  mostrarErro("Sua conta está inativa. Fale com o administrador.");
} else {
  // Se já existe sessão válida, segue direto para o painel
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) redirecionar();
  });
}
