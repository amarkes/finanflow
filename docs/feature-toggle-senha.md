# Feature – Mostrar/Ocultar Senha em Login e Cadastro

Esta melhoria adiciona um botão para alternar entre mostrar e ocultar a senha nos formulários de Login e Cadastro.

---

## Motivação
- Usuários podem digitar senhas complexas e desejam confirmar o que digitam.
- A experiência atual fixa o campo em `type="password"`, dificultando a verificação.

---

## O que será feito
1. Adicionar um botão “Mostrar/Ocultar” (ícone olho) dentro dos campos de senha:
   - `src/pages/Login.tsx`
   - `src/pages/Register.tsx` (ambos os inputs de senha).
2. O botão deve alternar o `type` do input entre `password` e `text`, mantendo o controle por React Hook Form.
3. Manter a estética (shadcn/Tailwind), respeitando `FormField`/`FormControl`.
4. Labels e ícones devem indicar claramente a ação (ex.: `Mostrar` ↔ `Ocultar`).

---

## Fluxo esperado
- Usuário clica no ícone → a senha fica visível (`type="text"`).
- Ao clicar novamente → volta `type="password"`.
- O botão não deve quebrar validações existentes.

---

## Testes recomendados
1. Login: alternar visibilidade e submeter com senha visível/oculta.
2. Cadastro: testar ambos os campos (Senha/Confirmar senha).
3. Responsividade: garantir que ícone não sobreponha texto.

---

## Observações futuras
- Avaliar acessibilidade adicional (ex.: aria-label dinâmica).
- Considerar a mesma abordagem em “Esqueci minha senha” se houver campo de nova senha.
