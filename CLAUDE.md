# CLAUDE.md — instruções para o Claude Code

## Leia primeiro

**Antes de qualquer trabalho, leia `VISAO.md`.** Ele define o que o app é, o princípio "espelho, não juiz" e a ordem de construção. Decisões de conceito são tomadas fora daqui (no chat); se algo pedido contradisser o `VISAO.md`, pergunte ao Pedro antes de seguir.

## Sobre o dono

- Pedro, estudante de Engenharia de Software (UCB). Fala português; responda e escreva textos do app em **português do Brasil**.
- Ele quer **aprender** com o projeto. Explique brevemente decisões técnicas não óbvias e aponte quando algo for incerto ("não tenho certeza de X, vale confirmar na documentação"), em vez de chutar.
- Uso pessoal, no **iPhone**, instalado como PWA pela Tela de Início do Safari.

## Stack

- **React + TypeScript + Vite.** TypeScript em modo `strict`.
- **IndexedDB via Dexie** para todos os dados (`dexie-react-hooks` para ler dados reativamente).
- **vite-plugin-pwa** (service worker com precache de tudo).
- Sem back-end, sem contas, sem analytics.
- Evite dependências novas sem motivo forte; cada dependência é algo a manter.

## Regras inegociáveis

1. **100% offline depois de instalado.** Nada carregado de fora em tempo de execução: fontes via pacote npm (`@fontsource`), ícones embutidos (SVG no código), dados de referência (tabela TACO) empacotados no build.
2. **Dados só no aparelho.** Todo dado novo precisa entrar no **exportar/importar backup (JSON)**. Ao mudar o schema do Dexie, **crie uma nova versão com migração**; nunca apague dados do usuário.
3. **Espelho, não juiz.** Sem gamificação de cobrança, sem cores de alarme para o que não foi feito, reflexões sempre opcionais e discretas.
4. **Mobile first.** Largura de iPhone (~390px) é o alvo principal. Respeitar `safe-area-inset` (notch e barra inferior). Alvos de toque ≥ 44px.
5. **Tema claro e escuro** seguindo o sistema.

## Modelo de dados (ponto de partida)

Ajuste se necessário, mas mantenha a ideia de "o dia é a unidade" (datas como string `YYYY-MM-DD` no fuso local):

- `areas` — áreas/projetos (Faculdade, Treino, Attual, Spaço Eventos, Pai, Casa), com cor e "próximo passo"
- `routine` — itens recorrentes: título, tipo (`block` | `task`), área, dias da semana, início/fim opcionais
- `oneoffs` — itens avulsos numa data
- `entries` — estado de um item num dia: `done` | `skipped`, motivo opcional, nota opcional
- `habits` + `habitLogs` — hábitos definidos pelo usuário e marcações diárias
- `thoughts` — texto, data/hora, etiquetas, `resurfaceAt` opcional
- `days` — comentário do dia e registros (sono, peso, água)
- `meta` — configurações e data do último backup

A rotina inicial do Pedro está em `VISAO.md` (seção "Rotina atual") e deve ser o seed.

## Referência: app `treino`

O app antigo de treino do Pedro (<https://github.com/Pedrovmfs/treino>) é referência **de lógica** para a ramificação Treino (cálculos em `src/calc.js`, formato do backup em `src/db.js`, backlog em `BACKLOG.md`). **Não copie o layout/design.**

## Fluxo de trabalho

- Trabalhe em etapas pequenas, seguindo a ordem de construção do `VISAO.md`.
- Rode `npm run build` (que inclui checagem de tipos) antes de dizer que algo está pronto.
- Para testar no iPhone pela rede local: `npm run dev -- --host` e abrir o IP do computador no Safari.
- Commits pequenos, mensagens em português.
- Ao concluir um item do backlog do `VISAO.md`, marque-o como `[x]`.
