# Feature – Filtros Avançados no Dashboard

Esta feature expande os filtros de período no Dashboard para oferecer granularidade diária e seleção por intervalo customizado.

---

## Situação Atual
- Dropdown de período possui três opções fixas: **Mês Atual**, **Mês Anterior**, **Todos**.
- Dashboard consome `useTransactions({ startDate, endDate })` baseado na escolha, impactando cards de totais, pendências e lista de últimas transações.

---

## Objetivo da Evolução
1. Manter as opções existentes.
2. Acrescentar:
   - **Hoje**: filtra apenas a data atual.
   - **Personalizado…**: abre seletor de intervalo (data inicial e final) com suporte a dia/mês/ano.
3. Exibir datas escolhidas no cabeçalho e permitir redefinir rapidamente para “Hoje”.

---

## Requisitos Funcionais
- Ao escolher “Hoje”, `startDate` e `endDate` devem ser iguais à data corrente `yyyy-MM-dd`.
- Ao escolher “Personalizado…”, usuário deve selecionar um range em um componente apropriado (ex.: `Popover + Calendar` em modo range). Enquanto não confirmar, mantém período anterior.
- Mostrar datas aplicadas (ex.: “Período: 12/02/2025 → 28/02/2025”) logo abaixo do filtro.
- Permitir limpar o range customizado e retornar para “Todos”.

---

## UX/UI
- Dropdown continua usando `Select` shadcn; adicionar novas opções:
  - `today`
  - `custom`
- Ao selecionar `custom`, abrir `Popover` com `Calendar` em modo interval (range). Precisamos de state local para armazenar `selectedRange` (Date | undefined) e um botão “Aplicar”.
- Exibir toast de erro caso usuário tente aplicar um range inválido (ex.: apenas uma data).
- Adicionar botão secundário “Resetar” para voltar a “Todos”.

---

## Impacto Técnico
- `Dashboard.tsx`:
  - Incluir estados: `period` (mantém enum atual + `today`/`custom`), `customRange`.
  - Atualizar `useMemo` que calcula `startDate`/`endDate` para considerar novos casos.
  - Renderizar `Calendar` com `mode="range"` dentro de `Popover` quando `period === 'custom'`.
- Não é necessário alterar `useTransactions`; apenas garantir que passamos o filtro correto.

---

## Testes Esperados
1. Selecionar “Hoje” → cards mostram dados do dia.
2. Selecionar “Personalizado…” → escolher duas datas → aplicar → ver range refletido nos cards/lista.
3. Limpar range → volta a “Todos”.
4. Persistir comportamento original (“Mês Atual”, “Mês Anterior”, “Todos”).

---

## Passos de Migração / Deploy
1. Atualizar front-end (`npm run build`).
2. Não há migrações Supabase.
3. Validar manualmente os novos filtros em conjunto com cards de contas e pendências.

---

## Observações Futuras
- Avaliar guardar período customizado no `localStorage` para reabrir com última seleção.
- Expandir filtro para outras páginas (ex.: Transações) compartilhando helper utilitário.
