# Especificação: Gestão Comunitária para Usuários Staff

## 🎯 Objetivo

Permitir que usuários com privilégio **staff** moderem contribuições da comunidade, atualizem status de feedbacks e respondam aos participantes diretamente pelo dashboard.

---

## 📋 Escopo

### 1. Perfis e Permissões

- Criar tabela `profiles` vinculada ao usuário (`auth.users`), contendo:
  - `id` (PK, uuid)
  - `user_id` (FK → `auth.users.id`)
  - `is_staff` (boolean, default `false`)
  - `created_at`, `updated_at`
- Somente usuários staff poderão acessar ferramentas administrativas.
- Perfis comuns continuam acessando envio e changelog.

### 2. Feedback Comunitário

- Acrescentar novo status `rejected`.
- Adicionar coluna `staff_response` (texto livre) para resposta oficial.
- Staff visualiza todas as contribuições em uma aba exclusiva.
- Staff pode alterar status (`pending`, `reviewing`, `done`, `rejected`) e escrever uma resposta.
- Usuários sempre visualizam os próprios envios e status/resultados.

### 3. Interface

#### Aba “Enviar contribuição”
- Mantém formulário existente.
- Exibe, abaixo do call-to-action final, uma lista das contribuições do usuário:
  - Título
  - Status com badge
  - Data de envio
  - Resposta da equipe (quando existir)

#### Aba “Changelog público”
- Segue listando itens `done`.

#### Aba “Moderação” (visível apenas para staff)
- Lista paginada ou infinita com filtros básicos (tipo e status).
- Cada item permite atualizar status, editar resposta, salvar alterações.
- Indicar autor original e datas.

### 4. Regras

- Usuários comuns:
  - Podem criar feedbacks.
  - Podem ver apenas os próprios itens (qualquer status).
  - Visualizam o changelog público (`done`).
- Usuários staff:
  - Acesso total a todos os registros.
  - Podem atualizar status e resposta.
  - Podem visualizar lista completa no dashboard.

### 5. API/Backend

- `profiles` com RLS garantindo acesso somente ao próprio perfil.
- Atualização do enum `community_feedback_status` para incluir `rejected`.
- Policies de `community_feedback` atualizadas para permitir:
  - `SELECT` geral para staff.
  - `UPDATE` somente para staff.
  - `SELECT/INSERT` do próprio registro para usuários comuns.
- Novos endpoints (ou uso direto do Supabase) para:
  - Buscar perfil atual.
  - Listar feedback do usuário.
  - Listar feedback geral (staff).
  - Atualizar status/resposta (staff).

### 6. Quadro de Status

| Status      | Quem define        | Descrição                                    |
|-------------|--------------------|----------------------------------------------|
| `pending`   | Usuário (default)  | Recebido e aguardando triagem                |
| `reviewing` | Staff              | Em análise pela equipe                       |
| `done`      | Staff              | Implementado e disponível no changelog       |
| `rejected`  | Staff              | Recusado; exibir resposta explicativa        |

---

## ✅ Critérios de Aceitação

1. ✅ Usuários staff visualizam aba adicional com lista completa de feedbacks.
2. ✅ Staff consegue atualizar status e registrar resposta, com persistência.
3. ✅ Usuários comuns visualizam histórico pessoal logo após o envio.
4. ✅ `community_feedback` contempla o novo status e campo de resposta.
5. ✅ `profiles` indica corretamente `is_staff`, com RLS preservando segurança.
6. ✅ Interface responsiva para desktop e mobile.

---

## 🔍 Casos de Teste

1. **Usuário comum envia feedback**
   - Feedback aparece na lista pessoal com status `pending`.
   - Não acessa aba de moderação.

2. **Usuário staff modera feedback**
   - Atualiza status para `reviewing`, adiciona resposta.
   - Usuário comum vê atualização imediatamente (via refetch).

3. **Feedback rejeitado**
   - Status mostra `rejected` em vermelho.
   - Resposta é exibida ao autor.

4. **Responsividade**
   - Layout das abas e tabelas ajusta para telas pequenas.

---

## 🛠️ Práticas Recomendadas

- Centralizar consulta ao perfil em hook (`useProfile`) com cache.
- Revalidar listas após mutações (React Query).
- Destacar visualmente ações restritas a staff para evitar confusão.

---

## 🧭 Próximos Passos (Futuros)

- Histórico de alterações por staff.
- Notificações push/e-mail ao atualizar status.
- Métricas e filtros avançados (por módulo, impacto).

