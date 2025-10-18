DO $$
BEGIN
  CREATE TYPE public.audit_entity_type AS ENUM ('transaction', 'category', 'account');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  CREATE TYPE public.audit_action_type AS ENUM ('created', 'updated', 'deleted');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.audit_entity_type NOT NULL,
  entity_id uuid NOT NULL,
  action public.audit_action_type NOT NULL,
  user_id uuid REFERENCES auth.users (id),
  message text,
  changes jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Audit logs actor access" ON public.audit_logs;
CREATE POLICY "Audit logs actor access"
  ON public.audit_logs
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Audit logs owner access" ON public.audit_logs;
CREATE POLICY "Audit logs owner access"
  ON public.audit_logs
  FOR SELECT
  USING ((meta ->> 'owner_id')::uuid = auth.uid());

DROP POLICY IF EXISTS "Audit logs staff access" ON public.audit_logs;
CREATE POLICY "Audit logs staff access"
  ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.is_staff = true
    )
  );

DROP POLICY IF EXISTS "Audit logs insert" ON public.audit_logs;
CREATE POLICY "Audit logs insert"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.handle_audit_log(entity public.audit_entity_type)
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action public.audit_action_type;
  target_id uuid;
  actor uuid;
  owner uuid;
  message text;
  diff jsonb := '{}'::jsonb;
  before_data jsonb;
  after_data jsonb;
  key text;
  actor_name text;
  owner_name text;
  base_meta jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action := 'created';
    target_id := NEW.id;
    actor := COALESCE(auth.uid(), NEW.user_id);
    owner := NEW.user_id;
    after_data := to_jsonb(NEW);
    diff := jsonb_build_object('after', after_data);
  ELSIF TG_OP = 'UPDATE' THEN
    action := 'updated';
    target_id := NEW.id;
    actor := COALESCE(auth.uid(), NEW.user_id, OLD.user_id);
    owner := NEW.user_id;
    after_data := to_jsonb(NEW);
    before_data := to_jsonb(OLD);
    FOR key IN SELECT key FROM jsonb_object_keys(after_data) LOOP
      IF key IN ('updated_at', 'created_at') THEN
        CONTINUE;
      END IF;
      IF after_data -> key IS DISTINCT FROM before_data -> key THEN
        diff := diff || jsonb_build_object(
          key,
          jsonb_build_object(
            'from', before_data -> key,
            'to', after_data -> key
          )
        );
      END IF;
    END LOOP;
    IF diff = '{}'::jsonb THEN
      RETURN NULL;
    END IF;
  ELSE
    action := 'deleted';
    target_id := OLD.id;
    actor := COALESCE(auth.uid(), OLD.user_id);
    owner := OLD.user_id;
    before_data := to_jsonb(OLD);
    diff := jsonb_build_object('before', before_data);
  END IF;

  IF actor IS NULL THEN
    actor := owner;
  END IF;

  SELECT full_name INTO actor_name FROM public.profiles WHERE user_id = actor LIMIT 1;
  SELECT full_name INTO owner_name FROM public.profiles WHERE user_id = owner LIMIT 1;

  base_meta := jsonb_build_object('owner_id', owner);

  IF owner_name IS NOT NULL THEN
    base_meta := base_meta || jsonb_build_object('owner_name', owner_name);
  END IF;

  IF actor_name IS NOT NULL THEN
    base_meta := base_meta || jsonb_build_object('actor_name', actor_name);
  END IF;

  IF TG_OP = 'INSERT' THEN
    message := CASE entity
      WHEN 'transaction' THEN format('Transação criada: %s', COALESCE(NEW.description, target_id::text))
      WHEN 'category' THEN format('Categoria criada: %s', COALESCE(NEW.name, target_id::text))
      WHEN 'account' THEN format('Conta criada: %s', COALESCE(NEW.name, target_id::text))
      ELSE format('%s criada', entity::text)
    END;
  ELSIF TG_OP = 'UPDATE' THEN
    message := CASE entity
      WHEN 'transaction' THEN format('Transação atualizada: %s', COALESCE(NEW.description, target_id::text))
      WHEN 'category' THEN format('Categoria atualizada: %s', COALESCE(NEW.name, target_id::text))
      WHEN 'account' THEN format('Conta atualizada: %s', COALESCE(NEW.name, target_id::text))
      ELSE format('%s atualizada', entity::text)
    END;
  ELSE
    message := CASE entity
      WHEN 'transaction' THEN format('Transação removida: %s', COALESCE(OLD.description, target_id::text))
      WHEN 'category' THEN format('Categoria removida: %s', COALESCE(OLD.name, target_id::text))
      WHEN 'account' THEN format('Conta removida: %s', COALESCE(OLD.name, target_id::text))
      ELSE format('%s removida', entity::text)
    END;
  END IF;

  INSERT INTO public.audit_logs (entity_type, entity_id, action, user_id, message, changes, meta)
  VALUES (
    entity,
    target_id,
    action,
    actor,
    message,
    CASE WHEN diff = '{}'::jsonb THEN NULL ELSE diff END,
    base_meta
  );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_transactions ON public.transactions;
CREATE TRIGGER trg_audit_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log('transaction');

DROP TRIGGER IF EXISTS trg_audit_categories ON public.categories;
CREATE TRIGGER trg_audit_categories
  AFTER INSERT OR UPDATE OR DELETE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log('category');

DROP TRIGGER IF EXISTS trg_audit_accounts ON public.accounts;
CREATE TRIGGER trg_audit_accounts
  AFTER INSERT OR UPDATE OR DELETE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log('account');
