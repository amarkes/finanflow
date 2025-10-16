-- Atualiza trigger para criar categorias padrão usando o ID do novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário')
  );

  INSERT INTO public.categories (user_id, name, type, color)
  VALUES
    (NEW.id, 'Salário', 'income', '#10B981'),
    (NEW.id, 'Freelance', 'income', '#059669'),
    (NEW.id, 'Investimentos', 'income', '#34D399'),
    (NEW.id, 'Alimentação', 'expense', '#EF4444'),
    (NEW.id, 'Transporte', 'expense', '#F59E0B'),
    (NEW.id, 'Moradia', 'expense', '#8B5CF6'),
    (NEW.id, 'Lazer', 'expense', '#EC4899'),
    (NEW.id, 'Saúde', 'expense', '#06B6D4');

  RETURN NEW;
END;
$$;
