
# Hay Paso 🚗💨

**Evita el tráfico, llega a tiempo.**

PWA de reporte de tráfico en tiempo real para la ruta **Manzanillo - Colima - Guadalajara**.

## Configuración de Supabase (CRÍTICO)

Para que la aplicación funcione, debes ejecutar este código SQL en el **SQL Editor** de tu panel de Supabase:

```sql
-- 1. Crear tabla de reportes
create table if not exists reportes (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  tipo text check (tipo in ('Accidente Pesado', 'Obras', 'Tráfico Lento', 'Clima')),
  descripcion text,
  foto_url text,
  video_url text,
  latitud float8,
  longitud float8,
  estatus text default 'activo' check (estatus in ('activo', 'despejado'))
);

-- 2. Crear tabla de validaciones
create table if not exists validaciones (
  id uuid default gen_random_uuid() primary key,
  reporte_id uuid references reportes(id) on delete cascade,
  voto text check (voto in ('sigue', 'despejado')),
  usuario_id text
);

-- 3. Habilitar Realtime
alter publication supabase_realtime add table reportes;

-- 4. Crear el Bucket de Storage (Si te da error "Bucket not found")
-- Nota: Si el SQL de abajo no funciona, créalo manualmente en Storage > New Bucket > nombre: fotos_accidentes (Público)
insert into storage.buckets (id, name, public) 
values ('fotos_accidentes', 'fotos_accidentes', true)
on conflict (id) do nothing;

-- 5. Políticas de Storage para permitir subidas (Anon)
create policy "Permitir subidas anónimas" on storage.objects for insert with check (bucket_id = 'fotos_accidentes');
create policy "Permitir lectura pública" on storage.objects for select using (bucket_id = 'fotos_accidentes');
```

## Características principales
- 📍 **Reportes Geocalizados:** Captura automática de ubicación.
- 📸 **Multimedia:** Fotos comprimidas (<300KB) y videos cortos (máx 15s).
- ⚡ **Tiempo Real:** Notificaciones instantáneas vía Supabase Realtime.
- 🗺️ **Mapa Interactivo:** Visualización clara de incidentes con Leaflet.
- 📱 **PWA:** Instalable en dispositivos Android/iOS como una app nativa.
- 🌑 **Dark Mode:** Interfaz optimizada para uso en carretera.

## Instalación Local
1. Clona este repositorio.
2. Ejecuta `npm install`.
3. Ejecuta `npm start`.

## Despliegue en Hostinger
1. Genera el build: `npm run build`.
2. Sube el contenido de la carpeta `dist` al servidor.
3. Configura el `.htaccess` para manejar el enrutamiento de React.
