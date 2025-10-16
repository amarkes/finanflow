# Especificação Técnica – Métodos de Pagamento com Atalhos + Contas

## 1. Visão Geral
- **Feature**: permitir o preenchimento rápido do método de pagamento e vincular transações a contas com limites/saldos controlados.
- **Motivação**: oferecer visibilidade sobre limites de cartão de crédito, saldos estimados e consolidar gastos por conta.
- **Escopo**:
  - Chips de método de pagamento no formulário de transação.
  - Entidade `accounts` com tipagem forte, limites e saldos opcionais.
  - Filtros, listar e informar limites/saldos em Dashboard e Transactions.

## 2. Requisitos Funcionais
1. Ao criar/editar transação, o usuário pode clicar em chips (Cartão de crédito, Pix, etc.) que preenchem o campo “Método de Pagamento”.
2. Se o método exigir compatibilidade (ex.: Cartão de crédito), a transação precisa de uma conta compatível selecionada.
3. Contas armazenam nome, tipo (`credit_card`, `cash`, etc.), limite e saldo opcionais, status ativo.
4. Transações podem referenciar `account_id`; filtros/colunas da listagem exibem essas informações.
5. Dashboard mostra resumo de contas (limite disponível total em cartões, saldo estimado nas demais, lista com hints).

## 3. Requisitos Não Funcionais
- Reutilizar shadcn/Tailwind, React Hook Form + Zod, React Query.
- Nenhuma dependência externa adicional.
- Mensagens em pt-BR e toasts consistentes.
- Políticas RLS assegurando propriedade das contas e transações.

## 4. Migrações
- `20251017163000_create_accounts.sql`:
  - cria `public.accounts` com índices (user_id, type, is_active) e RLS.
  - adiciona `transactions.account_id` (FK) com índice.
  - redefine policies de `transactions` para validar ownership do `account_id`.

## 5. Modelagem de Dados
```
accounts (
  id uuid PK,
  user_id uuid FK auth.users,
  name text,
  type text CHECK (credit_card|debit_card|...),
  limit_cents integer nullable,
  balance_cents integer nullable,
  is_active boolean default true,
  created_at timestamptz default now()
)

transactions (
  ...,
  account_id uuid FK accounts(id) ON DELETE SET NULL
)
```

## 6. Hooks e Utilitários
- `useAccounts`, `useCreateAccount`, `useUpdateAccount`, `useDeleteAccount`.
- `PAYMENT_METHOD_OPTIONS` / `PAYMENT_METHOD_ACCOUNT_TYPES` em `PaymentMethodChips`.
- `getAccountTypeLabel` em `src/lib/account.ts`.
- `useTransactions` agora aceita `accountId` e retorna `account`.

## 7. Camadas de UI
- **TransactionForm**:
  - chips de método com `PaymentMethodChips`.
  - select de conta (filtrado pelos tipos compatíveis).
  - hints (`Limite disponível` / `Saldo estimado`) utilizando transações não pagas para cartões.
  - validação extra (Zod + toast) para compatibilidade método ↔ conta.
- **Transactions.tsx**:
  - filtro por conta via dropdown.
  - nova coluna “Conta” com nome + tipo.
  - `AlertDialog` extra para confirmar toggle de status permanece.
- **Dashboard.tsx**:
  - import de `AccountsCard` com resumo de limites/saldos.
  - card continua exibindo últimas transações, pendentes e totals.

## 8. Regras de Limite e Saldo
- Cartões de crédito: `limite disponível = limit_cents - soma(despesas não pagas da conta)` (exclui transação atual em modo edição).
- Outros tipos: `saldo estimado = balance_cents` quando informado.
- Não bloquear submissão quando extrapolar limite; apenas mostrar hint.

## 9. Testes Sugeridos
- Criar transação com “Cartão de crédito” e conta compatível → sucesso.
- Tentar salvar crédito sem conta → erro via toast + validação.
- Alterar método para “Dinheiro” e conta com saldo → hint de saldo.
- Filtrar transações por conta e validar resultado.
- Verificar Dashboard exibindo limites consolidados.

## 10. Notas de Deploy
- Executar `supabase db push` (ou reset local) para aplicar nova migração.
- Rodar `npm run build` após atualização das tipagens.
- Validar manualmente:
  - cadastro/edição com contas diferentes;
  - filtros por conta na listagem;
  - métricas no Dashboard.
