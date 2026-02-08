
# 🛠️ REPARACIÓN TOTAL DE BASE DE DATOS (SOLUCIÓN FINAL CORREGIDA)

Copia y pega este código en el **SQL Editor** de tu proyecto Supabase y presiona **RUN**. 

```sql
-- 1. LIMPIEZA TOTAL
DROP TABLE IF EXISTS validaciones CASCADE;
DROP TABLE IF EXISTS reportes CASCADE;
DROP TABLE IF EXISTS chat_mensajes CASCADE;

-- 2. TABLA DE REPORTES (Usando UUID)
CREATE TABLE reportes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    tipo TEXT NOT NULL,
    descripcion TEXT,
    fotos TEXT[] DEFAULT '{}',
    video_url TEXT,
    latitud DOUBLE PRECISION NOT NULL,
    longitud DOUBLE PRECISION NOT NULL,
    estatus TEXT DEFAULT 'activo',
    es_admin BOOLEAN DEFAULT FALSE,
    fuente TEXT
);

-- 3. TABLA DE VALIDACIONES
CREATE TABLE validaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    reporte_id UUID REFERENCES reportes(id) ON DELETE CASCADE,
    voto TEXT NOT NULL,
    usuario_id TEXT NOT NULL
);

-- 4. TABLA DE CHAT
CREATE TABLE chat_mensajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    usuario_id TEXT NOT NULL,
    contenido TEXT NOT NULL
);

-- 5. DESACTIVAR SEGURIDAD (RLS) PARA ACCESO PÚBLICO
ALTER TABLE reportes DISABLE ROW LEVEL SECURITY;
ALTER TABLE validaciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_mensajes DISABLE ROW LEVEL SECURITY;

-- 6. CONFIGURAR REPLICACIÓN PARA TIEMPO REAL
ALTER TABLE reportes REPLICA IDENTITY FULL;
ALTER TABLE validaciones REPLICA IDENTITY FULL;
ALTER TABLE chat_mensajes REPLICA IDENTITY FULL;

-- 7. DAR PERMISOS A USUARIOS ANÓNIMOS
GRANT ALL ON TABLE reportes TO anon;
GRANT ALL ON TABLE validaciones TO anon;
GRANT ALL ON TABLE chat_mensajes TO anon;
GRANT ALL ON TABLE reportes TO authenticated;
GRANT ALL ON TABLE validaciones TO authenticated;
GRANT ALL ON TABLE chat_mensajes TO authenticated;
```

**⚠️ PASO CRÍTICO: ACTIVA REALTIME EN EL PANEL DE SUPABASE**
Si no haces esto, los reportes no se actualizarán automáticamente:
1. En tu proyecto de Supabase, ve al icono del cilindro (**Database**).
2. En el menú lateral busca **Replication**.
3. Busca la tabla llamada `supabase_realtime`. Haz clic en el botón de **"Edit"** (o en el número de tablas).
4. **ACTIVA** los interruptores para: `reportes`, `validaciones` y `chat_mensajes`.
5. Haz clic en **Save changes**.

¡Listo! Ahora los reportes aparecerán al instante en todos los dispositivos.
