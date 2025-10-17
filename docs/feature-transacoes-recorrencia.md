# Feature – Transações Únicas, Parceladas e Mensais

Esta funcionalidade adiciona ao FinanceFlow um controle de recorrência na criação de transações. Agora é possível definir se um lançamento será único, parcelado ou mensal, permitindo programar automaticamente os lançamentos futuros.

---

## Visão Rápida
- Novo campo **"Tipo de lançamento"** no formulário de transações: `Única`, `Parcelada`, `Mensal`.
- A opção `Parcelada` cria automaticamente as parcelas restantes distribuindo-as mensalmente; o valor total é dividido igualmente entre as parcelas.
- A opção `Mensal` replica o lançamento para os 12 meses seguintes, sempre na mesma data.
- Todos os lançamentos gerados herdam categoria, método de pagamento, conta, notas e status de pagamento da transação original.
- A listagem passa a destacar transações que fazem parte de uma série (parcelas ou mensal) para facilitar a identificação.

---

## Como Configurar Cada Tipo

### Única
1. Acesse **Transações** > **Nova transação**.
2. Preencha os campos habituais (tipo, valor, data, categoria etc.).
3. Em **Tipo de lançamento**, mantenha `Única`.
4. Salve para registrar apenas aquele lançamento.

> **Exemplo**: compra de supermercado registrada apenas uma vez.

### Parcelada
1. Selecione **Parcelada** em **Tipo de lançamento**.
2. Informe **Quantidade de parcelas** (mínimo 2, máximo 24).
3. Informe o valor total da compra; o FinanceFlow divide automaticamente entre as parcelas.
4. Ajuste a descrição, se desejar, para incluir observações (ex.: "TV 50\" 1/5").
5. Salve. O FinanceFlow cria imediatamente todas as parcelas com o mesmo valor calculado e datas mensais consecutivas.

> **Exemplo**: compra de TV de R$ 2.500 parcelada em 5 vezes → sistema cria 5 lançamentos de R$ 500 distribuídos mês a mês a partir da data inicial.

### Mensal
1. Selecione **Mensal** em **Tipo de lançamento**.
2. Defina normalmente os campos de valor, data inicial e categoria.
3. Salve. O FinanceFlow gera 12 lançamentos mensais consecutivos, mantendo dia e valor configurados.

> **Exemplo**: salário mensal com valor recorrente pelos próximos 12 meses.

---

## Gerenciando Séries de Transações
- As transações geradas por uma série exibem um marcador (`Parcelada 1/5`, `Mensal - Jul/2024`, etc.) na listagem para fácil identificação.
- Editar uma parcela individual permite alterar somente aquele lançamento; há também uma ação "Atualizar série" para aplicar mudanças futuras (ver especificação técnica).
- Excluir a transação original oferece as opções:
  - `Remover apenas este lançamento`
  - `Remover este e os próximos da série`

---

## Boas Práticas
- Utilize descrições claras para encontrar rapidamente suas parcelas (ex.: "Cartão - Notebook 2/10").
- Prefira contas/métodos de pagamento consistentes dentro da mesma série para facilitar conciliação.
- Ao ajustar o status de pagamento, considere usar a ação "Aplicar para a série" caso tenha quitado todas as parcelas.

---

## Perguntas Frequentes
- **Posso gerar parcelas com datas diferentes?**  
  As parcelas são geradas mês a mês a partir da data inicial. Ajustes individuais ainda podem ser feitos após a criação.

- **E se eu quiser interromper uma série?**  
  Exclua as parcelas futuras via opção "Remover série a partir deste lançamento" ou edite o número total de parcelas na ação de gerenciamento da série.

- **Existe recorrência ilimitada?**  
  Implementamos 12 meses como janela padrão para lançamentos mensais. Após esse período você pode renovar a série caso necessário.

---

Para detalhes de implementação técnica, consulte `docs/specs/transactions-recurring-installments.md`.
