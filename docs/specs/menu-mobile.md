# Especificação Técnica – Menu Mobile Responsivo

## 1. Objetivo
Implementar um menu de navegação acessível em mobile, mantendo o cabeçalho atual no desktop.

## 2. Escopo
- Atualizar `src/components/Header.tsx` para incluir botão hambúrguer quando `md:hidden`.
- Utilizar componente `Sheet` (shadcn) ou equivalente para mostrar links de navegação.
- Incluir as rotas já existentes: Dashboard (`/`), Transações (`/transacoes`), Categorias (`/categorias`), Contas (`/contas`), Configurações (`/configuracoes` – opcional).
- Manter avatar/dropdown atual (logout, etc.) como está.

## 3. Requisitos Funcionais
1. Exibir ícone/botão no mobile (ex.: três linhas `Menu`).
2. Ao clicar, abrir painel com links; o painel deve fechar ao clicar em qualquer item ou no close.
3. Links devem navegar usando `Link` do React Router.
4. Em `md` ou superior, manter o menu horizontal atual (sem mudanças).

## 4. Requisitos Não Funcionais
- Reusar componentes shadcn (Sheet, Button, etc.).
- UI consistente com o restante do app (cores/tipografia).
- Não introduzir dependências externas.

## 5. Componentes Impactados
- `src/components/Header.tsx` (principal).
- Possível adição de `Menu`/`X` icon (lucide).

## 6. Implementação
1. Importar `Sheet`, `SheetTrigger`, `SheetContent`, etc. (já presentes no projeto? se não, usar `Sheet` shadcn).
2. Adicionar botão com `md:hidden` e `SheetTrigger`.
3. Inserir lista de links dentro do `SheetContent`.
4. (Opcional) destacar rota ativa usando `useLocation`.

## 7. Testes Manuais
- Desktop: menu permanece visível, sem alterações.
- Mobile: botão aparece; ao clicar abre menu com links; fechar funciona.
- Clique em link navega e fecha o menu.

## 8. Entregáveis
- Código ajustado em `src/components/Header.tsx`.
- Documentação (feature + spec) criada.
- `npm run build` após alterações.
