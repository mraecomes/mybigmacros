-- Allows a user to delete their own account from client-side code.
-- security definer runs with creator privileges so auth.users can be deleted
-- without exposing the service role key to the client.
create or replace function delete_user()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.profiles where id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;
