import { supabase, exigirPerfil, sair, esc, fmtData } from "./config.js";

const $ = (id) => document.getElementById(id);

let ultimoCursoId = null;
const badge = (ativo) =>
  `<span class="badge ${ativo ? "ok" : "off"}">${ativo ? "Ativo" : "Inativo"}</span>`;

const linhaVazia = (cols, msg) =>
  `<tr><td colspan="${cols}" class="vazio">${msg}</td></tr>`;

const TITULOS = {
  resumo: "Visão geral",
  alunos: "Alunos",
  cursos: "Cursos",
  matriculas: "Matrículas"
};

function abrirAba(nome) {
  document.querySelectorAll(".tab").forEach((s) => {
    s.hidden = s.id !== `tab-${nome}`;
  });

  document.querySelectorAll("[data-tab]").forEach((b) => {
    b.classList.toggle("ativo", b.dataset.tab === nome);
  });

  $("titulo").textContent = TITULOS[nome];
}


// ===============================
// CARREGAR ALUNOS
// ===============================

async function carregarAlunos() {
  const { data, error } = await supabase
    .from("perfis")
    .select("id, nome, email, ativo, removido, criado_em")
    .eq("tipo", "aluno")
    .order("nome");

  if (error) {
    $("tb-alunos").innerHTML = linhaVazia(
      4,
      "Erro ao carregar alunos."
    );
    return;
  }

  $("st-alunos").textContent = data.length;

  $("tb-alunos").innerHTML = data.length
    ? data
        .map(
          (a) => `
            <tr>
              <td>${esc(a.nome)}</td>
              <td>${esc(a.email)}</td>

              <td>
                ${
                  a.removido
                    ? `<button
                        class="badge off"
                        type="button"
                        data-status-aluno="${esc(a.id)}"
                        data-removido="true"
                        style="
                          border: 0;
                          cursor: pointer;
                          font: inherit;
                          transition: .2s;
                        "
                        title="Clique para ativar o aluno"
                      >
                        Removido
                      </button>`
                    : a.ativo
                      ? `<button
                          class="badge ok"
                          type="button"
                          data-status-aluno="${esc(a.id)}"
                          data-removido="false"
                          style="
                            border: 0;
                            cursor: pointer;
                            font: inherit;
                            transition: .2s;
                          "
                          title="Clique para remover o aluno"
                        >
                          Ativo
                        </button>`
                      : badge(a.ativo)
                }
              </td>

              <td>${fmtData(a.criado_em)}</td>
            </tr>
          `
        )
        .join("")
    : linhaVazia(4, "Nenhum aluno cadastrado.");
}


// ===============================
// REMOVER / ATIVAR ALUNO
// ===============================

async function alterarAluno(id, removido, botao) {
  const confirmar = confirm(
    removido
      ? "Deseja ativar este aluno novamente?"
      : "Tem certeza que deseja remover este aluno?"
  );

  if (!confirmar) return;

  botao.disabled = true;
  botao.textContent = removido
    ? "Ativando..."
    : "Removendo...";

  const { error } = await supabase
    .from("perfis")
    .update({
      ativo: removido,
      removido: !removido
    })
    .eq("id", id)
    .eq("tipo", "aluno");

  if (error) {
    console.error(
      "Erro ao alterar aluno:",
      error
    );

    botao.disabled = false;
    botao.textContent = "Erro — tentar de novo";

    return;
  }

  await carregarAlunos();
  await carregarSolicitacoes();
  await prepararMatricula();
}


// ===============================
// CARREGAR CURSOS
// ===============================

async function carregarCursos() {
  const { data, error } = await supabase
    .from("cursos")
    .select(
      "id, nome, descricao, ativo, criado_em, categoria, imagem_url, carga_horaria"
    )
    .order("nome");

  if (error) {
    console.error("Erro ao carregar cursos:", error);

    $("tb-cursos").innerHTML = linhaVazia(
      5,
      "Erro ao carregar cursos."
    );

    return;
  }

  $("st-cursos").textContent =
    data.filter((c) => c.ativo).length;

  $("tb-cursos").innerHTML = data.length
    ? data
        .map(
          (c) => `
            <tr>
              <td>${esc(c.nome)}</td>

              <td>
                ${esc(c.categoria || "Sem categoria")}
              </td>

              <td>
                ${
                  c.carga_horaria
                    ? `${esc(c.carga_horaria)}h`
                    : "—"
                }
              </td>

              <td>
                ${fmtData(c.criado_em)}
              </td>

              <td>
                <div
                  style="
                    display:flex;
                    gap:8px;
                    flex-wrap:wrap;
                  "
                >
                  <button
                    class="btn"
                    type="button"
                    data-renomear-curso="${esc(c.id)}"
                  >
                    Renomear
                  </button>

                  ${
                    c.ativo
                      ? `
                        <button
                          class="btn"
                          type="button"
                          data-remover-curso="${esc(c.id)}"
                        >
                          Remover
                        </button>
                      `
                      : `
                        <button
                          class="btn"
                          type="button"
                          data-ativar-curso="${esc(c.id)}"
                        >
                          Ativar
                        </button>
                      `
                  }
                </div>
              </td>
            </tr>
          `
        )
        .join("")
    : linhaVazia(5, "Nenhum curso criado.");
}


// ===============================
// RENOMEAR CURSO
// ===============================

async function renomearCurso(id, botao) {
  const { data: curso, error: erroBusca } = await supabase
    .from("cursos")
    .select("id, nome")
    .eq("id", id)
    .single();

  if (erroBusca || !curso) {
    alert("Não foi possível carregar o curso.");
    return;
  }

  const novoNome = prompt(
    "Digite o novo nome do curso:",
    curso.nome
  );

  if (novoNome === null) {
    return;
  }

  const nome = novoNome.trim();

  if (!nome) {
    alert("O nome do curso não pode ficar vazio.");
    return;
  }

  if (nome === curso.nome) {
    return;
  }

  botao.disabled = true;
  botao.textContent = "Salvando...";

  const { error } = await supabase
    .from("cursos")
    .update({
      nome
    })
    .eq("id", id);

  if (error) {
    console.error("Erro ao renomear curso:", error);

    botao.disabled = false;
    botao.textContent = "Renomear";

    alert(
      "Não foi possível renomear o curso: " +
      error.message
    );

    return;
  }

  await carregarCursos();
  await prepararMatricula();
  await carregarMatriculas();
  await carregarGraficos();
}


