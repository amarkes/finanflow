# Especificação Técnica – Rótulos nos Filtros da Página de Transações

## 1. Objetivo
Adicionar rótulos visuais e semanticamente corretos aos filtros da página `src/pages/Transactions.tsx` para melhorar usabilidade e acessibilidade.

## 2. Escopo
- Atualizar a seção de filtros (barra superior) da página `Transactions`.
- Exibir um label claro acima de cada campo existente:
  - Busca por descrição (campo `Input`).
  - Tipo (`Select`).
  - Categoria (`Select`).
  - Conta (`Select`).
  - Status (`Select`).
- Manter layout responsivo atual (grid com 4/5 colunas, dependendo da tela).
- Nenhum novo filtro será adicionado neste escopo.

## 3. Requisitos Funcionais
1. Cada campo deve ter um rótulo textual visível (ex.: “Buscar”, “Tipo”, “Categoria”, “Conta”, “Status”).
2. Labels devem ser estilizados com componentes coerentes (ex.: `FormLabel`, `label` tailwind `text-sm font-medium`).
3. Margens/spacing devem manter a estética atual (usar `flex flex-col gap-2` ou classes utilitárias similares).
4. Filtros continuam funcionando como antes (estado e chamadas React Query não mudam).

## 4. Requisitos Não Funcionais
- Manter padrões de UI shadcn/Tailwind.
- Código limpo, sem alterar a lógica dos hooks.
- Não introduzir dependências externas.

## 5. Componentes Arquiteturalmente Impactados
- `src/pages/Transactions.tsx`: seção de filtros (por volta do grid `md:grid-cols-4` / `md:grid-cols-5`).

## 6. Plano de Implementação
1. Envolver cada campo em um container `div` com `flex flex-col gap-2`.
2. Inserir rótulo (`label` com `htmlFor`) e referenciá-lo no respectivo componente:
   - Para `Input`: usar `id="transaction-search"`.
   - Para `Select`: passar `aria-labelledby` ou utilizar `FormField` para gerar ids.
3. Ajustar classes utilitárias para manter espaçamento (não afetar grid).
4. Revisar responsividade após inserção dos labels.

## 7. Testes Manuais
- Acessar `/transacoes` em desktop: verificar rótulos acima de cada filtro.
- Filtrar por descrição/tipo/categoria/conta/status para garantir que a funcionalidade permanece.
- Testar em largura reduzida (dev tools) para garantir alinhamento.

## 8. Entregáveis
- Atualização de `src/pages/Transactions.tsx` com os labels.
- Documentação associada (`docs/feature-filtros-transacoes-rotulos.md`) já criada.
- Execução de `npm run build` após a mudança.
