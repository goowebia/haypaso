
# 🛠️ REPARACIÓN DE SUPABASE (PASO A PASO)

El error que viste sucede porque el Editor de SQL no entiende texto normal, solo código. Sigue estos pasos exactos:

1. Ve a tu panel de **Supabase**.
2. Entra en **SQL Editor** (icono de `>_` en la barra lateral izquierda).
3. Haz clic en **"New Query"**.
4. **BORRA TODO** lo que haya en el editor.
5. Pega **SOLAMENTE** el código que está aquí abajo:

```sql
ALTER TABLE reportes DROP CONSTRAINT IF EXISTS reportes_tipo_check;

ALTER TABLE reportes ADD COLUMN IF NOT EXISTS es_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE reportes ADD COLUMN IF NOT EXISTS fuente TEXT;

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
    'Clima'
));

ALTER TABLE reportes REPLICA IDENTITY FULL;
```

6. Presiona el botón verde **RUN** (abajo a la derecha).
7. Si dice **"Success"**, ¡ya puedes volver a la app y enviar reportes!
