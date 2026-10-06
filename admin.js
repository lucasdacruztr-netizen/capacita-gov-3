import { supabase, exigirPerfil, sair, esc, fmtData } from "./config.js";

const $ = (id) => document.getElementById(id);
const badge = (ativo) => `<span class="badge ${ativo ? "ok" : "off"}">${ativo ? "Ativo" : "Inativo"}</span>`;
const linhaVazia = (cols, msg) => `<tr><td colspan="${cols}" class="vazio">${msg}</td></tr>`;
const TITULOS = { resumo: "Visão geral", alunos: "Alunos", cursos: "Cursos", matriculas: "Matrículas" };

function abrirAba(nome) {
  document.querySelectorAll(".tab").forEach((s) => (s.hidden = s.id !== `tab-${nome}`));
  document.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("ativo", b.dataset.tab === nome));
  $("titulo").textContent = TITULOS[nome];
}

// Todas as leituras passam pelo RLS: só um admin ativo recebe dados de todos.
async function carregarAlunos() {
  const { data, error } = await supabase
    .from("perfis")
    .select("id, nome, email, ativo, criado_em")
    .eq("tipo", "aluno")
    .order("nome");
  if (error) { $("tb-alunos").innerHTML = linhaVazia(4, "Erro ao carregar alunos."); return; }
  $("st-alunos").textContent = data.length;
  $("tb-alunos").innerHTML = data.length
    ? data.map((a) => `<tr><td>${esc(a.nome)}</td><td>${esc(a.email)}</td><td>${badge(a.ativo)}</td><td>${fmtData(a.criado_em)}</td></tr>`).join("")
    : linhaVazia(4, "Nenhum aluno cadastrado.");
}

async function carregarCursos() {
  const { data, error } = await supabase
    .from("cursos")
    .select("id, nome, descricao, ativo, criado_em")
    .order("nome");
  if (error) { $("tb-cursos").innerHTML = linhaVazia(4, "Erro ao carregar cursos."); return; }
  $("st-cursos").textContent = data.filter((c) => c.ativo).length;
  $("tb-cursos").innerHTML = data.length
    ? data.map((c) => `<tr><td>${esc(c.nome)}</td><td>${esc(c.descricao)}</td><td>${badge(c.ativo)}</td><td>${fmtData(c.criado_em)}</td></tr>`).join("")
    : linhaVazia(4, "Nenhum curso criado.");
}

// Agrupa as matrículas por curso para mostrar quem está em cada um.
async function carregarMatriculas() {
  const box = $("lista-matriculas");
  const { data, error } = await supabase
    .from("matriculas")
    .select("id, ativo, matriculado_em, perfis(nome, email), cursos(id, nome)")
    .order("matriculado_em", { ascending: false });
  if (error) { box.innerHTML = `<div class="card">Erro ao carregar matrículas.</div>`; return; }
  $("st-matriculas").textContent = data.filter((m) => m.ativo).length;
  if (!data.length) { box.innerHTML = `<div class="card mut">Nenhuma matrícula registrada.</div>`; return; }

  const porCurso = new Map();
  for (const m of data) {
    const nome = m.cursos?.nome ?? "Curso removido";
    if (!porCurso.has(nome)) porCurso.set(nome, []);
    porCurso.get(nome).push(m);
  }
  box.innerHTML = [...porCurso].map(([curso, lista]) => `
    <div class="card">
      <h3>${esc(curso)}</h3>
      <div class="mut">${lista.length} matrícula(s)</div>
      <ul class="lista">${lista.map((m) =>
        `<li>${esc(m.perfis?.nome)} ${badge(m.ativo)}</li>`).join("")}</ul>
    </div>`).join("");
}

async function init() {
  const perfil = await exigirPerfil("admin");
  if (!perfil) return;
  $("admin-nome").textContent = perfil.nome;
  $("btn-sair").addEventListener("click", sair);
  document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => abrirAba(b.dataset.tab)));
  document.body.hidden = false;
  await Promise.all([carregarAlunos(), carregarCursos(), carregarMatriculas()]);
}

init();