// ===============================
// REMOVER / ATIVAR CURSO
// ===============================

async function removerCurso(id, botao) {
  const confirmar = confirm(
    "Tem certeza que deseja remover este curso?"
  );

  if (!confirmar) return;

  botao.disabled = true;
  botao.textContent = "Removendo...";

  const { error } = await supabase
    .from("cursos")
    .update({
      ativo: false
    })
    .eq("id", id);

  if (error) {
    console.error("Erro ao remover curso:", error);

    botao.disabled = false;
    botao.textContent = "Erro — tentar de novo";

    return;
  }

  await carregarCursos();
  await prepararMatricula();
  await carregarMatriculas();
  await carregarGraficos();
}


async function ativarCurso(id, botao) {
  const confirmar = confirm(
    "Deseja ativar este curso novamente?"
  );

  if (!confirmar) return;

  botao.disabled = true;
  botao.textContent = "Ativando...";

  const { error } = await supabase
    .from("cursos")
    .update({
      ativo: true
    })
    .eq("id", id);

  if (error) {
    console.error("Erro ao ativar curso:", error);

    botao.disabled = false;
    botao.textContent = "Erro — tentar de novo";

    return;
  }

  await carregarCursos();
  await prepararMatricula();
  await carregarMatriculas();
  await carregarGraficos();
}


// ===============================
// CARREGAR MATRÍCULAS
// ===============================

async function carregarMatriculas() {
  const box = $("lista-matriculas");

  const { data, error } = await supabase
    .from("matriculas")
    .select(
      "id, ativo, matriculado_em, perfis(nome, email), cursos(id, nome)"
    )
    .order("matriculado_em", { ascending: false });

  if (error) {
    box.innerHTML =
      `<div class="card">Erro ao carregar matrículas.</div>`;
    return;
  }

  $("st-matriculas").textContent =
    data.filter((m) => m.ativo).length;

  if (!data.length) {
    box.innerHTML =
      `<div class="card mut">Nenhuma matrícula registrada.</div>`;
    return;
  }

  const porCurso = new Map();

  for (const m of data) {
    const nome = m.cursos?.nome ?? "Curso removido";

    if (!porCurso.has(nome)) {
      porCurso.set(nome, []);
    }

    porCurso.get(nome).push(m);
  }

  box.innerHTML = [...porCurso]
    .map(
      ([curso, lista]) => `
        <div class="card">
          <h3>${esc(curso)}</h3>

          <div class="mut">
            ${lista.length} matrícula(s)
          </div>

          <ul class="lista">
            ${lista
              .map(
                (m) =>
                  `<li>${esc(m.perfis?.nome)} ${badge(m.ativo)}</li>`
              )
              .join("")}
          </ul>
        </div>
      `
    )
    .join("");
}


// ===============================
// PREPARAR NOVA MATRÍCULA
// ===============================

async function prepararMatricula() {
  const alunoSelect = $("matricula-aluno");
  const cursoSelect = $("matricula-curso");

  const { data: alunos, error: erroAlunos } = await supabase
    .from("perfis")
    .select("id, nome")
    .eq("tipo", "aluno")
    .eq("ativo", true)
    .eq("removido", false)
    .order("nome");

  const { data: cursos, error: erroCursos } = await supabase
    .from("cursos")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");

  if (erroAlunos || erroCursos) {
    return;
  }

  alunoSelect.innerHTML = `
    <option value="">Selecione o aluno</option>

    ${alunos
      .map(
        (a) =>
          `<option value="${a.id}">${esc(a.nome)}</option>`
      )
      .join("")}
  `;

  cursoSelect.innerHTML = `
    <option value="">Selecione o curso</option>

    ${cursos
      .map(
        (c) =>
          `<option value="${c.id}">${esc(c.nome)}</option>`
      )
      .join("")}
  `;

  const questaoCursoSelect = $("questao-curso");

  if (questaoCursoSelect) {
    questaoCursoSelect.innerHTML = `
      <option value="">Selecione o curso</option>

      ${cursos
        .map(
          (c) =>
            `<option value="${c.id}">${esc(c.nome)}</option>`
        )
        .join("")}
    `;
  }
}


// ===============================
// MATRICULAR ALUNO
// ===============================

async function matricularAluno() {
  const alunoId = $("matricula-aluno").value;
  const cursoId = $("matricula-curso").value;
  const botao = $("btn-matricular");
  const mensagem = $("msg-matricula");

  mensagem.hidden = true;

  if (!alunoId || !cursoId) {
    mensagem.textContent =
      "Selecione o aluno e o curso.";

    mensagem.hidden = false;
    return;
  }

  botao.disabled = true;
  botao.textContent = "Matriculando...";

  const { data: existente, error: erroBusca } =
    await supabase
      .from("matriculas")
      .select("id, ativo")
      .eq("usuario_id", alunoId)
      .eq("curso_id", cursoId)
      .maybeSingle();

  if (erroBusca) {
    mensagem.textContent =
      "Não foi possível verificar a matrícula.";

    mensagem.hidden = false;

    botao.disabled = false;
    botao.textContent = "Matricular aluno";

    return;
  }

  if (existente?.ativo) {
    mensagem.textContent =
      "Esse aluno já está matriculado nesse curso.";

    mensagem.hidden = false;

    botao.disabled = false;
    botao.textContent = "Matricular aluno";

    return;
  }

  if (existente && !existente.ativo) {
    const { error } = await supabase
      .from("matriculas")
      .update({
        ativo: true,
        matriculado_em: new Date().toISOString()
      })
      .eq("id", existente.id);

    if (error) {
      mensagem.textContent =
        "Erro ao reativar matrícula: " +
        error.message;

      mensagem.hidden = false;

      botao.disabled = false;
      botao.textContent = "Matricular aluno";

      return;
    }
  } else {
    const { error } = await supabase
      .from("matriculas")
      .insert({
        usuario_id: alunoId,
        curso_id: cursoId,
        ativo: true
      });

    if (error) {
      mensagem.textContent =
        "Erro ao matricular aluno: " + error.message;

      mensagem.hidden = false;

      botao.disabled = false;
      botao.textContent = "Matricular aluno";

      return;
    }
  }

  mensagem.textContent =
    "Aluno matriculado com sucesso.";

  mensagem.hidden = false;

  $("matricula-aluno").value = "";
  $("matricula-curso").value = "";

  await carregarMatriculas();

  botao.disabled = false;
  botao.textContent = "Matricular aluno";
}


