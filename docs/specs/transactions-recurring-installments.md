# Especificação Técnica – Transações Únicas, Parceladas e Mensais

## 1. Visão Geral
- **Feature**: permitir que o usuário defina se uma transação é única, parcelada ou mensal.
- **Motivação**: reduzir esforço manual para cadastrar parcelas e receitas/despesas recorrentes, garantindo consistência de valores e datas.
- **Partes Impactadas**: tabela `transactions`, tipagens Supabase, hooks de CRUD de transações, formulários (`TransactionForm`), listagem (`Transactions`), documentação e fluxos de deleção/edição.

## 2. Objetivos
1. Oferecer no formulário de transações um controle claro de recorrência (`Única`, `Parcelada`, `Mensal`).
2. Gerar automaticamente os lançamentos derivados (parcelas ou recorrências mensais) de forma atômica e com valores consistentes.
3. Permitir que o usuário identifique, edite ou exclua facilmente transações que fazem parte de uma série.

## 3. Escopo
- **Incluído**
  - Novos campos de recorrência no formulário e nas tipagens.
  - Geração automática de séries (parcelas mensais, recorrências mensais pelos 12 meses seguintes).
  - Marcação visual de séries na listagem de transações e ações específicas de gerenciamento.
  - Ajustes nos hooks (`useCreateTransaction`, `useUpdateTransaction`, `useDeleteTransaction`) para lidar com séries.
  - Migrações/mutações no Supabase e atualização dos tipos gerados.
- **Excluído**
  - Recorrências com periodicidade diferente de mensal (semanal, bimestral, etc.).
  - Parcelamentos com periodicidade diferente de mensal ou intervalos personalizados.
  - Regeneração automática de parcelas após edição de lançamentos antigos (edições impactam apenas os registros futuros da mesma série).

## 4. Requisitos Funcionais
- **RF1**: o campo **Tipo de lançamento** deve existir no formulário com opções `Única` (default), `Parcelada`, `Mensal`.
- **RF2**: ao escolher `Parcelada`, o usuário deve informar a quantidade de parcelas (mínimo 2, máximo 24); o valor digitado no campo de valor representa o **total** e será dividido igualmente.
- **RF3**: a divisão de parcelas deve garantir que a soma em centavos das parcelas geradas corresponda exatamente ao valor total informado (distribuir o resto centavo a centavo nas primeiras parcelas).
- **RF4**: parcelas geradas avançam **mensalmente** a partir da data inicial, preservando dia quando possível, e herdam `category_id`, `account_id`, `payment_method`, `notes` e `is_paid`.
- **RF5**: ao escolher `Mensal`, o sistema gera 12 lançamentos consecutivos, incrementando a data mês a mês e preservando o dia quando possível (casos como 31 devem cair no último dia do mês).
- **RF6**: a listagem de transações deve exibir um marcador textual (`Parcelada 2/5`, `Mensal 4/12`) para cada item que pertença a uma série.
- **RF7**: ao abrir uma transação que pertence a uma série, o usuário pode optar entre salvar alterações somente naquela ocorrência ou aplicar nas ocorrências futuras da mesma série.
- **RF8**: ao excluir uma transação que pertence a uma série, o usuário deve escolher entre excluir apenas aquela ocorrência ou remover aquela e todas as futuras (`series_sequence >= atual`).

## 5. Requisitos Não-Funcionais
- A criação automática de parcelas/recorrências deve ocorrer em uma única operação `insert` para garantir atomicidade (ou rollback manual caso qualquer inserção falhe).
- Validações e mensagens de erro devem seguir o padrão atual do formulário (uso de `react-hook-form`, `zod` e `toast`).
- Indicadores na UI precisam manter contraste e semântica acessível (usar `Badge` existente com `aria-label` ou `sr-only` conforme necessário).
- Garantir que alterações em série invalidem a cache de `transactions` no React Query para manter a listagem consistente.

## 6. Fluxos do Usuário
1. **Criação – Única**
   - Usuário deixa `Tipo de lançamento` em `Única` e salva → apenas um registro é criado (com `series_type = 'single'`).
2. **Criação – Parcelada**
   - Usuário informa quantidade de parcelas e o valor total → preview mostra valor por parcela.
   - Ao salvar, gerar array de parcelas (1..N) com `series_id` único, `series_type = 'installment'`, `series_sequence = índice`, `series_total = N`, aplicando `addMonths` para espaçar as datas.
