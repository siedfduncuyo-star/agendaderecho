-- Ejecutar una sola vez en Supabase > SQL Editor.
-- Antes de ejecutar, reemplazar los correos de ejemplo por los del equipo autorizado.

create extension if not exists pgcrypto;

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time time not null,
  end_time time not null,
  name text not null check (char_length(name) between 1 and 160),
  secretary text not null default '',
  responsible text not null check (char_length(responsible) between 1 and 100),
  classroom text not null check (char_length(classroom) between 1 and 80),
  activity_type text not null default '',
  requirements text not null default '',
  meeting_url text not null default '',
  platform text not null default '',
  account_used text not null default '',
  recording_required boolean not null default false,
  source_uid text,
  observations text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- También actualiza una instalación creada con la primera versión.
alter table public.activities add column if not exists secretary text not null default '';
alter table public.activities add column if not exists source_uid text;
drop index if exists public.activities_source_uid_unique;
create unique index activities_source_uid_unique on public.activities (source_uid);

create table if not exists public.editor_allowlist (
  email text primary key check (email = lower(email)),
  added_at timestamptz not null default now()
);

-- IMPORTANTE: reemplazar estos correos antes de ejecutar.
insert into public.editor_allowlist (email) values
  ('coordinacion@facultad.edu.ar'),
  ('hibridaciones@facultad.edu.ar')
on conflict (email) do nothing;

create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.editor_allowlist
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_editor() from public;
grant execute on function public.is_editor() to anon, authenticated;

alter table public.activities enable row level security;
alter table public.editor_allowlist enable row level security;

grant select on public.activities to anon, authenticated;
grant insert, update, delete on public.activities to authenticated;
revoke all on public.editor_allowlist from anon, authenticated;

drop policy if exists "Agenda visible para todos" on public.activities;
create policy "Agenda visible para todos"
on public.activities for select
to anon, authenticated
using (true);

drop policy if exists "Editores pueden crear" on public.activities;
create policy "Editores pueden crear"
on public.activities for insert
to authenticated
with check (public.is_editor());

drop policy if exists "Editores pueden actualizar" on public.activities;
create policy "Editores pueden actualizar"
on public.activities for update
to authenticated
using (public.is_editor())
with check (public.is_editor());

drop policy if exists "Editores pueden eliminar" on public.activities;
create policy "Editores pueden eliminar"
on public.activities for delete
to authenticated
using (public.is_editor());

-- Nadie puede consultar ni modificar la lista desde la web.
-- Se administra solamente desde el panel de Supabase.

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists activities_set_updated_at on public.activities;
create trigger activities_set_updated_at
before update on public.activities
for each row execute function public.set_updated_at();

-- Registros de ejemplo ubicados en la semana actual.
insert into public.activities
  (date, start_time, end_time, name, secretary, responsible, classroom, activity_type, requirements, meeting_url, platform, account_used, recording_required, observations)
values
  (date_trunc('week', current_date)::date, '09:00', '11:00', 'Jornada de actualización en Derecho Procesal', 'Secretaría de Posgrado', 'Mariana López', 'Aula Magna', 'Jornada', 'Dos micrófonos, cámara fija y presentación', 'https://meet.google.com/', 'Google Meet', 'Cuenta institucional Posgrado', true, 'Realizar prueba técnica 30 minutos antes.'),
  ((date_trunc('week', current_date) + interval '1 day')::date, '16:00', '18:00', 'Defensa de trabajo final', 'Secretaría Académica', 'Lucas Fernández', 'Sala de Posgrado 2', 'Defensa', 'Notebook, proyector y audio bidireccional', 'https://zoom.us/', 'Zoom', 'Licencia Zoom Facultad', true, ''),
  ((date_trunc('week', current_date) + interval '3 days')::date, '10:30', '12:00', 'Reunión de coordinación académica', 'Educación a Distancia', 'Sofía Martínez', 'Sala de Consejo', 'Reunión', 'Pantalla y cámara móvil', 'https://teams.microsoft.com/', 'Microsoft Teams', 'Secretaría Académica', false, 'Participan autoridades de dos sedes.');
