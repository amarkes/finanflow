# Especificação: Card de Cartão de Crédito - Visualização de Parcelas

## 📋 Contexto Atual

No dashboard financeiro, existe um card que exibe informações de contas de cartão de crédito. Atualmente, quando o usuário **filtra por mês**, o card mostra **apenas o valor das parcelas do mês selecionado**, sem considerar o total da dívida parcelada completa.

### Problema Identificado

- **Comportamento atual**: Ao filtrar por mês (ex: Janeiro/2025), o card exibe apenas as parcelas que vencem em Janeiro
- **Limitação**: O usuário não consegue visualizar o impacto total do parcelamento no limite disponível do cartão
- **Necessidade**: Usuários precisam entender quanto do limite está comprometido com parcelas futuras, não apenas do mês atual

---

## 🎯 Solução Proposta

Atualizar o card de cartão de crédito para **sempre exibir o total parcelado** (mês atual + parcelas futuras), eliminando a alternância de modos. Assim, o usuário visualiza em um único bloco:

- Fatura do período selecionado
- Valor total parcelado remanescente
- Quantidade de parcelas futuras
- Limite disponível já considerando o impacto completo das parcelas

---

## 📐 Especificação Detalhada

### 1. Componente de Interface

**Localização**: Dentro do card existente de cartão de crédito no dashboard

**Ajustes visuais**:
- Destaque para o valor total parcelado e parcelas restantes
- Nota explicativa indicando que o limite disponível considera parcelas futuras
- Indicador simples de carregamento enquanto os valores de parcelas futuras são consultados

### 2. Exibição de Valores

#### Formato do Texto no Card:

```
💳 Cartão de Crédito Visa
Fatura de Janeiro/2025: R$ 1.500,00
Total parcelado: R$ 4.500,00 (3 parcelas restantes)
Limite disponível: R$ 5.500,00*
*Considerando parcelas futuras
```

### 3. Cálculo do Limite Disponível

**Fórmula única**:
```
Limite Disponível = Limite Total - (Fatura do Mês + Soma de Todas as Parcelas Futuras)
```

### 4. Exemplo Prático

**Cenário**:
- Limite total do cartão: R$ 10.000,00
- Compra parcelada: R$ 3.000,00 em 6x de R$ 500,00
- Parcela atual: 2/6
- Fatura de Janeiro/2025: R$ 1.500,00 (inclui R$ 500,00 da parcela + R$ 1.000,00 de outras despesas)

**Visualização única**:
```
Janeiro/2025: R$ 1.500,00
Total parcelado: R$ 2.500,00 (5 parcelas restantes × R$ 500,00)
Limite disponível: R$ 6.000,00*
*Descontando R$ 1.500,00 (mês atual) + R$ 2.500,00 (parcelas futuras)
```

---

## 🔧 Requisitos Técnicos

### 1. Estado da Aplicação

- Não há alternância de modo; o card sempre usa os dados consolidados (período atual + futuras)
- Os dados são obtidos via React Query e atualizados conforme filtros do dashboard

### 2. Queries/Consultas

**Fatura do período** (já existe):
```sql
SELECT SUM(valor) 
FROM transacoes 
WHERE conta_id = ? 
  AND MONTH(data_vencimento) = ? 
  AND YEAR(data_vencimento) = ?
```

**Parcelas futuras** (nova consulta):
```sql
-- Parcelas do mês atual
SELECT SUM(valor) as valor_mes
FROM transacoes 
WHERE conta_id = ? 
  AND MONTH(data_vencimento) = ? 
  AND YEAR(data_vencimento) = ?

UNION ALL

-- Parcelas futuras
SELECT SUM(valor) as parcelas_futuras
FROM transacoes 
WHERE conta_id = ? 
  AND data_vencimento > LAST_DAY(?)
  AND tipo = 'PARCELADO'
  AND status = 'PENDENTE'
```

### 3. Formatação de Texto