// ===============================
// CADASTRAR ALUNO
// ===============================

async function cadastrarAluno(e) {
  e.preventDefault();

  const nome = $("aluno-nome").value.trim();
  const email = $("aluno-email").value.trim();
  const senha = $("aluno-senha").value;

  const botao = $("btn-cadastrar-aluno");
  const mensagem = $("msg-cadastrar-aluno");

  mensagem.hidden = true;

  if (!nome || !email || !senha) {
    mensagem.textContent =
      "Preencha todos os campos.";

    mensagem.hidden = false;

    return;
  }

  botao.disabled = true;
  botao.textContent = "Cadastrando...";

  const { data, error } =
    await supabase.functions.invoke(
      "criar-aluno",
      {
        body: {
          nome,
          email,
          senha
        }
      }
    );

  if (error) {
    let detalhe =
      error.message ||
      "Não foi possível cadastrar o aluno.";

    try {
      const resposta =
        await error.context?.json();

      if (resposta?.erro) {
        detalhe = resposta.erro;
      }

      if (resposta?.detalhe) {
        detalhe +=
          " — " + resposta.detalhe;
      }
    } catch {}

    mensagem.textContent = detalhe;
    mensagem.hidden = false;

    botao.disabled = false;
    botao.textContent =
      "Cadastrar aluno";

    return;
  }

  if (data?.erro) {
    mensagem.textContent = data.erro;
    mensagem.hidden = false;

    botao.disabled = false;
    botao.textContent =
      "Cadastrar aluno";

    return;
  }

  mensagem.textContent =
    "Aluno cadastrado com sucesso.";

  mensagem.hidden = false;

  $("aluno-nome").value = "";
  $("aluno-email").value = "";
  $("aluno-senha").value = "";

  await carregarAlunos();

  botao.disabled = false;
  botao.textContent =
    "Cadastrar aluno";
}


// ===============================
// UPLOAD DE ARQUIVO
// ===============================

async function enviarArquivoStorage(
  arquivo,
  pasta
) {
  if (!arquivo) return null;

  const extensao =
    arquivo.name.includes(".")
      ? arquivo.name
          .split(".")
          .pop()
          .toLowerCase()
      : "";

  const nomeSeguro =
    arquivo.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .toLowerCase();

  const nomeArquivo =
    `${Date.now()}-${nomeSeguro || "arquivo"}${extensao ? "." + extensao : ""}`;

  const caminho =
    `${pasta}/${nomeArquivo}`;

  const { error } =
    await supabase.storage
      .from("curso-imagens")
      .upload(
        caminho,
        arquivo,
        {
          cacheControl: "3600",
          upsert: false
        }
      );

  if (error) {
    throw error;
  }

  const {
    data: publicData
  } =
    supabase.storage
      .from("curso-imagens")
      .getPublicUrl(caminho);

  return publicData?.publicUrl || null;
}


// ===============================
// CRIAR ESTRUTURA INTERNA DO CURSO
// ===============================

async function criarEstruturaInternaCurso(
  cursoId,
  nomeCurso,
  conteudo,
  pdfUrl,
  urlExterna
) {
  const { data: moduloExistente, error: erroBusca } =
    await supabase
      .from("modulos")
      .select("id")
      .eq("curso_id", cursoId)
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .limit(1)
      .maybeSingle();

  if (erroBusca) {
    throw erroBusca;
  }

  let moduloId =
    moduloExistente?.id || null;

  if (!moduloId) {
    const { data: modulo, error } =
      await supabase
        .from("modulos")
        .insert({
          curso_id: cursoId,
          nome: "Conteúdo do curso",
          descricao: "",
          ordem: 1,
          ativo: true
        })
        .select("id")
        .single();

    if (error) {
      throw error;
    }

    moduloId = modulo.id;
  }

  if (conteudo) {
    const { error } =
      await supabase
        .from("aulas")
        .insert({
          modulo_id: moduloId,
          titulo: "Conteúdo do curso",
          descricao: conteudo,
          tipo: "texto",
          url: null
        });

    if (error) {
      throw error;
    }
  }

  if (pdfUrl) {
    const { error } =
      await supabase
        .from("aulas")
        .insert({
          modulo_id: moduloId,
          titulo: "Material em PDF",
          descricao: "Material complementar do curso.",
          tipo: "atividade",
          url: pdfUrl
        });

    if (error) {
      throw error;
    }
  }

  if (urlExterna) {
    const { error } =
      await supabase
        .from("aulas")
        .insert({
          modulo_id: moduloId,
          titulo: "Material externo",
          descricao: "Conteúdo complementar externo.",
          tipo: "video",
          url: urlExterna
        });

    if (error) {
      throw error;
    }
  }

  return moduloId;
}


// ===============================
// CADASTRAR CURSO
// ===============================

