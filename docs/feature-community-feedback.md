# 🔧 Feature: Menu de Melhorias e Changelogs Comunitários

## 🎯 Objetivo

Adicionar um menu no sistema onde os usuários possam:

1. Inserir **melhorias** (dicas ou sugestões).
2. Reportar **problemas** (bugs ou erros).
3. Visualizar **changelogs públicos**, mostrando as atualizações e melhorias feitas para toda a comunidade de usuários.

---

## 🛠️ Escopo

* Criar um novo item de menu chamado **“Comunidade”** ou **“Melhorias & Problemas”**.
* Dentro desse menu, incluir as seguintes seções:

  * **Nova contribuição** → formulário para o usuário enviar uma sugestão ou problema.
  * **Histórico de changelogs** → lista com as melhorias aprovadas e implementadas.
* Permitir que os usuários escolham entre:

  * **Dica/Sugestão**
  * **Problema/Bug**
* Adicionar um campo de **prioridade automática** (problemas terão prioridade maior).
* Criar endpoint/backend para armazenar:

  * tipo (sugestão | problema)
  * título
  * descrição
  * data de envio
  * status (pendente, em análise, resolvido)
  * autor (usuário autenticado)
* Criar endpoint para exibir changelogs públicos, ordenados por data de publicação.

---

## 🔧 Requisitos Funcionais

1. O menu “Comunidade” deve ser acessível a todos os usuários logados.
2. O formulário de envio deve validar campos obrigatórios (tipo, título, descrição).
3. Ao enviar, deve exibir uma mensagem de sucesso **“Sua contribuição foi enviada com sucesso. Obrigado por ajudar a comunidade!”**.
4. O changelog deve exibir:

   * Data da melhoria
   * Tipo (dica/problema)
   * Descrição resumida
   * Status (ex: implementado, em andamento)
5. Permitir que administradores aprovem e publiquem sugestões no changelog público.

---

## 🕹️ Exemplo de Fluxo

1. Usuário acessa o menu **“Comunidade”**.
2. Escolhe entre:

   * **Enviar uma dica** (ex: “Adicionar tema escuro no dashboard”)
   * **Reportar um problema** (ex: “Botão de salvar não está funcionando”)
3. Envia o formulário.
4. O backend salva o registro e envia notificação opcional.
5. Quando a equipe corrige ou implementa a sugestão, o item aparece automaticamente na aba de **Changelogs Públicos**.

---

## 🛠️ Tecnologias / Considerações Técnicas

* **Frontend**: React (ou framework em uso)
* **Backend**: Node.js com API REST (Express ou AdonisJS)
* **Banco de dados**: PostgreSQL (tabela `community_feedback`)

### Estrutura da Tabela `community_feedback`

| Campo       | Tipo                                 | Descrição                  |
| ----------- | ------------------------------------ | -------------------------- |
| id          | PK                                   | Identificador único        |
| user_id     | FK                                   | Usuário que enviou         |
| type        | enum: `suggestion`, `issue`          | Tipo da contribuição       |
| title       | string                               | Título da contribuição     |
| description | text                                 | Descrição detalhada        |
| status      | enum: `pending`, `reviewing`, `done` | Situação atual             |
| created_at  | timestamp                            | Data de criação            |
| updated_at  | timestamp                            | Data da última atualização |

### Endpoints

* **POST** `/community/feedback` → cria nova contribuição
* **GET** `/community/changelog` → lista contribuições com status `done`

---

## 🔎 Critérios de Aceitação

* [x] Formulário envia corretamente o tipo e descrição.
* [x] Mensagem de sucesso exibida após envio.
* [x] Changelog lista apenas contribuições com status "done".
* [x] Interface simples e responsiva, integrada ao menu principal.
* [x] Possibilidade de ampliar futuramente para votos e comentários.

---

## 🖌️ Sugestão de Layout (UI/UX)

### Menu lateral: "💬 Comunidade"

#### Aba 1: "Enviar contribuição"

* [Seleção Tipo] Dica | Problema
* [Campo Texto] Título
* [Textarea] Descrição
* [Botão] Enviar

#### Aba 2: "Changelog"

* Lista ordenada com tags coloridas:

  * 🟢 Implementado
  * 🟡 Em andamento
  * 🔴 Pendente

---

**Mensagem final:**

> "Ajude a melhorar nossa plataforma! Envie suas ideias ou relate problemas – juntos, deixamos o sistema ainda melhor."
