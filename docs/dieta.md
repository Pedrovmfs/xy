# Dieta do Pedro — dados iniciais da Nutrição

> Montada em conversa em 01/10/2026. É o seed da ramificação **Nutrição** do app.
> Valores **aproximados** (tabela TACO e rótulos comuns). No app, cada alimento deve usar o rótulo do produto que o Pedro compra de verdade.

## Como a dieta funciona: meta, não grade

O Pedro **não é regrado** e não quer ser: nada de horários fixos, número fixo de refeições ou "refeição X tem que ter Y". Só existem duas regras:

| Regra | Valor |
|---|---|
| **Proteína** | bater **~190–200 g/dia** (o objetivo principal) |
| **Calorias** | não passar de **~1.960 kcal/dia** (déficit) |
| Refeições livres | 2 por semana |

A dieta é o **conjunto do dia**, não cada refeição: existem infinitas combinações que fecham a meta. Vai ter dia com fome antes de dormir, dia sem fome antes da academia, dia com almoço atrasado e já cheio. **Qualquer opção do cardápio vale a qualquer hora.** Buscar flexibilidade e praticidade, nunca regra.

Como, quando e em quantas refeições ele chega lá é livre. O app:
- mostra o progresso do dia ("faltam 60 g de proteína, sobram 700 kcal");
- sugere jeitos fáceis de **fechar a proteína** com o que tem em casa;
- filtra **"o que cabe agora"**: opções que encaixam na proteína e nas calorias que ainda restam no dia;
- nunca cobra horário ou refeição pulada.

O que é comum hoje (não é regra): sem café da manhã (acorda no limite pra faculdade), almoço depois da aula, às vezes algo antes da academia, jantar depois da academia e antes do Attual (19:30). Ele quase nunca sente fome e cresceu fazendo só almoço e jantar. **Não quer comer depois do Attual** nem ter muitos momentos de comer no dia.

## Esforço = preparo + louça

O critério de "fácil" inclui **a louça**. Frigideira = preparar + esperar + lavar (~30 min no total). O app deve classificar cada opção pelo esforço real:

| Nível | Exemplo |
|---|---|
| **0** — sem preparo, sem louça (no máximo faca/papel toalha) | sanduíche frio, Snow Flakes na mão, whey com água |
| **1** — micro-ondas ou 1 utensílio simples | sanduíche 30 s no micro-ondas, bolo de caneca |
| **2** — frigideira/airfryer + lavar | sanduíche na frigideira, tapioca, pizza de pão de forma |
| **3** — cozinhar de verdade | domingo de cozinha |

## Ingredientes "da casa" vs. "meus"

- **Da casa:** leite e iogurte. A irmã do Pedro consome muito leite; **podem sumir a qualquer hora**. Nenhuma opção pode depender deles; se tiver, é bônus.
- **Meus:** proteína porcionada, whey, pão, mussarela, Snow Flakes, doce de leite. Esses o app controla no estoque.

## Cardápio de consulta

### Almoço (o que ele já faz e funciona)

**Arroz pronto 150–250 g + proteína crua 250–350 g + feijão quando tiver.** Ele **pesa**: arroz já pronto, proteína **crua**. Arroz não é ele quem faz (fora do planejamento de preparo, mas entra na conta).

| Proteína (300 g crus) + arroz 200 g | Total |
|---|---|
| Peito de frango | ~615 kcal · ~70 g |
| Contrafilé **sem a gordura** (ele tira) | ~725 kcal · ~77 g |
| Coxão mole moído | ~765 kcal · ~69 g |
| Linguiça fininha Perdigão/Sadia (200 g, rara) | ~710 kcal · ~37 g |
| + 1 concha de feijão | +75 kcal · +5 g |

Mais perto de 350 g de proteína crua = +~10 g de proteína.

### Sanduíches e afins (jantar comum)

Base: **4 fatias de pão de forma (2 sanduíches) + proteína + mussarela.** Variar pelo **molho** e pelo **jeito de fazer**, não pela proteína.

| Opção | Valores | Esforço |
|---|---|---|
| Sanduíches de frango desfiado 150 g com mussarela | ~595 kcal · ~66 g | 0 frio / 1 micro-ondas / 2 frigideira |
| Sanduíches de frango desfiado 200 g com mussarela (reforçado) | ~680 kcal · ~80 g | 0 / 1 / 2 |
| Sanduíches de carne moída 130 g com mussarela | ~635 kcal · ~61 g | 0 / 1 / 2 |
| Sanduíches de bife 140 g com mussarela | ~625 kcal · ~69 g | 2 |
| Pizza de pão de forma (molho de tomate, mussarela, frango) | ~615 kcal · ~63 g | 2 (airfryer 8 min) |
| Wrap (Rap10) de frango com mussarela | ~585 kcal · ~60 g | 0 / 2 |
| Tapioca de frango ou carne moída com queijo | ~400–535 kcal · ~36–43 g | 2 |

