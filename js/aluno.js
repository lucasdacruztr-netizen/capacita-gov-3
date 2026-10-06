/* =========================================================
   CAPACITA GOV — CARTÕES DE CURSOS DO ALUNO
   Ajuste visual final
   ========================================================= */

.secao-catalogo .cursos-grid,
.secao-meus-cursos .cursos-grid,
#catalogo-cursos,
#cursos {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(280px, 1fr)
  );
  gap: 1.5rem;
  align-items: stretch;
}


/* ===============================
   CARTÃO
   =============================== */

#catalogo-cursos .curso-card,
#cursos .curso-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  padding: 0 !important;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  box-shadow:
    0 2px 5px rgba(15, 23, 42, 0.04),
    0 8px 24px rgba(15, 23, 42, 0.06);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}


#catalogo-cursos .curso-card:hover,
#cursos .curso-card:hover {
  transform: translateY(-4px);
  border-color: #bfdbfe;
  box-shadow:
    0 8px 18px rgba(15, 23, 42, 0.08),
    0 18px 35px rgba(37, 99, 235, 0.08);
}


/* ===============================
   IMAGEM
   =============================== */

#catalogo-cursos .curso-imagem,
#cursos .curso-imagem {
  display: block;
  width: 100%;
  height: 175px;
  flex-shrink: 0;
  object-fit: cover;
  margin: 0 !important;
  border: 0;
  border-radius: 0 !important;
  background:
    linear-gradient(
      135deg,
      #dbeafe 0%,
      #eff6ff 50%,
      #f8fafc 100%
    );
}


/* Área neutra quando o curso não possui imagem */

#catalogo-cursos .curso-imagem-vazia,
#cursos .curso-imagem-vazia {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}


#catalogo-cursos .curso-imagem-vazia::after,
#cursos .curso-imagem-vazia::after {
  content: "CURSO";
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #2563eb;
  opacity: 0.55;
}


/* ===============================
   CONTEÚDO
   =============================== */

#catalogo-cursos .curso-card-conteudo,
#cursos .curso-card-conteudo {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  padding: 1.25rem;
}


/* ===============================
   CATEGORIA
   =============================== */

#catalogo-cursos .curso-categoria,
#cursos .curso-categoria {
  display: inline-flex;
  align-self: flex-start;
  width: fit-content;
  max-width: 100%;
  margin: 0 0 0.65rem;
  padding: 0.32rem 0.65rem;
  border: 1px solid #dbeafe;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}


/* ===============================
   TÍTULO
   =============================== */

#catalogo-cursos .curso-titulo,
#cursos .curso-titulo {
  margin: 0;
  color: #0f2f6f;
  font-size: 1.08rem;
  font-weight: 750;
  line-height: 1.35;
}


/* ===============================
   DESCRIÇÃO
   =============================== */

#catalogo-cursos .curso-descricao,
#cursos .curso-descricao {
  margin: 0.7rem 0 0;
  color: #64748b;
  font-size: 0.88rem;
  line-height: 1.55;

  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}


/* ===============================
   CARGA HORÁRIA
   =============================== */

#catalogo-cursos .curso-meta,
#cursos .curso-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 1rem;
  color: #64748b;
  font-size: 0.82rem;
  font-weight: 600;
}


/* ===============================
   BOTÃO
   =============================== */

#catalogo-cursos .curso-btn,
#cursos .curso-btn {
  width: 100%;
  margin-top: auto;
  padding: 0.72rem 1rem;
  border-radius: 10px;
  font-weight: 700;
}


/* Quando o botão aparece,
   cria espaço entre meta e botão */

#catalogo-cursos .curso-meta + .curso-btn,
#cursos .curso-meta + .curso-btn {
  margin-top: 1.2rem;
}


/* ===============================
   CATÁLOGO
   =============================== */

.secao-catalogo {
  margin-top: 0;
}


.secao-catalogo > h2,
#catalogo > h2 {
  margin-bottom: 1rem;
}


/* ===============================
   CATEGORIAS
   =============================== */

#categorias {
  margin-bottom: 1.5rem !important;
  gap: 0.55rem !important;
}


#categorias .categoria-btn {
  border-radius: 999px;
}


/* ===============================
   ESTADO SEM CURSOS
   =============================== */

#catalogo-cursos > .estado,
#cursos > .estado {
  grid-column: 1 / -1;
  margin: 0;
}


/* ===============================
   RESPONSIVO
   =============================== */

@media (max-width: 700px) {

  #catalogo-cursos,
  #cursos {
    grid-template-columns: 1fr;
    gap: 1rem;
  }


  #catalogo-cursos .curso-imagem,
  #cursos .curso-imagem {
    height: 165px;
  }


  #catalogo-cursos .curso-card-conteudo,
  #cursos .curso-card-conteudo {
    padding: 1.1rem;
  }
}


@media (min-width: 1100px) {

  #catalogo-cursos,
  #cursos {
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
  }
}
