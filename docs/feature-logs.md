# 🔧 Feature: Logs de Auditoria

## 🎯 Objetivo

Implementar um sistema de **logs de auditoria** que registre todas as alterações realizadas em **transações**, **categorias** e **contas**, garantindo rastreabilidade e histórico completo das modificações.

---

## 🛠️ Escopo

1. Criar logs para as ações de **criação**, **edição** e **deleção**.
2. Cada log deve conter:

   * O que foi alterado/criado/deletado.
   * Data/hora da ação.
   * Usuário que realizou a ação.
3. Os logs devem estar acessíveis:

   * Dentro da **transação** (histórico individual).
   * Dentro da **categoria**.
   * Dentro da **conta**.
   * Em uma **página geral de logs**.
4. Quando um item for **deletado**, o log deve ser adicionado ao **log geral do usuário**.
5. O layout deve ser **clean e funcional**, com foco na clareza das informações.
6. Inserir a página de log geral no **DropdownMenu** do componente `src/components/Header.tsx`.

---

## 🕹️ Especificação Técnica

### Banco de Dados

Criar uma nova tabela `audit_logs` com os seguintes campos:

| Campo       | Tipo                                       | Descrição                                       |
| ----------- | ------------------------------------------ | ----------------------------------------------- |
| id          | UUID                                       | Identificador único                             |
| entity_type | ENUM(`transaction`, `category`, `account`) | Tipo da entidade                                |
| entity_id   | UUID                                       | ID da entidade afetada                          |
| action      | ENUM(`created`, `updated`, `deleted`)      | Ação realizada                                  |
| user_id     | UUID                                       | ID do usuário que realizou a ação               |
| message     | TEXT                                       | Resumo do evento                                |
| changes     | JSONB                                      | Campos alterados com valores anteriores e novos |
| created_at  | TIMESTAMPTZ                                | Data e hora da ação                             |
| meta        | JSONB                                      | Informações adicionais (ex: IP, agente)         |

### Migration

Gerar migration em `src/database/migrations/XXXX-create-audit-logs.ts` para criar a tabela acima com índices em:

* `(entity_type, entity_id)`
* `(user_id)`
* `(created_at)`

### Model

Criar model `AuditLog.ts` com escopos auxiliares:

* `byEntity(entity_type, entity_id)`
* `byUser(user_id)`
* `recent()`

---

## 🔢 Backend (Node.js / Sequelize)

### Biblioteca de Logs

Criar arquivo `src/lib/auditLogger.ts` com funções utilitárias:

* `logCreated(entityType, entityId, record, userId)`
* `logUpdated(entityType, entityId, before, after, userId)` → calcula diff JSON.
* `logDeleted(entityType, entityId, before, userId)` → também grava no log geral do usuário.

Os logs devem ser gerados automaticamente após ações de CRUD nas rotas de transações, categorias e contas.

### Endpoints

Criar rota `src/routes/auditLogs.routes.ts`:

* `GET /audit-logs` → lista logs filtráveis por tipo, data, usuário e entidade.
* `GET /audit-logs/:entityType/:entityId` → lista logs da entidade.

---

## 🕊️ Frontend (React + Tailwind)

### Componentes

Criar em `src/components/audit/`:

* `LogRow.tsx`: linha de log com ação, data, usuário e mensagem.
* `LogDiff.tsx`: exibe alterações antes/depois.
* `LogPanel.tsx`: painel reutilizável de logs para transações, categorias e contas.

### Página Geral de Logs

Criar `src/pages/logs/index.tsx`:

* Exibir tabela com filtros (entidade, tipo de ação, data, usuário, busca por texto).
* Layout responsivo, minimalista e em modo escuro/claro.

### Header

No arquivo `src/components/Header.tsx`, dentro do `DropdownMenu`, adicionar item:

```tsx
<DropdownMenuItem asChild>
  <Link to="/logs">Logs de Auditoria</Link>
</DropdownMenuItem>
```

---

## 🔎 Critérios de Aceitação

* [x] Logs registrados corretamente para create/update/delete.
* [x] Logs exibidos dentro das páginas de transação, categoria e conta.
* [x] Página geral de logs funcional e filtrável.
* [x] Layout limpo e responsivo.
* [x] Link de acesso no Header.

---

## 🔗 Exemplo de Log

**created**:

> Transação criada: `Compra no mercado` (R$ 120,00)

**updated**:

```json
{
  "amount": {"from": 120, "to": 150},
  "category": {"from": "Mercado", "to": "Alimentação"}
}
```

**deleted**:

> Conta deletada: `Cartão Visa final 1234`

---

**Mensagem Final:**

> "Os logs garantem transparência e controle total das ações realizadas no sistema. Toda alteração agora é registrada automaticamente."
