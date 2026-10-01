# xy — Visão do produto

> Documento vivo. É a fonte de verdade sobre **o que** o app é e **por quê**.
> Decisões de conceito são tomadas em conversa com o Claude (chat) e registradas aqui.
> Nome do app ainda em aberto; "xy" é provisório.

## Por que este app existe

O Pedro passou por um período de mudança e trabalhou muito a própria cabeça. Por dentro, mudou.
Mas o físico e o cotidiano (atividades diárias, responsabilidades, alimentação, treino) continuaram iguais.

O app existe para:

- **Olhar a vida como ela realmente é.** Reconhecer que não arruma o quarto todo dia e decidir se isso incomoda ou não. Ver as semanas em que foi à academia e se sentir satisfeito, ou ver que precisa mudar.
- **Controlar a vida, e não ser controlado por ela.**
- Facilitar o registro e dar uma motivação a mais.

Uso pessoal, praticamente sempre. Não é produto para o público.

## Princípio central: espelho, não juiz

O app mostra os fatos de forma neutra. O julgamento é do Pedro.

- Nada de sequências que "quebram", troféus, confete, notificações de cobrança.
- Sem vermelho gritando para o que não foi feito. Os números aparecem como foram: "4 de 5 treinos", "quarto arrumado 3 de 7 dias".
- Tudo que é reflexão (fechamento do dia, resumo, resgate de pensamentos) é **opcional e discreto**. Nunca um botão chamativo. Se o Pedro ignorar, nada acontece.

## O dia é a unidade

O **calendário é o centro** do app. A tela principal é sempre o **Hoje**. Todo o resto são **ramificações** para onde os itens do dia levam.

### Tipos de item do dia

| Tipo | O que é | Exemplo |
|---|---|---|
| **Bloco** | Tem horário | Aula 8:10–10:40, Academia 16:30–18:00, Attual 19:30–21:00 |
| **Tarefa** | Sem horário, só precisa acontecer no dia | Spaço Eventos, trabalhos do pai |
| **Hábito** | Mini-checkbox discreta de atividade básica | Arrumar a cama, limpar o quarto, passear com o cachorro |
| **Contador** | Meta diária que vai enchendo | Água |
| **Registro** | Dado anotado | Peso, sono |

Itens podem ser **recorrentes** (rotina-modelo semanal) ou **avulsos** (só numa data).
A rotina é **totalmente editável** pelo usuário.

### Estados de um item

Três estados, não dois:

1. **Feito**
2. **Não feito, com motivo** — motivo opcional: texto curto ou atalhos ("doente", "trabalho", "sem vontade"...)
3. **Não feito, sem motivo**

A justificativa existe para o reconhecimento: faltar 3 dias com motivo é diferente de faltar 3 dias sem motivo, e as duas coisas são úteis de saber.

### Notas nos itens

Todo item do dia aceita um comentário: "Aula: atividade de modelagem", "Attual: fechei 2 pedidos".
As notas de itens ligados a uma área também aparecem no histórico daquela área.

### Metas semanais flexíveis

Algumas coisas têm meta por semana, não por dia. Ex.: **treino 5 de 7**.
O calendário sugere os dias, mas se o Pedro faltar na segunda, pode compensar na quinta (que no papel é descanso). A contagem é semanal.

### Hábitos básicos

- O **próprio usuário define** a lista (e em quais dias cada um vale). O sistema só armazena.
- No Hoje: uma linha discreta de bolinhas pequenas, não chamativas.
- **Revisão mensal, discreta:** mostra cada hábito e pergunta "isso te incomoda?". Se não incomoda, sai da lista sem culpa.

### Comentário do dia / fechamento

- Linha pequena no fim do Hoje, que só aparece à noite: "anotar algo sobre hoje".
- Opcional de verdade. O resumo "Hoje eu…" (gerado a partir do que foi marcado) fica aqui dentro, discreto — o Pedro acha que os dias dele são parecidos e isso não pode virar obrigação.

## Ramificações

### Treino
- Já existe um app de treino do Pedro: <https://github.com/Pedrovmfs/treino> (PWA em JS puro, IndexedDB). Serve de **referência de lógica** (registro de séries, tipos aquec/prep/válida, 1RM Epley, PRs, volume semanal, timer de descanso, backlog). O **layout/design dele não é referência**.
- No xy, o bloco "Academia" abre o treino do dia. Terminou o treino, o bloco marca sozinho.
- Meta semanal (5 treinos).
- O app antigo já é bem customizável; a ideia é **retrabalhar e aprimorar** essa base, não só copiar. Foco grande nessa parte.
- **Não é preciso importar** os dados do app antigo (quase nada registrado).

### Nutrição
> Plano alimentar completo, gostos e regras de estoque: **[`docs/dieta.md`](docs/dieta.md)** (seed da Nutrição).

