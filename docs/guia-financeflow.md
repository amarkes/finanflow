# Guia de Referência – FinanceFlow

Este documento resume a arquitetura atual do FinanceFlow e serve como referência rápida para novos prompts ou evoluções do projeto. O aplicativo é um gerenciador financeiro pessoal com autenticação via Supabase, interface em React/TypeScript e estilização baseada em shadcn-ui/Tailwind.

---

## Visão Geral do Projeto
- **Stack principal**: Vite + React 18 + TypeScript, React Router, TanStack Query, Tailwind/shadcn, Supabase.
- **Objetivo funcional**: permitir que usuários autenticados cadastrem receitas/despesas, organizem categorias e acompanhem saldo e transações filtradas.
- **Camadas chave**:
  - `src/pages`: páginas de roteamento (Dashboard, Transações, Categorias, Auth).
  - `src/hooks`: hooks para autenticação e acesso aos dados do Supabase.
  - `supabase/`: migrações SQL, policies RLS e configuração do projeto remoto.

---

## Estrutura de Front-end

### Bootstrap do app
- `src/main.tsx` monta o `<App />` dentro de `<StrictMode>`.
- `src/App.tsx` orquestra os providers globais:
  - `QueryClientProvider` (React Query) para cache e invalidação.
  - `AuthProvider` gerencia sessão Supabase.
  - `TooltipProvider`, `Toaster` e `Sonner` para tooltips e notificações.
  - `BrowserRouter` define rotas públicas (`/login`, `/register`, `/forgot-password`) e rotas protegidas via `<ProtectedRoute>`.

### Layout comum
- `src/components/Layout.tsx` aplica cabeçalho fixo e container principal.
- `src/components/Header.tsx` mostra navegação (Dashboard, Transações, Categorias), avatar com menu e opção de logout.
- `src/components/ProtectedRoute.tsx` garante que páginas protegidas rendereizem somente após autenticação (`useAuth`); redireciona para `/login` se `user` for nulo.

---

## Fluxos Principais

### Autenticação
- **Hook**: `useAuth` cria contexto com `user`, `session`, `loading`.
- **Login (`src/pages/Login.tsx`)**:
  - React Hook Form + Zod.
  - `supabase.auth.signInWithPassword` + toasts de sucesso/erro.
  - Redireciona automaticamente se usuário já estiver logado.
- **Cadastro (`src/pages/Register.tsx`)**:
  - Valida confirmação de senha.
  - `supabase.auth.signUp` registra usuário e envia e-mail de confirmação com `emailRedirectTo`.
- **Esqueci minha senha (`src/pages/ForgotPassword.tsx`)**:
  - `supabase.auth.resetPasswordForEmail` envia link de redefinição.
  - UI alterna entre formulário e mensagem de “email enviado”.

### Dashboard (`src/pages/Dashboard.tsx`)
- Usa `useTransactions` com filtros de período (mês atual, mês anterior, todos).
- Calcula totais de receitas/despesas/saldo em memória (centavos → BRL via `formatCentsToBRL`).
- Exibe card dedicado a “Transações Pendentes” com contagem, ícone `Clock` e CTA que leva para a listagem já filtrada.
- Lista últimas cinco transações com badge de status pago/pendente e atalho para edição.
- Botões principais: selecionar período, criar nova transação, navegar para lista completa.

### Transações (`src/pages/Transactions.tsx`)
- Filtros: busca textual, tipo (`income`/`expense`), categoria e status (`paid`/`pending` via dropdown).
- Tabela renderiza badges de categoria, tipo e novo status pago/pendente, valores formatados, ações de editar/excluir.
- Botão de ação rápida (ícones `Clock`/`CheckCircle2`) alterna o status diretamente na listagem usando `useUpdateTransaction`.
- Criação e edição redirecionam para `/transacoes/nova` e `/transacoes/:id/editar`.
- Exclusão usa `AlertDialog` de confirmação e `useDeleteTransaction` (invalida cache ao concluir).

### Formulário de Transação (`src/pages/TransactionForm.tsx`)
- React Hook Form + Zod (`transactionSchema`).
- Formata valores em BRL, converte para centavos com `parseBRLToCents`.
- Seleciona categoria filtrando por tipo (`income`/`expense`).
- Inclui `Switch` "Transação paga?" integrado ao formulário para definir `is_paid` no momento da criação/edição.
- `useParams` detecta modo edição e preenche defaults (incluindo notas e método de pagamento).
- `useCreateTransaction` ou `useUpdateTransaction` executam mutações e fazem invalidate da query ao sucesso.

### Categorias (`src/pages/Categories.tsx`)
- Separa listas de receitas e despesas.
- Diálogo para criar/editar com nome, tipo e cor (paleta fixa `PRESET_COLORS`).
- Exclusão com `AlertDialog`; a mutação `useDeleteCategory` apenas remove (transações ligadas ficam sem categoria).
- Mutations disparam toasts e invalidam cache de `useCategories`.

---

## Hooks de Dados