**Template sugerido**:
```javascript
`${nomeMes}/${ano}: R$ ${valorMes.toLocaleString('pt-BR')}`
`Total parcelado: R$ ${totalParcelado.toLocaleString('pt-BR')} (${numParcelas} parcelas restantes)`
`Limite disponível: R$ ${limiteDisponivelReal.toLocaleString('pt-BR')}*`
`*Considerando parcelas futuras`
```

---

## 🎨 Sugestões de UX

- Utilizar tooltip ou legenda curta reforçando que o limite disponível já considera parcelas futuras.
- Exibir badge com a quantidade de parcelas restantes ao lado do valor total parcelado.
- Mostrar estado de carregamento discreto enquanto os valores são atualizados após trocar o filtro de período.

---

## ✅ Checklist de Implementação

- [ ] Criar query para buscar parcelas futuras
- [ ] Implementar cálculo de limite disponível com parcelas futuras
- [ ] Adicionar formatação de texto com asterisco e nota explicativa
- [ ] Adicionar indicador visual de parcelas restantes (ex: "5 parcelas restantes")
- [ ] Testar com múltiplos cartões
- [ ] Testar com parcelas de períodos diferentes
- [ ] Validar cálculos com diferentes cenários
- [ ] Adicionar tooltip explicativo se necessário
- [ ] Garantir responsividade no mobile
- [ ] Documentar mudança no código

---

## 📝 Exemplo de User Story

**Como** usuário do dashboard financeiro  
**Eu quero** visualizar automaticamente o impacto total das minhas compras parceladas no limite do cartão  
**Para que** eu possa tomar decisões financeiras considerando não só o mês atual, mas todas as parcelas futuras comprometidas

**Critérios de Aceitação**:
1. ✅ O card mostra automaticamente o total parcelado (mês atual + futuras)
2. ✅ Vejo claramente quanto do limite está comprometido
3. ✅ O número de parcelas restantes é exibido
4. ✅ Há indicação visual de que o limite considera parcelas futuras
5. ✅ O comportamento é consistente entre sessões

---

## 🔍 Casos de Teste

### Teste 1: Cartão sem parcelas
- **Cenário**: Cartão só tem despesas à vista no mês
- **Esperado**: Ambos os modos mostram o mesmo valor

### Teste 2: Cartão com uma compra parcelada
- **Cenário**: Compra de R$ 1.200 em 6x, na parcela 2/6
- **Esperado Modo Mês**: Mostra R$ 200,00
- **Esperado Modo Total**: Mostra R$ 200,00 (mês) + R$ 1.000,00 (5 parcelas futuras)

### Teste 3: Múltiplas compras parceladas
- **Cenário**: 3 compras parceladas com vencimentos diferentes
- **Esperado**: Soma correta de todas as parcelas futuras

### Teste 4: Parcelas que terminam no mês atual
- **Cenário**: Última parcela de um parcelamento
- **Esperado**: Não adicionar no total de parcelas futuras

---

## 💬 Texto Final Sugerido para o Card

### Versão Compacta:
```
💳 Cartão Nubank
Jan/2025: R$ 1.500,00 | Total: R$ 4.500,00 de R$ 10.000,00
Limite disponível: R$ 5.500,00
```

### Versão Detalhada:
```
💳 Cartão Nubank
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fatura Janeiro/2025: R$ 1.500,00
Total parcelado pendente: R$ 3.000,00
(6 parcelas restantes)

Limite do cartão: R$ 10.000,00
Limite disponível: R$ 5.500,00*
*Considerando as parcelas futuras
```

---
## ⏳ Histórico de Decisões

- **Decisão 1**: Optou-se por usar um `ToggleGroup` para a seleção de visualização por ser mais compacto e intuitivo para duas opções.
- **Decisão 2**: A persistência da preferência do usuário será feita via `localStorage` para simplicidade, podendo ser migrada para o banco de dados no futuro se necessário.
- **Decisão 3**: O cálculo do "Total" incluirá todas as transações não pagas (`is_paid = false`), independentemente do mês de vencimento, para refletir o compromisso total no limite do cartão.
