# Feature – Rótulos dos Filtros em Transações

Esta melhoria adiciona rótulos visíveis para cada filtro da página **Transações**, facilitando a compreensão do usuário sobre o que cada campo representa.

---

## Motivação
- A página `Transações` já possui filtros (busca por descrição, tipo, categoria, conta, status), porém sem rótulos explícitos.
- Em telas menores ou para usuários novos, a ausência de labels torna a interface menos acessível.

---

## O que será feito
1. Inserir rótulos (`label`/`FormLabel`) acima de cada campo de filtro:
   - Busca por descrição
   - Tipo
   - Categoria
   - Conta
   - Status
2. Manter a organização responsiva atual (grid de filtros).
3. Garantir consistência visual com os padrões do projeto (shadcn/Tailwind).

---

## Impacto esperado
- Melhora de UX ao deixar claro qual filtro está sendo aplicado.
- Maior acessibilidade: leitores de tela reconhecerão melhor cada campo.
- Facilita onboarding de novos usuários no módulo de transações.

---

## Passos de validação
1. Abrir Transações → conferir labels acima de cada campo.
2. Testar responsividade (desktop/tablet/mobile).
3. Usar filtros normalmente para garantir que o comportamento não mudou.

---

## Observações Futuras
- Avaliar se filtros adicionais (ex.: data) também devem seguir o mesmo padrão quando implementados.
