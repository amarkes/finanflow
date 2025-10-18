-- Atualiza a função de auditoria para registrar create/update/delete
-- com diffs e tratamento de user_id vazio.

DROP TRIGGER IF EXISTS trg_audit_transactions ON public.transactions;
DROP TRIGGER IF EXISTS trg_audit_categories ON public.categories;
DROP TRIGGER IF EXISTS trg_audit_accounts ON public.accounts;

DROP FUNCTION IF EXISTS public.handle_audit_log();

CREATE OR REPLACE FUNCTION public.handle_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  entity public.audit_entity_type := TG_ARGV[0]::public.audit_entity_type;
  action public.audit_action_type;
  target_id uuid;
  actor uuid;
  owner uuid;
  message text;
  diff jsonb := '{}'::jsonb;
  before_data jsonb := NULL;
  after_data jsonb := NULL;
  key text;
  actor_name text;
  owner_name text;
  base_meta jsonb := '{}'::jsonb;
  owner_candidate text;
  label_after text;
  label_before text;
BEGIN
  IF entity IS NULL THEN
    RAISE EXCEPTION 'handle_audit_log requires an entity type (TG_ARGV[0])';
  END IF;

  IF TG_OP = 'INSERT' THEN
    action := 'created';
    target_id := NEW.id;
    after_data := to_jsonb(NEW);
    owner_candidate := after_data->>'user_id';
    IF owner_candidate IS NOT NULL AND owner_candidate <> '' THEN
      owner := owner_candidate::uuid;
    END IF;
    actor := auth.uid();
    IF actor IS NULL THEN
      actor := owner;
    END IF;
    diff := jsonb_build_object('after', after_data);

  ELSIF TG_OP = 'UPDATE' THEN
    action := 'updated';
    target_id := NEW.id;
    after_data := to_jsonb(NEW);
    before_data := to_jsonb(OLD);

    owner_candidate := after_data->>'user_id';
    IF owner_candidate IS NOT NULL AND owner_candidate <> '' THEN
      owner := owner_candidate::uuid;
    ELSE
      owner_candidate := before_data->>'user_id';
      IF owner_candidate IS NOT NULL AND owner_candidate <> '' THEN
        owner := owner_candidate::uuid;
      END IF;
    END IF;

    actor := auth.uid();
    IF actor IS NULL THEN
      IF owner IS NOT NULL THEN
        actor := owner;
      ELSE
        owner_candidate := after_data->>'user_id';
        IF owner_candidate IS NOT NULL AND owner_candidate <> '' THEN
          actor := owner_candidate::uuid;
        ELSE
          owner_candidate := before_data->>'user_id';
          IF owner_candidate IS NOT NULL AND owner_candidate <> '' THEN
            actor := owner_candidate::uuid;
          END IF;
        END IF;
      END IF;
    END IF;

    FOR key IN SELECT key FROM jsonb_object_keys(after_data) LOOP
      IF key IN ('updated_at', 'created_at') THEN
        CONTINUE;
      END IF;
      IF after_data->key IS DISTINCT FROM before_data->key THEN
        diff := diff || jsonb_build_object(
          key,
          jsonb_build_object(
            'from', before_data->key,
            'to', after_data->key
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
    before_data := to_jsonb(OLD);
    owner_candidate := before_data->>'user_id';
    IF owner_candidate IS NOT NULL AND owner_candidate <> '' THEN
      owner := owner_candidate::uuid;
    END IF;
    actor := auth.uid();
    IF actor IS NULL THEN
      actor := owner;
    END IF;
    diff := jsonb_build_object('before', before_data);
  END IF;

  IF owner IS NULL THEN
    owner := actor;
  END IF;

  IF actor IS NULL THEN
    actor := owner;
  END IF;

  IF actor IS NOT NULL THEN
    SELECT full_name INTO actor_name
    FROM public.profiles
    WHERE user_id = actor
    LIMIT 1;
  END IF;

  IF owner IS NOT NULL THEN
    SELECT full_name INTO owner_name
    FROM public.profiles
    WHERE user_id = owner
    LIMIT 1;
  END IF;

  IF owner IS NOT NULL THEN
    base_meta := jsonb_build_object('owner_id', owner);
  END IF;
  IF owner_name IS NOT NULL THEN
    base_meta := base_meta || jsonb_build_object('owner_name', owner_name);
  END IF;
  IF actor_name IS NOT NULL THEN
    base_meta := base_meta || jsonb_build_object('actor_name', actor_name);
  END IF;

  IF after_data IS NOT NULL THEN
    label_after := CASE entity
      WHEN 'transaction' THEN NULLIF(after_data->>'description', '')
      ELSE NULLIF(after_data->>'name', '')
    END;
  END IF;

  IF before_data IS NOT NULL THEN
    label_before := CASE entity
      WHEN 'transaction' THEN NULLIF(before_data->>'description', '')
      ELSE NULLIF(before_data->>'name', '')
    END;
  END IF;

  IF action = 'created' THEN
    message := CASE entity
      WHEN 'transaction' THEN format('Transação criada: %s', COALESCE(label_after, target_id::text))
      WHEN 'category' THEN format('Categoria criada: %s', COALESCE(label_after, target_id::text))
      WHEN 'account' THEN format('Conta criada: %s', COALESCE(label_after, target_id::text))
      ELSE format('%s criada', entity::text)
    END;
  ELSIF action = 'updated' THEN
    message := CASE entity
      WHEN 'transaction' THEN format('Transação atualizada: %s', COALESCE(label_after, target_id::text))
      WHEN 'category' THEN format('Categoria atualizada: %s', COALESCE(label_after, target_id::text))
      WHEN 'account' THEN format('Conta atualizada: %s', COALESCE(label_after, target_id::text))
      ELSE format('%s atualizada', entity::text)
    END;
  ELSE
    message := CASE entity
      WHEN 'transaction' THEN format('Transação removida: %s', COALESCE(label_before, target_id::text))
      WHEN 'category' THEN format('Categoria removida: %s', COALESCE(label_before, target_id::text))
      WHEN 'account' THEN format('Conta removida: %s', COALESCE(label_before, target_id::text))
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

CREATE TRIGGER trg_audit_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log('transaction');

CREATE TRIGGER trg_audit_categories
  AFTER INSERT OR UPDATE OR DELETE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log('category');

CREATE TRIGGER trg_audit_accounts
  AFTER INSERT OR UPDATE OR DELETE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log('account');

