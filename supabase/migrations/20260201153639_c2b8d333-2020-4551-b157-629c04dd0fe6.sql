-- Drop existing constraints
ALTER TABLE user_roles 
  DROP CONSTRAINT IF EXISTS user_roles_role_fkey;
ALTER TABLE role_permissions 
  DROP CONSTRAINT IF EXISTS role_permissions_role_fkey;

-- Re-add with ON UPDATE CASCADE
ALTER TABLE user_roles 
  ADD CONSTRAINT user_roles_role_fkey 
    FOREIGN KEY (role) 
    REFERENCES custom_roles(name) 
    ON UPDATE CASCADE 
    ON DELETE CASCADE;

ALTER TABLE role_permissions 
  ADD CONSTRAINT role_permissions_role_fkey 
    FOREIGN KEY (role) 
    REFERENCES custom_roles(name) 
    ON UPDATE CASCADE 
    ON DELETE CASCADE;

-- Audit trigger for role renames
CREATE OR REPLACE FUNCTION log_role_rename()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    INSERT INTO audit_logs (action, resource, details, user_id)
    VALUES (
      'role_renamed',
      'custom_roles',
      jsonb_build_object(
        'old_name', OLD.name,
        'new_name', NEW.name
      ),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_role_rename
  BEFORE UPDATE ON custom_roles
  FOR EACH ROW
  EXECUTE FUNCTION log_role_rename();