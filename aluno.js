import { supabase, exigirPerfil, sair, esc, fmtData } from "./config.js";

const $ = (id) => document.getElementById(id);

// Somente leitura: o aluno não tem permissão de UPDATE em perfis (RLS),
// então não há como alterar o próprio tipo.
function mostrarPerfil(p) {
  $("aluno-nome").textContent = p.nome;
  $("perfil").innerHTML = `
    <div><b>${esc(p.nome)}</b></div>
    <div class="mut">${esc(p.email)}</div>
    <div class="mut">Tipo: ${esc(p.tipo)} · Membro desde ${fmtData(p.criado_em)}</div>`;
}

// O RLS já devolve só matrículas do próprio aluno e só cursos ativos nos quais
// ele está matriculado; o filtro abaixo apenas descarta itens sem curso visível.
async function carregarCursos() {
  const box = $("cursos");
  const { data, error } = await supabase
    .from("matriculas")
    .select("id, ativo, matriculado_em, cursos(id, nome, descricao, ativo)")
    .order("matriculado_em", { ascending: false });
  if (error) { box.innerHTML = `<div class="card">Erro ao carregar seus cursos.</div>`; return; }

  const lista = data.filter((m) => m.ativo && m.cursos?.ativo);
  box.innerHTML = lista.length
    ? lista.map((m) => `
      <div class="card">
        <h3>${esc(m.cursos.nome)}</h3>
        <p class="mut">${esc(m.cursos.descricao) || "Sem descrição."}</p>
        <span class="mut">Matrícula em ${fmtData(m.matriculado_em)}</span>
      </div>`).join("")
    : `<div class="card mut">Você ainda não está matriculado em nenhum curso ativo.</div>`;
}

async function init() {
  const perfil = await exigirPerfil("aluno");
  if (!perfil) return;
  mostrarPerfil(perfil);
  $("btn-sair").addEventListener("click", sair);
  document.body.hidden = false;
  await carregarCursos();
}

init();
