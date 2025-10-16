# Especificação Técnica – Botão Mostrar/Ocultar Senha

## 1. Objetivo
Adicionar um toggle de visibilidade nos inputs de senha das páginas de Login e Cadastro, mantendo o uso de React Hook Form + shadcn UI.

## 2. Escopo
- Atualizar os inputs de senha em:
  - `src/pages/Login.tsx`
  - `src/pages/Register.tsx` (campos “Senha” e “Confirmar Senha”)
- A solução deve ser reutilizável e seguir o estilo da aplicação.

## 3. Requisitos Funcionais
1. Cada input de senha deve ter um botão (ícone olho/olho cortado) no canto direito.
2. Ao clicar, alternar o `type` do campo entre `password` e `text`.
3. O estado do toggle deve ser controlado por componente (ex.: `useState` por campo).
4. O botão deve ser acessível (aria-label indicando ação atual).

## 4. Requisitos Não Funcionais
- Usar componentes shadcn (Button/Icons) e tailwind para estilo.
- Não introduzir dependências externas.
- Preservar validações e mensagens atuais (React Hook Form/Zod).
- Layout deve funcionar em desktop e mobile.

## 5. Implementação
1. Criar um wrapper reutilizável (opcional) ou aplicar lógica inline no componente.
2. Para cada campo:
   ```tsx
   const [showPassword, setShowPassword] = useState(false);
   ...
   <Input type={showPassword ? 'text' : 'password'} ... />
   <Button variant="ghost" size="icon" onClick={...}>
     {showPassword ? <EyeOff /> : <Eye />}
   </Button>
   ```
3. Manter `FormField`/`FormControl` (shadcn) para exibir erros.
4. Garantir que o botão não dispare submit (usar `type="button"`).

## 6. Testes
- Clicar em “Mostrar” → senha visível; “Ocultar” → volta a asteriscos.
- Submeter formulário funcionando com qualquer estado do toggle.
- Validar em dispositivos móveis (padding/ícone não sobrepõe texto).

## 7. Entregáveis
- Login com toggle de senha.
- Cadastro com toggle para senha e confirmação.
- Documentação (feature + spec) entregue.
- Build (`npm run build`) sem erros.