async function cadastrarCurso(e) {
  e.preventDefault();

  const nome =
    $("curso-nome").value.trim();

  const descricao =
    $("curso-descricao").value.trim();

  const categoria =
    $("curso-categoria")?.value.trim() || "";

  const imagemArquivo =
    $("curso-imagem-arquivo")?.files?.[0] || null;

  const conteudo =
    $("curso-conteudo")?.value.trim() || "";

  const pdfArquivo =
    $("curso-pdf-arquivo")?.files?.[0] || null;

  const urlCurso =
    $("curso-url")?.value.trim() || "";

  const cargaHorariaValor =
    $("curso-carga-horaria")?.value.trim() || "";

  const cargaHoraria =
    cargaHorariaValor
      ? Number(cargaHorariaValor)
      : null;

  const botao =
    $("btn-cadastrar-curso");

  const mensagem =
    $("msg-cadastrar-curso");

  mensagem.hidden = true;

  if (!nome) {
    mensagem.textContent =
      "Informe o nome do curso.";

    mensagem.hidden = false;

    return;
  }

  if (
    cargaHorariaValor &&
    (
      !Number.isFinite(cargaHoraria) ||
      cargaHoraria <= 0
    )
  ) {
    mensagem.textContent =
      "Informe uma carga horária válida.";

    mensagem.hidden = false;

    return;
  }

  if (
    urlCurso &&
    !/^https?:\/\/.+/i.test(urlCurso)
  ) {
    mensagem.textContent =
      "Informe uma URL válida começando com http:// ou https://.";

    mensagem.hidden = false;

    return;
  }

  if (
    pdfArquivo &&
    pdfArquivo.type !== "application/pdf"
  ) {
    mensagem.textContent =
      "O arquivo selecionado precisa ser um PDF.";

    mensagem.hidden = false;

    return;
  }

  botao.disabled = true;
  botao.textContent =
    "Cadastrando...";

  let imagemUrl = null;
  let pdfUrl = null;
  let cursoCriado = null;

  try {
    if (imagemArquivo) {
      imagemUrl =
        await enviarArquivoStorage(
          imagemArquivo,
          "imagens"
        );
    }

    if (pdfArquivo) {
      pdfUrl =
        await enviarArquivoStorage(
          pdfArquivo,
          "pdf"
        );
    }

    const {
      data,
      error
    } =
      await supabase
        .from("cursos")
        .insert({
          nome,
          descricao,
          categoria: categoria || null,
          imagem_url: imagemUrl || null,
          carga_horaria: cargaHoraria,
          ativo: true
        })
        .select()
        .single();

    if (error) {
      throw error;
    }

    cursoCriado = data;
    ultimoCursoId = data.id;

    await criarEstruturaInternaCurso(
      data.id,
      nome,
      conteudo,
      pdfUrl,
      urlCurso
    );

    mensagem.textContent =
      "Curso cadastrado com sucesso.";

    mensagem.hidden = false;

    $("curso-nome").value = "";
    $("curso-descricao").value = "";

    if ($("curso-categoria")) {
      $("curso-categoria").value = "";
    }

    if ($("curso-imagem-arquivo")) {
      $("curso-imagem-arquivo").value = "";
    }

    if ($("curso-conteudo")) {
      $("curso-conteudo").value = "";
    }

    if ($("curso-pdf-arquivo")) {
      $("curso-pdf-arquivo").value = "";
    }

    if ($("curso-url")) {
      $("curso-url").value = "";
    }

    if ($("curso-carga-horaria")) {
      $("curso-carga-horaria").value = "";
    }

    const previewContainer =
      $("preview-curso-imagem-container");

    const preview =
      $("preview-curso-imagem");

    if (previewContainer) {
      previewContainer.style.display = "none";
    }

    if (preview) {
      preview.removeAttribute("src");
    }

    await carregarCursos();
    await prepararMatricula();

  } catch (error) {
    console.error(
      "Erro ao cadastrar curso:",
      error
    );

    if (cursoCriado) {
      console.warn(
        "O curso foi criado, mas houve erro ao salvar o conteúdo:",
        error
      );

      mensagem.textContent =
        "O curso foi criado, mas houve erro ao salvar parte do conteúdo: " +
        error.message;
    } else {
      mensagem.textContent =
        "Erro ao cadastrar curso: " +
        error.message;
    }

    mensagem.hidden = false;
  }

  botao.disabled = false;
  botao.textContent =
    "Cadastrar curso";
}


// ===============================
// VER CURSO
// ===============================