3. **Criação – Mensal**
   - Usuário escolhe `Mensal`, define data inicial → preview apresenta período coberto.
   - Ao salvar, gerar 12 lançamentos com datas incrementadas (`addMonths`), mantendo `series_type = 'monthly'`, `series_sequence = 1..12`, `series_total = 12`.
4. **Edição de uma ocorrência**
   - Ao abrir transação com `series_type != 'single'`, mostrar seletor `Salvar`:
     - `Somente esta transação`
     - `Esta e próximas da série`
   - Se usuário escolher `Esta e próximas`, aplicar `update` em lote (`series_id` igual e `series_sequence >= atual`).
5. **Exclusão de uma ocorrência**
   - Modal de confirmação deve apresentar:
     - `Excluir apenas este lançamento`
     - `Excluir este e os próximos da série`
   - Tratar as duas possibilidades em `useDeleteTransaction`.

## 7. Mudanças Técnicas
### 7.1 Banco de Dados (Supabase)
- Criar enum:
  ```sql
  CREATE TYPE transaction_series_type AS ENUM ('single', 'installment', 'monthly');
  ```
- Alterar tabela `public.transactions`:
  ```sql
  ALTER TABLE public.transactions
    ADD COLUMN series_type transaction_series_type NOT NULL DEFAULT 'single',
    ADD COLUMN series_id uuid NULL,
    ADD COLUMN series_sequence integer NULL,
    ADD COLUMN series_total integer NULL;

  CREATE INDEX idx_transactions_series_id ON public.transactions(series_id);
  ```
- `series_id` será um `uuid` gerado no cliente para todas as transações da série (permite `ON DELETE CASCADE` manual em lote).
- Para parcelamentos, opcionalmente armazenar o valor total em `series_total_amount_cents` (integer) caso deseje exibir no futuro; deixar planejado com coluna `series_amount_total_cents integer NULL`.
- Atualizar policies existentes (se necessário) para permitir operações `delete`/`update` por `series_id` respeitando `user_id`.

### 7.2 Tipagens e Helpers
- Regenerar `src/integrations/supabase/types.ts`.
- Atualizar interface `Transaction` em `src/hooks/useTransactions.tsx`:
  ```ts
  series_type: 'single' | 'installment' | 'monthly';
  series_id: string | null;
  series_sequence: number | null;
  series_total: number | null;
  series_amount_total_cents?: number | null;
  ```
- Definir tipo auxiliar `RecurrenceType` para reutilizar no formulário e hooks.
- Criar utilitário `calculateInstallments(totalCents: number, quantity: number): number[]` que retorne vetor com os valores por parcela já ajustados com restos.
- Criar utilitário `generateMonthlyDates(start: Date, occurrences: number): Date[]` com lógica para tratar meses com menos dias.

### 7.3 Hooks React Query
- **useTransactions**
  - Incluir novos campos no retorno (`series_type`, etc.).
  - Disponibilizar filtro opcional `seriesType?: 'single' | 'installment' | 'monthly'`.
  - Ajustar ordenação secundária por `series_sequence` quando `series_id` igual para manter agrupamento.
- **useCreateTransaction**
  - Atualizar tipo de entrada para aceitar:
    ```ts
    {
      recurrenceType: 'single' | 'installment' | 'monthly';
      installmentsCount?: number;
    }
    ```
  - Quando `recurrenceType !== 'single'`, gerar `seriesId = crypto.randomUUID()` e montar lote de objetos para `insert`.
  - Garantir que `series_type`, `series_id`, `series_sequence`, `series_total`, `series_amount_total_cents` (para parceladas) sejam preenchidos.
  - Exibir toast específico com resumo (`5 parcelas criadas`, `12 lançamentos mensais criados`).
- **useUpdateTransaction**
  - Aceitar parâmetro adicional `applyMode?: 'single' | 'series_from_here'`.
  - Quando `applyMode === 'series_from_here'` e transação tem `series_id`, executar `update` com `eq('series_id', seriesId)` e `gte('series_sequence', currentSequence)`.
- **useDeleteTransaction**
  - Receber `{ id, mode }` onde `mode` é `'single' | 'series_from_here'`.
  - Para deleção em série, utilizar `eq('series_id', seriesId)` + `gte('series_sequence', currentSequence)`.
- **Novos helpers**
  - Considerar `useSeriesMetadata(seriesId)` caso precise exibir resumo (não obrigatório para MVP).

