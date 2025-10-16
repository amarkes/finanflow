# Especificação Técnica – Filtros Estendidos do Dashboard

## 1. Visão Geral
- **Feature**: ampliar os filtros de período do Dashboard adicionando opções “Hoje” e “Personalizado…”, além das existentes (Mês atual, Mês anterior, Todos).
- **Objetivo**: permitir análises mais granulares de fluxo financeiro diário e selecionar intervalos customizados por data.
- **Escopo**:
  - Ajustes no componente de filtro do Dashboard.
  - Estado adicional para armazenar range customizado.
  - Atualização da chamada `useTransactions` para aceitar novos períodos.

## 2. Requisitos Funcionais
1. Dropdown deve exibir opções: `today`, `current`, `last`, `all`, `custom`.
2. Ao selecionar “Hoje”, filtrar transações com data igual à atual.
3. Ao selecionar “Personalizado…”, abrir seletor de intervalo para escolher `startDate`/`endDate`, com botão “Aplicar”.
4. Enquanto o usuário não aplica o range, manter o último período válido.
5. Exibir o range atual abaixo do filtro, no formato “Período: dd/MM/yyyy → dd/MM/yyyy”.
6. Permitir limpar o range customizado e retornar ao estado “Todos”.

## 3. Requisitos Não Funcionais
- Utilizar componentes já existentes (shadcn `Select`, `Popover`, `Calendar`).
- Mensagens/labels em pt-BR.
- Manter compatibilidade com o hook `useTransactions`.
- Evitar regressões nas demais opções (Mês atual/Mês anterior/Todos).

## 4. Arquitetura / Fluxo Geral
1. `Dashboard.tsx` mantém estado `period` (`'current' | 'last' | 'all' | 'today' | 'custom'`) e `customRange`.
2. `customRange` pode ser `{ from: Date; to?: Date }`.
3. `useMemo` que calcula `{ startDate, endDate }` considera:
   - today → `startDate = endDate = format(new Date())`.
   - custom → usar `customRange` (somente aplicar quando ambos `from` e `to` existirem).
4. Quando `period === 'custom'`, renderizar `Popover` com `Calendar` em `mode="range"` e botões “Aplicar”/“Cancelar”.
5. Ao aplicar o range, atualizar `startDate`/`endDate` no state e fechar popover; ao cancelar, manter período anterior.
6. Adicionar botão/ação “Limpar filtro” para voltar a `'all'`.

## 5. UI/Componentes
- `SelectTrigger` mantém dropdown padrão.
- Para opção custom:
  - Abrir `Popover` ancorado ao select ou ícone.
  - `Calendar` com `mode="range"` (Day Picker).
  - Botões `Aplicar` (desabilitado se range incompleto) e `Cancelar`.
- Texto do range: abaixo do filtro, exibir `Período: ...`.
- Botão leve “Resetar” para retornar a `'all'`.

## 6. Hooks/Estado
- Estados novos:
  - `const [period, setPeriod] = useState('current')`.
  - `const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({})`.
  - `const [appliedRange, setAppliedRange] = useState<{ from?: Date; to?: Date }>({})` para manter valor aplicado.
- `startDate`/`endDate` calculados via `useMemo` usando `period` + `appliedRange`.
- `useTransactions({ startDate, endDate })` continua igual.

## 7. Validações
- Se usuário tentar aplicar range sem `from` ou `to`, não permitir; opcionalmente mostrar toast de erro.
- Se `from > to`, normalizar ou impedir (Day Picker já controla isso).

## 8. Testes Manuais
1. Selecionar “Hoje” → cards mostram dados de hoje.
2. Selecionar “Personalizado…”, escolher duas datas → aplicar → cards/lista refletem range.
3. Cancelar o popover sem aplicar → período anterior permanece.
4. Resetar → período volta para “Todos”.
5. Verificar se “Mês Atual” e “Mês Anterior” continuam corretos.

## 9. Entregáveis
- Atualização em `src/pages/Dashboard.tsx` com novos estados e UI.
- Possível utilitário auxiliar para formatação de range (opcional).
- Ajuste de estilos (opcional) para acomodar novo texto/botões.
- Documentação/guia descrevendo novos filtros (já disponível).

## 10. Passos Pós-Implementação
- `npm run build` para garantir ausência de erros.
- Validar manualmente a experiência nos quatro períodos principais.
- Revisar o guia (`docs/feature-filtros-dashboard.md`) se houver ajustes adicionais.