Molhos (opcionais; normalmente não usa, mas gosta de quase todos): requeijão, barbecue, ketchup, molho de tomate (+20–50 kcal). **Maionese** pesa: ~100 kcal por colher.

### Coisas rápidas (antes da academia ou quando der vontade)

| Opção | Valores | Esforço |
|---|---|---|
| 1 pão com frango desfiado 100 g e mussarela (frio ou micro-ondas) | ~410 kcal · ~42 g | 0–1 |
| Pão com doce de leite + whey com água | ~335 kcal · ~29 g | 0 |
| Snow Flakes na mão + whey com água | ~270 kcal · ~26 g | 0 |
| Bolo de caneca de banana com canela (ovo + whey + banana) | ~280 kcal · ~32 g | 1 |
| Panqueca salgada (2 ovos + aveia, frango e mussarela) | ~420 kcal · ~46 g | 2 |
| *Se tiver leite:* leite + Snow Flakes + whey | ~420 kcal · ~33 g | 1 |

Café 30–40 min antes do treino funciona como pré-treino.

### Ceia (fome antes de dormir, depois do Attual)

Pouca louça, sem leite, sem whey bebido. Aprovadas pelo Pedro:

| Opção | Valores | Louça |
|---|---|---|
| **Frango cremoso no pote:** frango desfiado 150 g + 1 colher de requeijão + mussarela, 1 min no micro-ondas, come no pote | ~365 kcal · ~55 g | pote e garfo |
| Carne moída 100 g + mussarela no pote, micro-ondas | ~320 kcal · ~40 g | pote e garfo |
| Sanduíche de frango com mussarela, frio ou 30 s no micro-ondas | ~300 kcal · ~35 g | nenhuma |
| **Creme de whey:** whey + 2–3 colheres de água, mexido até virar creme grosso, Snow Flakes por cima (come de colher) | ~195 kcal · ~25 g | copo e colher |
| Bolo de caneca de banana com canela | ~280 kcal · ~32 g | caneca e garfo |

Descartada: pão com doce de leite sozinho (gostoso, mas quase sem proteína). Se quiser o doce: pão com mussarela derretida e doce de leite ("romeu e julieta"), ~290 kcal · ~14 g.

### Fechadores de proteína

Pra quando o dia está chegando ao fim e falta proteína:

| Fechador | Proteína | Calorias | Esforço |
|---|---|---|---|
| Whey com água (junto de qualquer refeição; ele não curte muito) | ~24 g | ~120 kcal | 0 (coqueteleira) |
| Creme de whey (de colher) | ~24 g | ~120 kcal | 1 |
| +50 g de frango desfiado no sanduíche | ~16 g | ~80 kcal | 0 |
| +50 g de proteína crua no almoço | ~10–12 g | ~60–85 kcal | 0 |

## Plano B (estoque acabou)

- **Frango desfiado pronto congelado** de mercado (Seara, Sadia…): dura meses no freezer.
- Último recurso: presunto ou peito de peru (come, mas não é fã).
- **Sem frutos do mar.**

## Gostos do Pedro

| Gosta / come bem | Come, mas não é fã | Não gosta |
|---|---|---|
| frango desfiado, carne moída, bife, mussarela, pão de forma, pão francês, tapioca, doce de leite, Snow Flakes, banana (só junto de outra coisa) | ovo, presunto, whey batido pra beber | frutos do mar, pasta de amendoim, chocolate, agridoce, fruta sozinha (não sacia), produtos caros tipo YoPRO |

- Não enjoa fácil (come o mesmo jantar 2 semanas); o problema é **preguiça de repor o estoque** e de **louça**.
- Quer abrir o paladar pra **salmão** no futuro (sugestão: airfryer, ~12 min, sal e limão).

## Compras, estoque e preparo

- Mercado **uma vez por mês**; proteína vai pro freezer.
- **Ao chegar do mercado, porcionar a proteína em ~300 g antes de congelar.** Descongelar só a porção do dia seguinte na geladeira.
- Segurança: carne crua descongelada na geladeira dura **1–2 dias** (frango e carne moída) ou **3–5 dias** (bife). Não voltar pro freezer depois disso.
- **Domingo de cozinha (14h–16h):** frango desfiado e carne moída. Cozido dura **3–4 dias na geladeira**; o resto congela em porções. Opcional: já deixar sanduíches montados e embrulhados pra comer frios ou no micro-ondas.
- Whey atual: **cookies and cream**, 1 medida por dose; pretende comprar baunilha.
- Equipamentos: airfryer, sanduicheira, micro-ondas (panela de pressão e batedeira: a confirmar).

## Pendências

- [ ] Quanto compra por mês de cada proteína ("3–5 kg": cada uma ou total? só o almoço consome ~9 kg/mês)
- [ ] Marca/rótulo do whey e do pão de forma
- [ ] Se come sanduíche frio ou de micro-ondas de boa