- Dieta própria, nos termos do Pedro, flexível e com **muitas opções de pouco preparo**. O problema dele não é enjoar (come o mesmo jantar por 2 semanas), é a **preguiça de repor o estoque**.
- **Meta, não grade.** O Pedro não é regrado: só existem duas regras, bater **~190–200 g de proteína** e não passar de **~1.960 kcal**. Sem horários fixos nem número fixo de refeições. O app mostra o progresso ("faltam 60 g") e sugere **fechadores de proteína** fáceis; nunca cobra refeição pulada.
- Não quer muitos momentos de comer no dia nem comer depois do Attual.
- **Refeições como molde**: estrutura fixa + espaço variável. Ex.: jantar = pão de forma + mussarela + **proteína**; almoço = arroz + **proteína**. Quando um ingrediente acaba, o molde continua e só troca o recheio.
- **Cardápio de consulta** (não plano), cada opção com calorias, proteína e **esforço = preparo + louça** (0 = sem louça, 1 = micro-ondas, 2 = frigideira/airfryer + lavar, 3 = cozinhar). Filtro "o que dá pra fazer com o que tenho".
- **Ingredientes "da casa" vs. "meus":** leite e iogurte são da casa e podem sumir (a irmã consome muito); nenhuma opção depende deles. O estoque controlado é só o dele.
- Variar pelo **molho** e pelo **jeito de fazer** (frio, sanduicheira, airfryer), não só pela proteína.
- **Estoque** em porções: proteína crua porcionada (~300 g) ao voltar do mercado mensal; frango desfiado e carne moída do domingo. O app mostra quanto resta e avisa **antes** de acabar.
- **Plano B automático**: quando o estoque acaba, mostra as opções que não dependem dele.
- **Domingo de cozinha** (14h–16h): o item no calendário abre a lista do que preparar; o que foi feito vira estoque.
- **Lista de compras** gerada a partir do que foi comido/planejado (compra mensal).
- Registro rápido: "repetir ontem", favoritos, opções do banco como porção pronta. Pesagem: arroz pronto, proteína **crua**.
- Alimentos avulsos pela **tabela TACO**, embutida no app (offline); produtos industrializados pelo rótulo.

### Corpo
- Água (contador), peso, sono.
- Peso com média móvel de 7 dias (o peso diário oscila).
- **Sem HealthKit** (exige conta paga da Apple). Sono/passos/peso podem vir depois via **app Atalhos do iOS** abrindo um link do app com os valores.
- **Não registrar** humor nem energia (decisão do Pedro).

### Áreas / Projetos
- Abas por área: Attual Camisetas, Spaço Eventos, trabalhos do pai, faculdade, casa...
- Cada área mostra o histórico de notas dos itens dela — para **reconhecer os próprios trabalhos**.
- **Próximo passo** por área: guarda só a próxima ação, para nunca abrir e pensar "onde parei?".

### Pensamentos
- Não é diário de sentimentos: são pensamentos que agregam e poderiam ser esquecidos. O Pedro tem um caderno físico, mas nem sempre está com ele.
- **Captura em 1 toque de qualquer tela** (botão pequeno fixo → só um campo de texto).
- Cada pensamento guarda data/hora e fica ligado ao dia.
- Aba própria com busca e etiquetas opcionais.
- **Resgate opcional, escolhido na hora de salvar**: "me lembra disso em 1 semana / 1 mês / 3 meses...". Quando chega a data, aparece discreto no Hoje.
- Possibilidade de passar para o app o que está no caderno físico.

### Semana
- Visão de semanas: o que foi cumprido de cada coisa, faltas com e sem motivo, metas semanais.
- É onde se edita a rotina-modelo.

## Rotina atual do Pedro (dados iniciais)

| Dia | Itens |
|---|---|
| Segunda | Academia 16:30–18:00 · Attual 19:30–21:00 · tarefas: Spaço Eventos, trabalhos do pai |
| Terça | Aula 8:10–10:40 · Academia 16:30–18:00 · Attual 19:30–21:00 |
| Quarta | Aula 9:00–11:30 · Academia 16:30–18:00 · Attual 19:30–21:00 |
| Quinta | Aula 9:00–11:30 · Attual 19:30–21:00 (descanso da academia no papel) |
| Sexta | Aula 10:40–13:10 · Academia 16:30–18:00 · Attual 19:30–21:00 |
| Sábado | Academia ~14:00–15:30 (horário livre) · tarefas: Spaço Eventos, trabalhos do pai |
| Domingo | Cozinhar para a semana 14:00–16:00 · tarefas: Spaço Eventos, trabalhos do pai |

Obs.: Attual de segunda a sexta foi uma suposição, a confirmar. Spaço Eventos e trabalhos do pai: horário livre, mas obrigatórios no dia (sábado a segunda).

## Ordem de construção

1. **Núcleo:** Hoje + rotina editável (recorrente e avulsa) + estados com motivo + notas + hábitos + pensamentos + áreas + backup.
2. **Treino** como ramificação.
3. **Nutrição.**
4. **Corpo** (água, peso, sono) e Atalhos do iOS.
5. **Redesign/polimento** contínuo.

## Backlog de ideias pequenas

- [ ] "Hoje eu…" — resumo automático do dia, dentro do comentário do dia (discreto)
- [ ] Próximo passo por área
- [ ] Lista de compras a partir da comida da semana
- [ ] "Nesse dia, há um ano" — gostou, mas **precisa refinar** antes de fazer
- [ ] Revisão mensal de hábitos ("isso te incomoda?")
- [ ] Lembrete discreto de backup
- [ ] Sono via Atalhos do iOS
- [ ] Lista de "comidas pra experimentar" (ex.: salmão), pra abrir o paladar aos poucos
- [ ] "O que cabe agora": filtrar o cardápio pelo que ainda resta de proteína e calorias no dia
- [ ] Aviso de estoque acabando + sugestão de repor no próximo domingo

(Adicionar novas ideias no fim. O Pedro quer estar sempre incrementando o app: sugestões grandes/essenciais e pequenas são bem-vindas; nenhuma ideia deve ser descartada por parecer irrelevante.)
