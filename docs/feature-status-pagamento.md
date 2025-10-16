# Feature – Status de Pagamento das Transações

Este guia explica como utilizar o novo status de pagamento para controlar transações já quitadas ou pendentes no FinanceFlow.

---

## Visão Rápida
- Cada transação possui um indicador de status: **Pendente** (não paga) ou **Paga**.
- O status pode ser definido na criação ou alterado a qualquer momento.
- A listagem de transações agora oferece filtros por status e ação rápida de toggle.
- O Dashboard destaca quantas transações ainda estão pendentes, com atalho para a listagem correspondente.

---

## Como Marcar uma Transação como Paga
1. Acesse **Transações** > **Nova Transação**.
2. Preencha os dados normalmente.
3. Ative a opção **“Transação paga?”** para registrar o lançamento já quitado.
4. Salve. A transação aparecerá com badge verde “Pago”.

> **Dica**: ao editar uma transação existente, você pode alternar o status a qualquer momento.

---

## Ação Rápida na Tabela
- Na página **Transações**, cada linha mostra uma badge de status.
- Clique no botão de ação (ícone de check/relógio) para alternar instantaneamente entre Pago ↔ Pendente.
- Um toast informa o resultado da operação.

---

## Filtros disponíveis
- Use o seletor **Status** no topo da página para filtrar por:
  - `Todos`
  - `Pagas`
  - `Pendentes`
- Os filtros podem ser combinados com categoria, tipo e busca por descrição.

---

## Dashboard
- Foi adicionado um cartão **“Transações Pendentes”** com o número atual de lançamentos não pagos.
- Clique em **“Ver pendentes”** para abrir a listagem já filtrada.
- As últimas transações exibidas no card principal também destacam o status com badge.

---

## Perguntas Frequentes
- **Transações antigas ficam como?**  
  Por padrão, todas as transações existentes foram marcadas como **Pendentes**. Ajuste manualmente as que já estiverem pagas.

- **Isso altera meus totais?**  
  Não. Os totais de Receitas, Despesas e Saldo continuam considerando todas as transações. O status serve como indicador adicional.

- **Posso exportar apenas pagas?**  
  Ainda não. Use o filtro para visualizar e exporte manualmente. Planejamos melhorias futuras para exportações.

---

Para detalhes técnicos de implementação, consulte a especificação `docs/specs/transactions-payment-status.md`.