async function verCurso() {
  const cursoId =
    ultimoCursoId ||
    $("questao-curso")?.value ||
    $("matricula-curso")?.value ||
    "";

  if (!cursoId) {
    alert(
      "Cadastre ou selecione um curso primeiro para visualizar."
    );
    return;
  }

  const { data: curso, error: erroCurso } =
    await supabase
      .from("cursos")
      .select(
        "id, nome, descricao, categoria, imagem_url, carga_horaria, ativo, criado_em"
      )
      .eq("id", cursoId)
      .single();

  if (erroCurso || !curso) {
    alert(
      "Não foi possível carregar o curso."
    );
    return;
  }

  const { data: modulos } =
    await supabase
      .from("modulos")
      .select(
        "id, nome, descricao, ordem, aulas(id, titulo, descricao, tipo, url)"
      )
      .eq("curso_id", cursoId)
      .eq("ativo", true)
      .order("ordem", {
        ascending: true
      });

  const { data: questoes } =
    await supabase
      .from("questoes")
      .select(
        "id, pergunta, opcao_a, opcao_b, opcao_c, resposta_correta, ordem"
      )
      .eq("curso_id", cursoId)
      .order("ordem", {
        ascending: true
      });

  let conteudo = "";
  let pdfUrl = "";
  let urlExterna = "";

  for (const modulo of modulos || []) {
    for (const aula of modulo.aulas || []) {
      if (
        aula.tipo === "texto" &&
        !conteudo
      ) {
        conteudo =
          aula.descricao || "";
      }

      if (
        aula.tipo === "atividade" &&
        aula.url &&
        !pdfUrl
      ) {
        pdfUrl = aula.url;
      }

      if (
        aula.tipo === "video" &&
        aula.url &&
        !urlExterna
      ) {
        urlExterna = aula.url;
      }
    }
  }

  const modal =
    document.createElement("div");

  modal.id =
    "modal-preview-curso";

  modal.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(15, 23, 42, .65);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    overflow-y: auto;
  `;

  const conteudoFormatado =
    esc(conteudo)
      .replace(/\r\n/g, "\n")
      .replace(/\n{2,}/g, "</p><p>")
      .replace(/\n/g, "<br>");

  const questoesHtml =
    questoes?.length
      ? questoes
          .map(
            (q, indice) => `
              <div
                style="
                  padding: 18px;
                  border: 1px solid #e5e7eb;
                  border-radius: 14px;
                  margin-top: 14px;
                "
              >
                <strong>
                  ${indice + 1}. ${esc(q.pergunta)}
                </strong>

                <div style="margin-top:10px;">
                  A) ${esc(q.opcao_a)}
                </div>

                <div>
                  B) ${esc(q.opcao_b)}
                </div>

                <div>
                  C) ${esc(q.opcao_c)}
                </div>

                <div
                  style="
                    margin-top:10px;
                    font-size:14px;
                    color:#64748b;
                  "
                >
                  Resposta correta:
                  ${
                    q.resposta_correta === 1
                      ? "A"
                      : q.resposta_correta === 2
                        ? "B"
                        : "C"
                  }
                </div>
              </div>
            `
          )
          .join("")
      : `
        <p style="color:#64748b;">
          Nenhuma pergunta cadastrada.
        </p>
      `;

  modal.innerHTML = `
    <div
      style="
        width: min(900px, 100%);
        max-height: 92vh;
        overflow-y: auto;
        background: white;
        border-radius: 20px;
        padding: 28px;
        box-shadow: 0 20px 60px rgba(0,0,0,.25);
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          gap:16px;
          align-items:flex-start;
        "
      >
        <div>
          <div
            style="
              font-size:13px;
              color:#64748b;
              margin-bottom:6px;
            "
          >
            Prévia do curso
          </div>

          <h2 style="margin:0;">
            ${esc(curso.nome)}
          </h2>
        </div>

        <button
          type="button"
          id="fechar-preview-curso"
          style="
            border:0;
            background:#f1f5f9;
            width:40px;
            height:40px;
            border-radius:10px;
            cursor:pointer;
            font-size:20px;
          "
        >
          ×
        </button>
      </div>

      ${
        curso.imagem_url
          ? `
            <img
              src="${esc(curso.imagem_url)}"
              alt="${esc(curso.nome)}"
              style="
                width:100%;
                max-height:280px;
                object-fit:cover;
                border-radius:16px;
                margin-top:20px;
              "
            >
          `
          : ""
      }

      <div
        style="
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:18px;
        "
      >
        ${
          curso.categoria
            ? `<span class="badge ok">${esc(curso.categoria)}</span>`
            : ""
        }

        ${
          curso.carga_horaria
            ? `<span class="badge ok">${esc(curso.carga_horaria)}h</span>`
            : ""
        }
      </div>

      ${
        curso.descricao
          ? `
            <section style="margin-top:24px;">
              <h3>Descrição</h3>
              <p>${esc(curso.descricao)}</p>
            </section>
          `
          : ""
      }

      ${
        conteudo
          ? `
            <section style="margin-top:24px;">
              <h3>Conteúdo do curso</h3>

              <div
                style="
                  line-height:1.75;
                  color:#334155;
                "
              >
                <p>${conteudoFormatado}</p>
              </div>
            </section>
          `
          : ""
      }

      ${
        pdfUrl
          ? `
            <section style="margin-top:24px;">
              <h3>Material em PDF</h3>

              <a
                href="${esc(pdfUrl)}"
                target="_blank"
                rel="noopener noreferrer"
                class="btn"
              >
                Abrir PDF
              </a>
            </section>
          `
          : ""
      }

      ${
        urlExterna
          ? `
            <section style="margin-top:24px;">
              <h3>URL do curso</h3>

              <a
                href="${esc(urlExterna)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                ${esc(urlExterna)}
              </a>
            </section>
          `
          : ""
      }

      <section style="margin-top:28px;">
        <h3>
          Perguntas
          (${questoes?.length || 0}/10)
        </h3>

        ${questoesHtml}
      </section>

    </div>
  `;

  document.body.appendChild(modal);

  $("fechar-preview-curso")
    .addEventListener(
      "click",
      () => modal.remove()
    );

  modal.addEventListener(
    "click",
    (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    }
  );
}


// ===============================
// VISUALIZAR PERGUNTAS
// ===============================

async function verPerguntas() {
  const cursoId =
    ultimoCursoId ||
    $("questao-curso")?.value ||
    $("matricula-curso")?.value ||
    "";

  if (!cursoId) {
    alert(
      "Selecione um curso primeiro para visualizar as perguntas."
    );
    return;
  }

  const { data: curso, error: erroCurso } =
    await supabase
      .from("cursos")
      .select("id, nome")
      .eq("id", cursoId)
      .single();

  if (erroCurso || !curso) {
    alert(
      "Não foi possível carregar o curso."
    );
    return;
  }

  const { data: questoes, error } =
    await supabase
      .from("questoes")
      .select(
        "id, pergunta, opcao_a, opcao_b, opcao_c, resposta_correta, ordem"
      )
      .eq("curso_id", cursoId)
      .order("ordem", {
        ascending: true
      });

  if (error) {
    alert(
      "Não foi possível carregar as perguntas."
    );
    return;
  }

  const modal =
    document.createElement("div");

  modal.id =
    "modal-preview-perguntas";

  modal.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(15, 23, 42, .65);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    overflow-y: auto;
  `;

  const perguntasHtml =
    questoes?.length
      ? questoes
          .map(
            (q, indice) => `
              <div
                style="
                  padding:20px;
                  border:1px solid #e5e7eb;
                  border-radius:16px;
                  margin-top:14px;
                  background:#fff;
                "
              >

                <div
                  style="
                    font-size:13px;
                    color:#64748b;
                    margin-bottom:7px;
                  "
                >
                  Pergunta ${indice + 1}
                </div>

                <strong>
                  ${esc(q.pergunta)}
                </strong>

                <div style="margin-top:14px;">
                  A) ${esc(q.opcao_a)}
                </div>

                <div style="margin-top:7px;">
                  B) ${esc(q.opcao_b)}
                </div>

                <div style="margin-top:7px;">
                  C) ${esc(q.opcao_c)}
                </div>

                <div
                  style="
                    margin-top:14px;
                    padding-top:12px;
                    border-top:1px solid #e5e7eb;
                    color:#64748b;
                    font-size:14px;
                  "
                >
                  Resposta correta:
                  <strong>
                    ${
                      q.resposta_correta === 1
                        ? "A"
                        : q.resposta_correta === 2
                          ? "B"
                          : "C"
                    }
                  </strong>
                </div>

              </div>
            `
          )
          .join("")
      : `
        <div
          style="
            padding:20px;
            border:1px dashed #cbd5e1;
            border-radius:16px;
            margin-top:16px;
            color:#64748b;
          "
        >
          Nenhuma pergunta cadastrada para este curso.
        </div>
      `;

  modal.innerHTML = `
    <div
      style="
        width:min(800px, 100%);
        max-height:92vh;
        overflow-y:auto;
        background:#fff;
        border-radius:20px;
        padding:28px;
        box-shadow:0 20px 60px rgba(0,0,0,.25);
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          gap:16px;
          align-items:flex-start;
        "
      >

        <div>

          <div
            style="
              font-size:13px;
              color:#64748b;
              margin-bottom:6px;
            "
          >
            Visualização das perguntas
          </div>

          <h2 style="margin:0;">
            ${esc(curso.nome)}
          </h2>

          <p
            class="mut"
            style="margin-top:6px;"
          >
            ${questoes?.length || 0}/10 perguntas cadastradas
          </p>

        </div>

        <button
          type="button"
          id="fechar-preview-perguntas"
          style="
            border:0;
            background:#f1f5f9;
            width:40px;
            height:40px;
            border-radius:10px;
            cursor:pointer;
            font-size:20px;
          "
        >
          ×
        </button>

      </div>

      <div>
        ${perguntasHtml}
      </div>

    </div>
  `;

  document.body.appendChild(modal);

  $("fechar-preview-perguntas")
    .addEventListener(
      "click",
      () => modal.remove()
    );

  modal.addEventListener(
    "click",
    (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    }
  );
}


