
# Hay Paso 🚗💨 - Configuración de Base de Datos (Actualizado 24h)

Copia y ejecuta este script en el **SQL Editor** de tu proyecto en Supabase para habilitar todas las funciones, incluyendo la caducidad de 24 horas y la categoría 'Camino Libre'.

```sql
-- 1. Borrar tablas actuales
drop table if exists validaciones;
drop table if exists chat_mensajes;
drop table if exists reportes;

-- 2. Crear tabla de reportes
create table reportes (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  tipo text check (tipo in (
    'Camino Libre',
    'Tráfico Lento', 'Tráfico Pesado', 'Alto Total', 
    'Accidente', 'Obras', 
    'Policía Visible', 'Policía Escondido', 'Policía Contrario',
    'Vehículo en Vía', 'Vehículo en Lateral', 'Clima'
  )),
  descripcion text,
  fotos text[] default '{}',
  video_url text,
  latitud float8 not null,
  longitud float8 not null,
  estatus text default 'activo' check (estatus in ('activo', 'despejado'))
);

-- 3. Crear tabla de validaciones
create table validaciones (
  id uuid default gen_random_uuid() primary key,
  reporte_id uuid references reportes(id) on delete cascade,
  voto text check (voto in ('sigue', 'despejado')),
  usuario_id text,
  created_at timestamp with time zone default now()
);

-- 4. Crear tabla de chat
create table chat_mensajes (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  usuario_id text,
  contenido text
);

-- 5. Habilitar RLS
alter table reportes enable row level security;
alter table validaciones enable row level security;
alter table chat_mensajes enable row level security;

-- 6. Políticas públicas
create policy "Public Select Reportes" on reportes for select using (true);
create policy "Public Insert Reportes" on reportes for insert with check (true);
create policy "Public Select Validaciones" on validaciones for select using (true);
create policy "Public Insert Validaciones" on validaciones for insert with check (true);
create policy "Public Select Chat" on chat_mensajes for select using (true);
create policy "Public Insert Chat" on chat_mensajes for insert with check (true);

-- 7. Realtime
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table reportes, validaciones, chat_mensajes;

-- 8. Función de Limpieza (24 horas)
create or replace function limpiar_datos_viejos() 
returns void as $$
begin
  delete from reportes where created_at < now() - interval '24 hours';
  delete from chat_mensajes where created_at < now() - interval '24 hours';
end;
$$ language plpgsql;
```