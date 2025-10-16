# Feature – Menu Responsivo no Mobile

Esta feature ajusta o cabeçalho do FinanceFlow para exibir a navegação principal em dispositivos móveis.

---

## Contexto
- O header atual (`src/components/Header.tsx`) exibe links (Dashboard, Transações, Categorias, Contas) somente para `md` para cima.
- Em telas menores, o usuário não vê nenhuma opção de navegação.

---

## Objetivo
Exibir um menu acessível no mobile usando os componentes shadcn (ex.: `Sheet` ou `Dropdown`) que contenha as mesmas rotas já existentes.

---

## Pontos-chave da solução
1. Adicionar um botão/hambúrguer visível apenas em `md:hidden`.
2. Ao acionar o botão, abrir um menu lateral (Sheet) ou dropdown com os links “Dashboard”, “Transações”, “Categorias”, “Contas” e opcionalmente “Configurações”.
3. O menu deve fechar após o clique em algum item.
4. Preservar o avatar/dropdown atual para ajustes de conta/logout.

---

## Passos de validação
1. Acessar o site usando emulador mobile (Chrome Dev Tools) e verificar se o ícone abre o menu.
2. Clicar nos itens e garantir que navegam corretamente e que o menu se fecha.
3. Confirmar que o comportamento em desktop permanece igual.

---

## Observações Futuras
- Considerar destacar a rota ativa dentro do menu.
- Avaliar se configurações ou atalhos adicionais devem entrar no menu mobile.