// ===============================
// SOLICITAÇÕES DE ACESSO
// ===============================

async function carregarSolicitacoes() {
  const { data, error } =
    await supabase
      .from("perfis")
      .select(
        "id, nome, email, criado_em, removido"
      )
      .eq("tipo", "aluno")
      .eq("ativo", false)
      .eq("removido", false)
      .order("criado_em");

  if (error) {
    $("tb-solicitacoes").innerHTML =
      linhaVazia(
        4,
        "Erro ao carregar solicitações."
      );

    return;
  }

  $("tb-solicitacoes").innerHTML =
    data.length
      ? data
          .map(
            (s) => `
              <tr>
                <td>${esc(s.nome)}</td>

                <td>${esc(s.email)}</td>

                <td>
                  <span class="badge off">
                    Pendente
                  </span>
                </td>

                <td>
                  <button
                    class="btn"
                    type="button"
                    data-autorizar="${esc(s.id)}"
                  >
                    Autorizar acesso
                  </button>
                </td>
              </tr>
            `
          )
          .join("")
      : linhaVazia(
          4,
          "Nenhuma solicitação de acesso pendente."
        );
}


async function autorizarAcesso(
  id,
  botao
) {
  botao.disabled = true;
  botao.textContent =
    "Autorizando...";

  const { data, error } =
    await supabase
      .from("perfis")
      .update({
        ativo: true,
        removido: false
      })
      .eq("id", id)
      .eq("tipo", "aluno")
      .eq("ativo", false)
      .eq("removido", false)
      .select("id, nome, email");

  if (
    error ||
    !data?.length
  ) {
    botao.disabled = false;
    botao.textContent =
      "Erro — tentar de novo";

    return;
  }

  const aluno = data[0];

  const {
    data: sessao
  } = await supabase.auth.getSession();

  if (!sessao?.session) {
    console.error(
      "Sessão do administrador não encontrada."
    );

    botao.disabled = false;
    botao.textContent =
      "Erro — tentar de novo";

    return;
  }

  const { error: erroEmail } =
    await supabase.functions.invoke(
      "enviar-email-acesso",
      {
        body: {
          email: aluno.email,
          nome: aluno.nome
        }
      }
    );

  if (erroEmail) {
    console.error(
      "Erro ao enviar e-mail:",
      erroEmail
    );
  }

  const linha =
    botao.closest("tr");

  linha.children[2].innerHTML =
    badge(true);

  linha.children[3].textContent =
    "Ativo ✓";

  await carregarAlunos();
  await prepararMatricula();
}


// ===============================
// GRÁFICOS DA VISÃO GERAL
// ===============================

