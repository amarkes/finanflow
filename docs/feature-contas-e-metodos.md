# Feature – Métodos de Pagamento com Atalhos & Contas

Esta feature adiciona atalhos para o campo “Método de Pagamento” e o conceito de contas com limites/saldos vinculadas às transações.

---

## O que mudou?
- O formulário de transação traz chips clicáveis (Cartão de crédito, Pix, etc.) para preencher o método rapidamente.
- Toda transação pode apontar para uma conta (`credit_card`, `cash`, `pix`, etc.), exibindo limite disponível ou saldo estimado.
- A listagem de transações ganhou filtro por conta e coluna dedicada para mostrar o nome/tipo.
- O Dashboard agora exibe um card “Contas” com totais consolidados (limite de cartões, saldos estimados) e a lista de contas ativas.

---

## Fluxo no formulário
1. Escolha o método de pagamento clicando em um atalho ou digite manualmente.
2. Se o método exigir uma conta (ex.: Cartão de crédito), selecione uma das contas compatíveis.
3. O hint abaixo do seletor mostra:
   - `Limite disponível: R$ ...` para cartões (cálculo feito com base em despesas não pagas).
   - `Saldo estimado: R$ ...` para métodos que controlam saldo.
4. Salve normalmente; o limite não bloqueia o envio, apenas informa.

> **Dica:** cadastre múltiplos cartões ou carteiras para monitorar limites distintos.

---

## Dashboard
- Card “Contas” resume:
  - quantidade de contas ativas;
  - limite disponível total em cartões (com limite total);
  - soma de saldos estimados das demais contas.
- Cada conta aparece com tipo, limite/saldo e status (ativa/inativa).

---

## Listagem de Transações
- Novo filtro `Conta` combina com os filtros já existentes (tipo, categoria, status, busca).
- Coluna `Conta` mostra nome + tipo da conta associada.
- Demais ações (editar, excluir, alternar status) permanecem iguais.

---

## Configuração
1. Aplique a migração: `supabase db push` (ou `db reset` em ambiente local).
2. Rode `npm run build` ou `npm run dev` para garantir que os tipos foram gerados.
3. Cadastre contas via Supabase ou futura interface administrativa.
4. Crie/edite transações vinculando métodos/contas para alimentar os relatórios.

---

## Observações
- Contas ficam armazenadas na tabela `accounts`, com RLS garantindo isolamento por usuário.
- Limites e saldos são opcionais (use `null` para não controlar).
- Métodos adicionais podem ser estendidos em `PaymentMethodChips` (`PAYMENT_METHOD_OPTIONS`).
