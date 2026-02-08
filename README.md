
# 🚨 REPARACIÓN TOTAL DE BASE DE DATOS (SOLUCIÓN PGRST204)

Si ves el error de "estatus column not found", copia este código exacto, pégalo en el **SQL Editor** de Supabase y dale a **RUN**:

```sql
-- 1. AGREGAR COLUMNAS FALTANTES (ESTATUS, FOTOS, ETC)
ALTER TABLE reportes ADD COLUMN IF NOT EXISTS estatus TEXT DEFAULT 'activo';
ALTER TABLE reportes ADD COLUMN IF NOT EXISTS fotos TEXT[] DEFAULT '{}';
ALTER TABLE reportes ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE reportes ADD COLUMN IF NOT EXISTS es_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE reportes ADD COLUMN IF NOT EXISTS fuente TEXT;

-- 2. LIMPIAR RESTRICCIONES ANTIGUAS
ALTER TABLE reportes DROP CONSTRAINT IF EXISTS reportes_tipo_check;

-- 3. ACTUALIZAR CATEGORÍAS PERMITIDAS (INCLUYE BACHE Y OBJETO)
ALTER TABLE reportes ADD CONSTRAINT reportes_tipo_check CHECK (tipo IN (
    'Camino Libre',
    'Tráfico Lento', 
    'Tráfico Pesado', 
    'Alto Total', 
    'Accidente', 
    'Obras', 
    'Policía Visible', 
    'Policía Escondido', 
    'Policía Contrario',
    'Vehículo en Vía', 
    'Vehículo en Lateral', 
    'Clima',
    'Bache',
    'Objeto en el camino'
));

-- 4. ASEGURAR QUE LOS REPORTES VIEJOS TENGAN ESTATUS
UPDATE reportes SET estatus = 'activo' WHERE estatus IS NULL;

-- 5. RE-ACTIVAR TIEMPO REAL
ALTER TABLE reportes REPLICA IDENTITY FULL;
```

**¿Por qué fallaba?**
La aplicación ahora usa la columna `estatus` para saber qué reportes ocultar cuando ya se despejó la vía. Si esa columna no existe en tu base de datos, Supabase responde con el error que viste.