- **`useTransactions(filters?)`**: consulta `transactions` com join em `categories(name, color)`; aplica filtros opcionais (`startDate`, `endDate`, `type`, `categoryId`, `status`, `search`). React Query usa `queryKey: ['transactions', filters]` e retorna `is_paid` como boolean.
- **Mutations**:
  - `useCreateTransaction`: injeta `user_id` autenticado, insere e mostra toast.
  - `useUpdateTransaction`: update por `id`.
  - `useDeleteTransaction`: delete + toast.
- **`useCategories(type?)`**: lista categorias ordenadas por nome; aceita filtro por tipo.
- **Mutations** (`useCreateCategory`, `useUpdateCategory`, `useDeleteCategory`): controlam toasts e invalidam queries.
- **`useAuth`**: listener `supabase.auth.onAuthStateChange` + `getSession()` inicial; expõe contexto para componentes e protege rotas.

---

## Integração com Supabase

- **Cliente**: `src/integrations/supabase/client.ts` usa `createClient<Database>` com variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`, sessão persistida em `localStorage`.
- **Tipagem**: `src/integrations/supabase/types.ts` reflete esquema público (gerado pelo Supabase CLI).
- **Migrações principais** (`supabase/migrations/`):
  1. `20251014135114_fcf7a447-...sql`
     - Tabela `profiles` (criada via trigger `handle_new_user`).
     - Tabela `categories` com cores e tipo (`income`/`expense`).
     - Tabela `transactions` armazenando valores em centavos.
     - Policies RLS (`auth.uid()` garante isolamento por usuário).
     - Função `create_default_categories()` para criar seeds manuais.
  2. `20251014170000_update_handle_new_user.sql`
     - Atualiza trigger `handle_new_user` para criar perfis **e** categorias padrão automaticamente no registro.
  3. `20250217120000_add_is_paid_to_transactions.sql`
     - Adiciona coluna `is_paid boolean NOT NULL DEFAULT false` e índice `idx_transactions_is_paid` para suportar status pago/pendente.
- **Policies ativas** asseguram que cada usuário veja/modifique somente seus próprios dados.
- **Variáveis de ambiente necessárias**:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - (opcional em fluxos administrativos: `SUPABASE_SERVICE_ROLE_KEY`, mas não é usada no front-end).

---

## Configuração e Execução

### Dependências
1. Node.js ≥ 18 (recomendado via `nvm`).
2. Instalação de pacotes: `npm install`.

### Arquivos de ambiente
Crie `.env.local` na raiz com:
```bash
VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<chave-publica>
```

### Execução do front-end
- Desenvolvimento: `npm run dev` (Vite na porta 5173 por padrão).
- Build: `npm run build`.
- Preview produção: `npm run preview`.

### Supabase local / migrações
- Entrar: `supabase login`.
- Vincular projeto: `supabase link --project-ref seuepoquntfcetxhynpo`.
- Aplicar migrações localmente: `supabase db reset` (cuidado: apaga dados locais) ou `supabase db push`.
- Para rodar tudo localmente: `supabase start` (necessita Docker).

---

## Convenções e Boas Práticas
- **Valores monetários**: salvos em centavos (`amount_cents`); sempre usar `parseBRLToCents` e `formatCentsToBRL`.
- **React Query**: use `queryClient.invalidateQueries` após mutações para manter UI sincronizada.
- **Toasts**: sucesso/erro padronizados com `sonner`; mensagens já localizadas em pt-BR.
- **Formulários**: padrão `React Hook Form` + `zodResolver`; reutilize padrões de validação existentes.
- **Componentes shadcn**: seguir pattern atual (Form, Dialog, AlertDialog, Select, etc.) para consistência visual.
- **Status de pagamento**: mantenha `is_paid` como booleano (`false` por padrão); use as mutações existentes para alternar o status e reflita mudanças na UI (badge, filtros, card de pendências).
- **Proteção de rotas**: sempre envolver páginas privadas com `<ProtectedRoute>` e assumir que `useAuth` pode estar em `loading`.

---

## Checklist Rápido para Novos Prompts
1. Precisa adicionar novo dado vindo do Supabase? ➜ Atualize `supabase/types.ts` (via CLI) e ajuste hooks (`useTransactions`/`useCategories`).
2. Vai criar nova entidade? ➜ Defina migração SQL com tabela + RLS + policies + índices; atualize client/hook correspondente.
3. Novo formulário? ➜ Baseie-se em `TransactionForm` (Zod + React Hook Form) e mantenha mensagens em pt-BR.
4. Ajustes visuais globais? ➜ Considere editar `src/App.css`, `src/index.css` ou componentes compartilhados como `Layout`/`Header`.
5. Autenticação avançada (ex.: roles)? ➜ Estenda `profiles`, atualize `handle_new_user` e ajuste policies conforme necessário.

---

## Próximos Passos Sugeridos (Opcional)
- Implementar página de configurações (`/configuracoes`) mencionada no menu, consumindo dados de `profiles`.
- Adicionar gráficos ou indicadores visuais extras no Dashboard (ex.: balanço mensal usando `recharts` já instalado).
- Criar testes de UI (por exemplo, com Vitest + React Testing Library) para fluxos críticos.

---

Este guia deve ser mantido atualizado sempre que novas features, entidades ou fluxos forem adicionados ao FinanceFlow.
