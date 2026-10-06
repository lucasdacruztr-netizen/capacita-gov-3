import {
  supabase,
  exigirPerfil,
  sair,
  esc,
  fmtData
} from "./config.js";


const $ = (id) =>
  document.getElementById(id);


let cursosCatalogo = [];
let cursosMatriculados = [];
let categoriaSelecionada =
  "Todas as Categorias";


// ===============================
// PERFIL
// ===============================
function mostrarPerfil(perfil) {

  const nome =
    perfil.nome || "Aluno";

  $("aluno-nome").textContent =
    nome;

  $("titulo-boas-vindas").textContent =
    `Olá, ${nome}!`;

  $("aluno-avatar-letra").textContent =
    nome
      .trim()
      .charAt(0)
      .toUpperCase();
}


// ===============================
// CATÁLOGO
// ===============================

async function carregarCatalogo() {

  const {
    data,
    error
  } = await supabase
    .from("cursos")
    .select(`
      id,
      nome,
      descricao,
      ativo,
      categoria,
      imagem_url,
      carga_horaria
    `)
    .eq(
      "ativo",
      true
    )
    .order(
      "nome",
      {
        ascending: true
      }
    );


  if (error) {

    console.error(
      "Erro ao carregar catálogo:",
      error
    );


    $("catalogo-cursos").innerHTML = `
      <div class="estado erro">
        Não foi possível carregar os cursos.
      </div>
    `;

    return;
  }


  cursosCatalogo =
    data || [];


  carregarCategorias();

  renderizarCatalogo();
}


// ===============================
// CATEGORIAS
// ===============================

function carregarCategorias() {

  const categorias = [
    "Todas as Categorias",

    ...new Set(
      cursosCatalogo
        .map(
          (curso) =>
            curso.categoria
        )
        .filter(Boolean)
    )
  ];


  $("categorias").innerHTML =
    categorias
      .map(
        (categoria) => `
          <button
            type="button"
            class="categoria-btn ${
              categoria ===
              categoriaSelecionada
                ? "ativo"
                : ""
            }"
            data-categoria="${esc(
              categoria
            )}"
          >
            ${esc(categoria)}
          </button>
        `
      )
      .join("");


  document
    .querySelectorAll(
      "[data-categoria]"
    )
    .forEach(
      (botao) => {

        botao.addEventListener(
          "click",
          () => {

            categoriaSelecionada =
              botao.dataset.categoria;


            carregarCategorias();

            renderizarCatalogo();
          }
        );

      }
    );
}


// ===============================
// RENDERIZAR CATÁLOGO
// ===============================

function renderizarCatalogo() {

  const campoBusca =
    $("campo-busca");


  const busca =
    (
      campoBusca?.value ||
      ""
    )
      .trim()
      .toLowerCase();


  const cursosFiltrados =
    cursosCatalogo.filter(
      (curso) => {

        const correspondeCategoria =
          categoriaSelecionada ===
            "Todas as Categorias" ||
          curso.categoria ===
            categoriaSelecionada;


        const correspondeBusca =
          !busca ||
          String(
            curso.nome || ""
          )
            .toLowerCase()
            .includes(busca) ||

          String(
            curso.categoria || ""
          )
            .toLowerCase()
            .includes(busca) ||

          String(
            curso.descricao || ""
          )
            .toLowerCase()
            .includes(busca);


        return (
          correspondeCategoria &&
          correspondeBusca
        );
      }
    );


  if (!cursosFiltrados.length) {

    $("catalogo-cursos").innerHTML = `
      <div class="estado">
        Nenhum curso encontrado.
      </div>
    `;

    return;
  }


  $("catalogo-cursos").innerHTML =
    cursosFiltrados
      .map(
        (curso) => {

          const matriculado =
            cursosMatriculados.some(
              (item) =>
                String(
                  item.curso_id
                ) ===
                  String(
                    curso.id
                  ) &&
                item.ativo
            );


          const imagem =
            curso.imagem_url ||
            "";


          return `
            <article
              class="card curso-card"
            >

              ${
                imagem
                  ? `
                    <img
                      src="${esc(imagem)}"
                      alt="${esc(
                        curso.nome
                      )}"
                      class="curso-imagem"
                    >
                  `
                  : `
                    <div
                      class="curso-imagem curso-imagem-vazia"
                    >
                      Capacita Gov
                    </div>
                  `
              }


              <div
                class="curso-card-conteudo"
              >

                ${
                  curso.categoria
                    ? `
                      <span
                        class="curso-categoria"
                      >
                        ${esc(
                          curso.categoria
                        )}
                      </span>
                    `
                    : ""
                }


                <h3
                  class="curso-titulo"
                >
                  ${esc(
                    curso.nome
                  )}
                </h3>


                <p
                  class="curso-descricao"
                >
                  ${
                    esc(
                      curso.descricao
                    ) ||
                    "Curso disponível na plataforma."
                  }
                </p>


                ${
                  curso.carga_horaria
                    ? `
                      <div
                        class="curso-meta"
                      >
                        <span>
                          ◷
                          ${esc(
                            curso.carga_horaria
                          )}
                          horas
                        </span>
                      </div>
                    `
                    : ""
                }


                ${
                  matriculado
                    ? `
                      <button
                        type="button"
                        class="btn"
                        data-abrir-curso="${esc(
                          curso.id
                        )}"
                      >
                        Acessar curso
                      </button>
                    `
                    : `
                      <p
                        class="mut curso-nao-matriculado"
                      >
                        Você ainda não está
                        matriculado neste curso.
                      </p>
                    `
                }

              </div>

            </article>
          `;
        }
      )
      .join("");


  document
    .querySelectorAll(
      "[data-abrir-curso]"
    )
    .forEach(
      (botao) => {

        botao.addEventListener(
          "click",
          () => {

            const cursoId =
              botao.dataset.abrirCurso;


            abrirCurso(
              cursoId
            );
          }
        );

      }
    );
}