async function carregarGraficos() {

  const areaAlunos = $("grafico-alunos");

  const {
    data: alunosGrafico,
    error: erroAlunosGrafico
  } = await supabase
    .from("perfis")
    .select("criado_em")
    .eq("tipo", "aluno")
    .order("criado_em");

  if (
    erroAlunosGrafico ||
    !alunosGrafico?.length
  ) {
    areaAlunos.innerHTML = `
      <div class="grafico-vazio">
        Ainda não há dados de alunos.
      </div>
    `;
  } else {

    const porMes = new Map();

    alunosGrafico.forEach((aluno) => {

      const data =
        new Date(aluno.criado_em);

      const chave =
        `${data.getFullYear()}-${String(
          data.getMonth() + 1
        ).padStart(2, "0")}`;

      porMes.set(
        chave,
        (porMes.get(chave) || 0) + 1
      );
    });

    const meses =
      [...porMes.keys()].sort();

    let acumulado = 0;

    const pontos =
      meses.map((mes) => {

        acumulado +=
          porMes.get(mes);

        const [ano, numeroMes] =
          mes.split("-");

        const nomeMes =
          new Date(
            Number(ano),
            Number(numeroMes) - 1,
            1
          )
            .toLocaleDateString(
              "pt-BR",
              { month: "short" }
            )
            .replace(".", "");

        return {
          label:
            nomeMes.charAt(0).toUpperCase() +
            nomeMes.slice(1),
          valor: acumulado
        };
      });

    const largura = 600;
    const altura = 280;

    const margem = {
      esquerda: 42,
      direita: 20,
      topo: 20,
      baixo: 40
    };

    const graficoLargura =
      largura -
      margem.esquerda -
      margem.direita;

    const graficoAltura =
      altura -
      margem.topo -
      margem.baixo;

    const maximo =
      Math.max(
        ...pontos.map(
          (p) => p.valor
        ),
        1
      );

    const escalaMax =
      Math.ceil(maximo / 5) * 5 || 5;

    const pontosSvg =
      pontos.map(
        (ponto, indice) => {

          const x =
            margem.esquerda +
            (
              indice /
              Math.max(
                pontos.length - 1,
                1
              )
            ) *
            graficoLargura;

          const y =
            margem.topo +
            graficoAltura -
            (
              ponto.valor /
              escalaMax
            ) *
            graficoAltura;

          return {
            ...ponto,
            x,
            y
          };
        }
      );

    const linhas = [];

    for (let i = 0; i <= 5; i++) {

      const valor =
        Math.round(
          (escalaMax / 5) * i
        );

      const y =
        margem.topo +
        graficoAltura -
        (
          valor /
          escalaMax
        ) *
        graficoAltura;

      linhas.push(`
        <line
          x1="${margem.esquerda}"
          y1="${y}"
          x2="${largura - margem.direita}"
          y2="${y}"
          class="grafico-grade"
        />

        <text
          x="${margem.esquerda - 8}"
          y="${y + 4}"
          text-anchor="end"
          class="grafico-eixo"
        >
          ${valor}
        </text>
      `);
    }

    const caminho =
      pontosSvg
        .map(
          (ponto, indice) =>
            `${indice === 0 ? "M" : "L"} ${ponto.x} ${ponto.y}`
        )
        .join(" ");

    const pontosHtml =
      pontosSvg
        .map(
          (ponto) => `
            <circle
              cx="${ponto.x}"
              cy="${ponto.y}"
              r="5"
              class="grafico-ponto"
            >
              <title>
                ${ponto.label}: ${ponto.valor} aluno(s)
              </title>
            </circle>
          `
        )
        .join("");

    const labelsHtml =
      pontosSvg
        .map(
          (ponto) => `
            <text
              x="${ponto.x}"
              y="${altura - 14}"
              text-anchor="middle"
              class="grafico-legenda"
            >
              ${ponto.label}
            </text>
          `
        )
        .join("");

    areaAlunos.innerHTML = `
      <svg
        viewBox="0 0 ${largura} ${altura}"
        role="img"
        aria-label="Evolução de alunos cadastrados"
      >

        ${linhas.join("")}

        <path
          d="${caminho}"
          class="grafico-linha"
        />

        ${pontosHtml}

        ${labelsHtml}

      </svg>
    `;
  }


  const areaMatriculas =
    $("grafico-matriculas");

  const {
    data: matriculasGrafico,
    error: erroMatriculasGrafico
  } = await supabase
    .from("matriculas")
    .select(`
      id,
      ativo,
      cursos (
        nome
      )
    `)
    .eq("ativo", true);

  if (
    erroMatriculasGrafico ||
    !matriculasGrafico?.length
  ) {
    areaMatriculas.innerHTML = `
      <div class="grafico-vazio">
        Ainda não há matrículas ativas.
      </div>
    `;
  } else {

    const porCurso = new Map();

    matriculasGrafico.forEach(
      (matricula) => {

        const nomeCurso =
          matricula.cursos?.nome ||
          "Curso removido";

        porCurso.set(
          nomeCurso,
          (porCurso.get(nomeCurso) || 0) + 1
        );
      }
    );

    const cursos =
      [...porCurso.entries()]
        .sort(
          (a, b) => b[1] - a[1]
        );

    const largura = 600;
    const altura = 280;

    const margem = {
      esquerda: 42,
      direita: 20,
      topo: 25,
      baixo: 55
    };

    const graficoLargura =
      largura -
      margem.esquerda -
      margem.direita;

    const graficoAltura =
      altura -
      margem.topo -
      margem.baixo;

    const maiorValor =
      Math.max(
        ...cursos.map(
          (curso) => curso[1]
        ),
        1
      );

    const larguraBarra =
      graficoLargura /
      cursos.length *
      0.55;

    const espaco =
      graficoLargura /
      cursos.length;

    const barras =
      cursos
        .map(
          ([nome, quantidade], indice) => {

            const x =
              margem.esquerda +
              indice * espaco +
              (espaco - larguraBarra) / 2;

            const alturaBarra =
              (
                quantidade /
                maiorValor
              ) *
              graficoAltura;

            const y =
              margem.topo +
              graficoAltura -
              alturaBarra;

            const nomeCurto =
              nome.length > 16
                ? nome.slice(0, 15) + "…"
                : nome;

            return `
              <rect
                x="${x}"
                y="${y}"
                width="${larguraBarra}"
                height="${alturaBarra}"
                rx="6"
                class="grafico-barra"
              >
                <title>
                  ${esc(nome)}: ${quantidade} matrícula(s)
                </title>
              </rect>

              <text
                x="${x + larguraBarra / 2}"
                y="${y - 8}"
                text-anchor="middle"
                class="grafico-valor"
              >
                ${quantidade}
              </text>

              <text
                x="${x + larguraBarra / 2}"
                y="${altura - 17}"
                text-anchor="middle"
                class="grafico-legenda"
              >
                ${esc(nomeCurto)}
              </text>
            `;
          }
        )
        .join("");

    const linhas = [];

    for (let i = 0; i <= 5; i++) {

      const valor =
        Math.round(
          (maiorValor / 5) * i
        );

      const y =
        margem.topo +
        graficoAltura -
        (
          valor /
          maiorValor
        ) *
        graficoAltura;

      linhas.push(`
        <line
          x1="${margem.esquerda}"
          y1="${y}"
          x2="${largura - margem.direita}"
          y2="${y}"
          class="grafico-grade"
        />

        <text
          x="${margem.esquerda - 8}"
          y="${y + 4}"
          text-anchor="end"
          class="grafico-eixo"
        >
          ${valor}
        </text>
      `);
    }

    areaMatriculas.innerHTML = `
      <svg
        viewBox="0 0 ${largura} ${altura}"
        role="img"
        aria-label="Matrículas por curso"
      >

        ${linhas.join("")}

        ${barras}

      </svg>
    `;
  }
}


// ===============================
// CADASTRAR QUESTÃO
// ===============================

async function cadastrarQuestao(
  manterParaProxima = false
) {
  const cursoId =
    $("questao-curso").value;

  const pergunta =
    $("questao-pergunta").value.trim();

  const opcaoA =
    $("questao-a").value.trim();

  const opcaoB =
    $("questao-b").value.trim();

  const opcaoC =
    $("questao-c").value.trim();

  const corretaA =
    $("questao-correta-a").checked;

  const corretaB =
    $("questao-correta-b").checked;

  const corretaC =
    $("questao-correta-c").checked;

  const botao =
    $("btn-cadastrar-questao");

  const botaoProxima =
    $("btn-cadastrar-questao-proxima");

  const mensagem =
    $("msg-cadastrar-questao");

  mensagem.hidden = true;

  if (
    !cursoId ||
    !pergunta ||
    !opcaoA ||
    !opcaoB ||
    !opcaoC
  ) {
    mensagem.textContent =
      "Preencha o curso, a pergunta e as três alternativas.";

    mensagem.hidden = false;

    return;
  }

  const corretas = [
    corretaA,
    corretaB,
    corretaC
  ].filter(Boolean).length;

  if (corretas !== 1) {
    mensagem.textContent =
      "Marque apenas uma alternativa como correta.";

    mensagem.hidden = false;

    return;
  }

  const respostaCorreta =
    corretaA
      ? 1
      : corretaB
        ? 2
        : 3;

  const {
    count,
    error: erroContagem
  } = await supabase
    .from("questoes")
    .select("id", {
      count: "exact",
      head: true
    })
    .eq("curso_id", cursoId);

  if (erroContagem) {
    mensagem.textContent =
      "Não foi possível verificar as perguntas existentes.";

    mensagem.hidden = false;

    return;
  }

  if (count >= 10) {
    mensagem.textContent =
      "Este curso já possui 10 perguntas. O limite foi atingido.";

    mensagem.hidden = false;

    return;
  }

  if (botao) {
    botao.disabled = true;
  }

  if (botaoProxima) {
    botaoProxima.disabled = true;
  }

  if (manterParaProxima) {
    if (botaoProxima) {
      botaoProxima.textContent =
        "Salvando...";
    }
  } else if (botao) {
    botao.textContent =
      "Salvando...";
  }

  const ordem =
    count + 1;

  const { error } =
    await supabase
      .from("questoes")
      .insert({
        curso_id: cursoId,
        pergunta,
        opcao_a: opcaoA,
        opcao_b: opcaoB,
        opcao_c: opcaoC,
        resposta_correta: respostaCorreta,
        ordem
      });

  if (error) {
    console.error(
      "Erro ao cadastrar questão:",
      error
    );

    mensagem.textContent =
      "Erro ao cadastrar pergunta: " +
      error.message;

    mensagem.hidden = false;

    if (botao) {
      botao.disabled = false;
      botao.textContent =
        "Cadastrar pergunta";
    }

    if (botaoProxima) {
      botaoProxima.disabled = false;
      botaoProxima.textContent =
        "Cadastrar pergunta e próxima";
    }

    return;
  }

  mensagem.textContent =
    `Pergunta ${ordem} adicionada com sucesso.`;

  mensagem.hidden = false;

  $("questao-pergunta").value = "";
  $("questao-a").value = "";
  $("questao-b").value = "";
  $("questao-c").value = "";

  $("questao-correta-a").checked = false;
  $("questao-correta-b").checked = false;
  $("questao-correta-c").checked = false;

  if (botao) {
    botao.disabled = false;
    botao.textContent =
      "Cadastrar pergunta";
  }

  if (botaoProxima) {
    botaoProxima.disabled = false;
    botaoProxima.textContent =
      "Cadastrar pergunta e próxima";
  }

  if (count + 1 >= 10) {
    mensagem.textContent =
      `Pergunta ${ordem} adicionada. Este curso atingiu o limite de 10 perguntas.`;
  }
}


