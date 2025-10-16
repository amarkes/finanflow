# Especificação Técnica – Status de Pagamento em Transações

## 1. Visão Geral
- **Feature**: permitir que o usuário marque transações como “Pagas” ou “Pendentes”.
- **Motivação**: usuários precisam diferenciar lançamentos já quitados daqueles ainda a pagar/receber, mantendo controle de compromissos futuros.
- **Partes Impactadas**: tabela `transactions` (Supabase), hooks `useTransactions`, páginas Dashboard, Transactions e TransactionForm, documentação e migrações.

## 2. Objetivos
1. Armazenar o status “pago”/“não pago” associado a cada transação.
2. Disponibilizar controles na UI para consultar e alterar o status.
3. Incluir o status na experiência do Dashboard (indicador de pendências) e nos filtros da listagem.
4. Garantir que operações de criação/edição/exclusão mantenham o status corretamente sincronizado via React Query.

## 3. Escopo
- **Incluído**
  - Novo campo booleano `is_paid` com default `false` na tabela `transactions`.
  - Atualização da tipagem Supabase (`Database` + interface `Transaction`).
  - Ajustes no formulário para definir status inicial e permitir edição.
  - Filtro de status na listagem e ação rápida para alternar `is_paid`.
  - Indicador no Dashboard exibindo total de pendências.
  - Migração SQL compatível com dados existentes.
- **Excluído**
  - Notificações automáticas ou automação baseada em datas.
  - Integração com meios de pagamento externos.
  - Relatórios/exportações específicas.

## 4. Requisitos Funcionais
- **RF1**: toda nova transação deve iniciar como “Pendente” (`is_paid = false`) salvo se o usuário explicitamente marcar como “Paga”.
- **RF2**: o usuário pode alterar o status a qualquer momento pela listagem ou formulário.
- **RF3**: a listagem de transações deve oferecer filtro por status (Todos, Pagas, Pendentes).
- **RF4**: cada linha da tabela deve exibir badge/indicador textual do status.
- **RF5**: Dashboard deve apresentar contagem de pendências e permitir navegação para a listagem filtrada por pendentes.
- **RF6**: Totais financeiros continuam considerando todas as transações; a especificação adiciona apenas destaque visual/statístico para pendências.

## 5. Requisitos Não-Funcionais
- Migração não pode resultar em downtime para tabelas existentes.
- Atualizações na UI devem preservar acessibilidade (descrições, contrastes).
- Operações de toggle devem ser otimistas ou exibir feedback de carregamento para minimizar latência percebida.

## 6. Fluxos do Usuário
1. **Criação**: no formulário de nova transação, usuário define dados e pode marcar checkbox “Transação já paga”. Default: desmarcado.
2. **Listagem**:
   - Usuário visualiza coluna “Status” (badge verde = Pago, laranja/vermelho = Pendente).
   - Pode filtrar status via dropdown.
   - Ícone/botão (ex.: toggle) permite alternar `Pago ↔ Pendente` inline.
3. **Dashboard**:
   - Cards principais continuam exibindo Saldo, Receitas, Despesas (todas as transações).
   - Novo card/box leve “Transações Pendentes” com contagem e um CTA “Ver pendentes” que leva para `/transacoes?status=pending`.

## 7. Mudanças Técnicas
### 7.1 Banco de Dados (Supabase)
- **Migração**: adicionar coluna `is_paid boolean NOT NULL DEFAULT false` na tabela `public.transactions`.
- **Índice**: opcional, mas recomendado `CREATE INDEX idx_transactions_is_paid ON public.transactions(is_paid);`
- **Policies**: existentes continuam válidas (operam por `user_id`); não é necessário ajuste.
- **Seeds/Triggers**: nenhuma alteração além de eventual atualização de scripts seed para definir `is_paid = true` quando fizer sentido.

### 7.2 Tipagem e Client
- Regenerar arquivo `src/integrations/supabase/types.ts` (Supabase CLI) para refletir novo campo.
- Atualizar interface `Transaction` em `src/hooks/useTransactions.tsx` (adicionar `is_paid: boolean`).

### 7.3 Hooks React Query
- `useTransactions`:
  - Incluir `is_paid` no select (`.select('*, categories(name, color)')` já traz todas as colunas; tipagem deve aceitar).
  - Aceitar novo filtro opcional `status?: 'paid' | 'pending'` e aplicar `eq('is_paid', true/false)`.
  - Atualizar `TransactionFilters` para incluir `status`.
- `useCreateTransaction` / `useUpdateTransaction`:
  - Preparar payload com `is_paid`.
  - Garantir defaults adequados no `TransactionForm`.
- Criar mutação auxiliar `useToggleTransactionPayment` ou reaproveitar `useUpdateTransaction` na listagem (documentar no spec).

### 7.4 Componentes / Páginas
- **TransactionForm**:
  - Novo campo (Switch ou Checkbox) “Transação paga?” com ajuda textual.
  - Ajustar `defaultValues` e `form.reset` para incluir `is_paid`.
  - Enviar valor no `transactionData`.
- **Transactions page**:
  - Expandir estado local com `statusFilter`.
  - Adicionar `<Select>` com opções `all`, `paid`, `pending`.
  - Nova coluna “Status” com badge (`Pago`/`Pendente`).
  - Botão toggle (ex.: ícone check/clock) para disparar alteração (via mutate).
  - Feedback (toasts) para sucesso/erro.
- **Dashboard**:
  - Calcular `pendingCount = transactions.filter(t => !t.is_paid).length`.
  - Renderizar card tipo:
    ```
    Transações Pendentes
    <contagem>
    <Botão>Ver Pendentes</Botão>
    ```
  - Opcional: destacar pendências nas “Últimas transações” (ex.: badge).

### 7.5 Rotas/Filtros
- Atualizar `navigate('/transacoes')` para aceitar query param quando vier do CTA (ex.: `navigate('/transacoes?status=pending')`).
- No componente `Transactions`, ler `status` da query string e aplicar como default no estado.

## 8. Migração de Dados
- Column add com default `false` garante que dados existentes sejam considerados “Pendentes”.
- Post-migration task: opcional script manual para marcar transações antigas como Pagas conforme necessidade operacional (fora de escopo técnico).

## 9. Testes e Validação
- **Checklist**:
  - Criar transação sem marcar paga → aparece como pendente.
  - Marcar como paga no formulário → listagem reflete status imediatamente.
  - Toggle na lista alterna status e mantém filtros.
  - Filtro “Pagas” exibe somente transações `is_paid = true`.
  - Dashboard mostra contagem correta e CTA navega com filtro aplicado.
- **Automação**: considerar futuros testes end-to-end (ex.: Playwright) cobrindo fluxo de toggle.

## 10. Riscos e Mitigações
- **Risco**: toggle inline conflitar com ações existentes → Mitigar adicionando debounce/disable durante mutation.
- **Risco**: contagem de pendências no Dashboard pode ficar inconsistente sem invalidar queries → Garantir `invalidateQueries('transactions')` após qualquer mutação.
- **Risco**: migração aplicada em produção sem rebuild dos tipos → checklist de deploy deve incluir regeneração de tipos e rebuild front-end.

## 11. Entregáveis
- Migração SQL adicionando coluna e índice.
- Atualizações nos hooks e componentes listados.
- Documentação de uso (seção a ser criada em `docs/`).
- Atualização do guia principal ou anexos quando feature estiver concluída.