// ===============================
// PESQUISA
// ===============================

function configurarPesquisa() {

  const campo =
    $("campo-busca");

  const botao =
    $("btn-pesquisar");


  if (campo) {

    campo.addEventListener(
      "input",
      () => {

        renderizarCatalogo();
      }
    );


    campo.addEventListener(
      "keydown",
      (event) => {

        if (
          event.key ===
          "Enter"
        ) {

          event.preventDefault();

          renderizarCatalogo();


          $("catalogo-cursos")
            ?.scrollIntoView({
              behavior:
                "smooth"
            });
        }
      }
    );
  }
}


// ===============================
// MEUS CURSOS
// ===============================

async function carregarCursos() {

  const {
    data: {
      user
    }
  } =
    await supabase.auth.getUser();


  if (!user) {

    location.replace(
      "index.html"
    );

    return;
  }


  const {
    data,
    error
  } =
    await supabase
      .from("matriculas")
      .select(`
        id,
        usuario_id,
        curso_id,
        ativo,
        cursos (
          id,
          nome,
          descricao,
          ativo,
          categoria,
          imagem_url,
          carga_horaria
        )
      `)
      .eq(
        "usuario_id",
        user.id
      )
      .eq(
        "ativo",
        true
      );


  if (error) {

    console.error(
      "Erro ao carregar meus cursos:",
      error
    );


    $("cursos").innerHTML = `
      <div class="estado erro">
        Não foi possível carregar seus cursos.
      </div>
    `;

    return;
  }


  cursosMatriculados =
    data || [];


  const cursosAtivos =
    cursosMatriculados.filter(
      (matricula) =>
        matricula.ativo &&
        matricula.cursos &&
        matricula.cursos.ativo
    );


  if (!cursosAtivos.length) {

    $("cursos").innerHTML = `
      <div class="estado">
        Você ainda não possui cursos matriculados.
      </div>
    `;

  } else {

    $("cursos").innerHTML =
      cursosAtivos
        .map(
          (matricula) => {

            const curso =
              matricula.cursos;


            if (!curso) {
              return "";
            }


            const imagem =
              curso.imagem_url ||
              "";


            return `
              <article
                class="card curso-card"
              >

                ${
                  imagem
                    ? `
                      <img
                        src="${esc(
                          imagem
                        )}"
                        alt="${esc(
                          curso.nome
                        )}"
                        class="curso-imagem"
                      >
                    `
                    : `
                      <div
                        class="curso-imagem curso-imagem-vazia"
                      >
                        Capacita Gov
                      </div>
                    `
                }


                <div
                  class="curso-card-conteudo"
                >

                  ${
                    curso.categoria
                      ? `
                        <span
                          class="curso-categoria"
                        >
                          ${esc(
                            curso.categoria
                          )}
                        </span>
                      `
                      : ""
                  }


                  <h3
                    class="curso-titulo"
                  >
                    ${esc(
                      curso.nome
                    )}
                  </h3>


                  <p
                    class="curso-descricao"
                  >
                    ${
                      esc(
                        curso.descricao
                      ) ||
                      "Curso disponível na plataforma."
                    }
                  </p>


                  ${
                    curso.carga_horaria
                      ? `
                        <div
                          class="curso-meta"
                        >
                          <span>
                            ◷
                            ${esc(
                              curso.carga_horaria
                            )}
                            horas
                          </span>
                        </div>
                      `
                      : ""
                  }


                  <button
                    type="button"
                    class="btn"
                    data-abrir-meu-curso="${esc(
                      curso.id
                    )}"
                  >
                    Acessar curso
                  </button>

                </div>

              </article>
            `;
          }
        )
        .join("");


    document
      .querySelectorAll(
        "[data-abrir-meu-curso]"
      )
      .forEach(
        (botao) => {

          botao.addEventListener(
            "click",
            () => {

              const cursoId =
                botao.dataset
                  .abrirMeuCurso;


              abrirCurso(
                cursoId
              );
            }
          );

        }
      );
  }


  // Atualiza o catálogo
  // depois que sabemos
  // quais cursos estão
  // matriculados.

  renderizarCatalogo();
}


// ===============================
// ABRIR CURSO
// ===============================

function abrirCurso(
  cursoId
) {

  console.log(
    "ID DO CURSO NO BOTÃO:",
    cursoId
  );

  if (!cursoId) {

    console.error(
      "ID do curso não informado."
    );

    return;
  }

  const id = String(cursoId).trim();

  const urlCurso =
  `${window.location.origin}/curso?id=${encodeURIComponent(id)}`;

  console.log(
    "ABRINDO CURSO:",
    urlCurso
  );

  window.location.assign(urlCurso);
}
// ===============================
// INICIALIZAÇÃO
// ===============================

async function init() {

  const perfil =
    await exigirPerfil(
      "aluno"
    );


  if (!perfil) {
    return;
  }


  mostrarPerfil(
    perfil
  );


  $("btn-sair")
    .addEventListener(
      "click",
      sair
    );


  configurarPesquisa();


  await carregarCursos();


  await carregarCatalogo();


  document.body.hidden =
    false;
}


init().catch(
  (erro) => {

    console.error(
      "Erro ao iniciar página do aluno:",
      erro
    );


    document.body.hidden =
      false;
  }
);