### 7.4 Componentes / Páginas
- **TransactionForm.tsx**
  - Atualizar schema Zod com novos campos:
    ```ts
    recurrence_type: z.enum(['single', 'installment', 'monthly']),
    installments: z.number().int().min(2).max(24).optional(),
    apply_mode: z.enum(['single', 'series_from_here']).optional(),
    ```
  - Mostrar campo numérico `Quantidade de parcelas` apenas quando `recurrence_type === 'installment'`.
  - Exibir mensagem de apoio com valor calculado por parcela (`R$ X,XX por parcela`).
  - Para `Mensal`, exibir resumo das datas geradas (`De 10/03 a 10/02 do próximo ano`).
  - Ajustar `defaultValues` e `form.reset` para preencher campos quando o registro fizer parte de série (usar `series_type`, `series_total`, etc.).
  - Incluir seletor `Aplicar alterações` somente em modo edição e quando `series_type !== 'single'`.
  - Atualizar submit handler para chamar o hook correto com dados de recorrência.
- **Transactions.tsx**
  - Adicionar coluna "Recorrência" com `Badge` exibindo:
    - `Única` (apenas para contexto)
    - `Parcelada 1/5`
    - `Mensal 7/12`
  - No menu de ações (`Pencil`/`Trash2`), ao acionar exclusão, abrir `AlertDialog` com as opções descritas nos requisitos.
  - Destacar linhas de séries (ex.: ícone encadeado) caso útil para UX.
  - Ajustar loading/optimistic states para atualizações em lote (mostrar spinner nos itens afetados).
- **Dashboard (opcional)**
  - Revisar cards que exibem últimas transações para incluir marcador de série (badge pequena).

### 7.5 Validações Extras
- Garantir que `series_id` e campos relacionados sempre sejam `NULL` quando `series_type = 'single'`.
- Bloquear mudança direta de `series_type` em modo edição (ex.: não permitir converter uma parcela existente em mensal; usuário deve criar nova série).
- Na unidade de teste/preview de parcelas, recalcular valores ao alterar quantidade ou valor total.

## 8. Migração de Dados
- Atualizar registros existentes definindo:
  ```sql
  UPDATE public.transactions
     SET series_type = 'single',
         series_total = 1,
         series_sequence = 1
   WHERE series_type IS NULL;
  ```
- `series_id` permanece `NULL` para lançamentos atuais.
- Rodar `supabase gen types typescript --local` após a migração para sincronizar `Database` types.

## 9. Testes e Validação
- Criar transação única → apenas um registro criado, sem `series_id`.
- Criar parcelamento de 5 parcelas com valor que não divide igualmente (ex.: R$ 1.001,00) → verificar distribuição correta (primeiras parcelas ganham +1 centavo).
- Criar mensal a partir de 31/01 → verificar que 28/02, 31/03, etc., são gerados com ajuste de fim de mês.
- Editar parcela 2/5 escolhendo `Esta e próximas` → valores atualizam da 2ª até a 5ª.
- Excluir mensal 4/12 com opção série → registros 4..12 removidos.
- Verificar badges na listagem e ausência de erros de ordenação.
- Garantir que filtros existentes continuam funcionando (ex.: filtrar por status pago com série gerada).

## 10. Riscos e Mitigações
- **Risco**: arredondamento incorreto em parcelas causa diferença no total → Mitigar com helper que distribui resto nas primeiras parcelas e testes automatizados.
- **Risco**: operações em lote falharem parcialmente → Mitigar executando todas as inserções/updates em uma chamada única ao Supabase e tratando erros com rollback manual quando necessário.
- **Risco**: alterações em série impactarem grande quantidade de registros → Mitigar com feedback visual (spinners/toasts) e confirmar ações destrutivas com modal.
- **Risco**: usuários confundirem valor total vs. valor por parcela → Mitigar com mensagem explicativa abaixo do campo de quantidade e preview do valor por parcela.

## 11. Entregáveis
- Migração SQL (enum + novas colunas na tabela `transactions`).
- Helpers utilitários (`calculateInstallments`, `generateMonthlyDates`).
- Atualização dos hooks de criação/edição/exclusão de transações.
- Ajustes no `TransactionForm` e `Transactions` para suportar séries e novos fluxos.
- Documentação de uso (`docs/feature-transacoes-recorrencia.md`) atualizada.