// ===============================
// INICIALIZAÇÃO
// ===============================

async function init() {
  const perfil =
    await exigirPerfil("admin");

  if (!perfil) return;

  $("admin-nome").textContent =
    perfil.nome;

  $("btn-sair").addEventListener(
    "click",
    sair
  );

  document
    .querySelectorAll("[data-tab]")
    .forEach((b) => {
      b.addEventListener(
        "click",
        () =>
          abrirAba(
            b.dataset.tab
          )
      );
    });

  $("form-cadastrar-aluno")
    .addEventListener(
      "submit",
      cadastrarAluno
    );

  $("form-cadastrar-curso")
    .addEventListener(
      "submit",
      cadastrarCurso
    );

  $("btn-matricular")
    .addEventListener(
      "click",
      matricularAluno
    );

  if ($("btn-cadastrar-questao")) {
    $("btn-cadastrar-questao")
      .addEventListener(
        "click",
        () => cadastrarQuestao(false)
      );
  }

  if ($("btn-cadastrar-questao-proxima")) {
    $("btn-cadastrar-questao-proxima")
      .addEventListener(
        "click",
        () => cadastrarQuestao(true)
      );
  }

  if ($("btn-ver-curso")) {
    $("btn-ver-curso")
      .addEventListener(
        "click",
        verCurso
      );
  }

  if ($("btn-ver-perguntas")) {
    $("btn-ver-perguntas")
      .addEventListener(
        "click",
        verPerguntas
      );
  }

  if ($("curso-imagem-arquivo")) {
    $("curso-imagem-arquivo")
      .addEventListener(
        "change",
        () => {
          const arquivo =
            $("curso-imagem-arquivo")
              .files?.[0];

          const container =
            $("preview-curso-imagem-container");

          const preview =
            $("preview-curso-imagem");

          if (!container || !preview) return;

          if (!arquivo) {
            container.style.display = "none";
            preview.removeAttribute("src");
            return;
          }

          if (!arquivo.type.startsWith("image/")) {
            container.style.display = "none";
            preview.removeAttribute("src");
            return;
          }

          const leitor =
            new FileReader();

          leitor.onload = () => {
            preview.src =
              leitor.result;

            container.style.display =
              "block";
          };

          leitor.readAsDataURL(
            arquivo
          );
        }
      );
  }

  if ($("questao-correta-a")) {
    $("questao-correta-a")
      .addEventListener(
        "change",
        () => {
          if ($("questao-correta-a").checked) {
            $("questao-correta-b").checked = false;
            $("questao-correta-c").checked = false;
          }
        }
      );
  }

  if ($("questao-correta-b")) {
    $("questao-correta-b")
      .addEventListener(
        "change",
        () => {
          if ($("questao-correta-b").checked) {
            $("questao-correta-a").checked = false;
            $("questao-correta-c").checked = false;
          }
        }
      );
  }

  if ($("questao-correta-c")) {
    $("questao-correta-c")
      .addEventListener(
        "change",
        () => {
          if ($("questao-correta-c").checked) {
            $("questao-correta-a").checked = false;
            $("questao-correta-b").checked = false;
          }
        }
      );
  }

  if ($("tb-solicitacoes")) {
    $("tb-solicitacoes")
      .addEventListener(
        "click",
        (e) => {
          const b =
            e.target.closest(
              "[data-autorizar]"
            );

          if (b) {
            autorizarAcesso(
              b.dataset.autorizar,
              b
            );
          }
        }
      );
  }

  if ($("tb-alunos")) {
    $("tb-alunos")
      .addEventListener(
        "click",
        (e) => {
          const status =
            e.target.closest(
              "[data-status-aluno]"
            );

          if (!status) return;

          alterarAluno(
            status.dataset.statusAluno,
            status.dataset.removido === "true",
            status
          );
        }
      );
  }


  // ===============================
  // AÇÕES DOS CURSOS
  // ===============================

  if ($("tb-cursos")) {
    $("tb-cursos")
      .addEventListener(
        "click",
        (e) => {

          const renomear =
            e.target.closest(
              "[data-renomear-curso]"
            );

          if (renomear) {
            renomearCurso(
              renomear.dataset.renomearCurso,
              renomear
            );

            return;
          }

          const remover =
            e.target.closest(
              "[data-remover-curso]"
            );

          if (remover) {
            removerCurso(
              remover.dataset.removerCurso,
              remover
            );

            return;
          }

          const ativar =
            e.target.closest(
              "[data-ativar-curso]"
            );

          if (ativar) {
            ativarCurso(
              ativar.dataset.ativarCurso,
              ativar
            );

            return;
          }
        }
      );
  }


  document.body.hidden = false;

  await prepararMatricula();

  await Promise.all([
    carregarAlunos(),
    carregarCursos(),
    carregarMatriculas(),
    carregarSolicitacoes(),
    carregarGraficos()
  ]);
}

init();
