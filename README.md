# PMCD Retroalimentacion Docente

App web para revisar entregas docentes del PMCD en modalidad intermedia, analizarlas con una rubrica institucional y generar retroalimentacion academica editable antes de copiarla manualmente a Moodle.

## Que incluye

- Carga de entregas en DOCX, PDF, PPTX, TXT/MD o texto directo.
- Selector de actividad: Planeacion didactica, ABP, MBE, APROC, Instrumentos de evaluacion y Profesionalismo medico.
- Rubricas institucionales iniciales en `server/data/rubrics.json`.
- Generacion de retroalimentacion con OpenAI API.
- Modo demo si no existe `OPENAI_API_KEY`.
- Campos de profesor, curso, grupo, actividad, criterios, retroalimentacion y estado.
- Estados: `pendiente`, `revisada`, `aprobada`.
- Edicion de la sugerencia final antes de copiar.
- Historial local en `server/data/history.json`.
- Sin conexion directa a Moodle y sin publicacion automatica.

## Requisitos

- Node.js 18 o superior.
- Una llave de OpenAI API para generar retroalimentacion real.

## Instalacion

```bash
cd /Users/lydiaalcazarmartinez/Documents/Apps/pmcd-retro-docente
npm run install:all
cp .env.example .env
```

Edita `.env`:

```env
OPENAI_API_KEY=sk-proyecto_o_llave_aqui
OPENAI_MODEL=gpt-4.1-mini
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
```

Para desarrollo:

```bash
npm run dev
```

Abre:

```text
http://localhost:5173
```

Para produccion local:

```bash
npm run build
npm start
```

Abre:

```text
http://localhost:4000
```

## Flujo de uso

1. Captura el nombre del profesor, curso y grupo.
2. Selecciona el tipo de actividad.
3. Revisa los criterios de evaluacion que aparecen en pantalla.
4. Carga el archivo exportado de Moodle o pega el texto de la entrega.
5. Presiona `Generar retroalimentacion`.
6. Revisa fortalezas, cumplimiento, ajustes y sugerencia final.
7. Edita la retroalimentacion final si hace falta.
8. Presiona `Copiar retroalimentacion final`.
9. Pega manualmente el texto en Moodle.
10. Cambia el estado a `revisada` o `aprobada` cuando corresponda.

## Ejemplo de rubrica JSON

```json
{
  "id": "planeacion-didactica",
  "name": "Planeacion didactica",
  "criteria": [
    "Alineacion entre competencias, resultados de aprendizaje, contenidos y evaluacion.",
    "Secuencia didactica clara con inicio, desarrollo, cierre y tiempos estimados.",
    "Estrategias activas pertinentes para educacion medica."
  ]
}
```

Puedes editar o ampliar las rubricas en:

```text
server/data/rubrics.json
```

## Seguridad y privacidad

- La app no guarda contrasenas de Moodle.
- La app no publica retroalimentacion automaticamente.
- Los archivos cargados se eliminan despues de extraer el texto.
- El historial local guarda metadatos y retroalimentacion, no conserva el archivo original.
- Evita subir datos sensibles innecesarios en las entregas.

## API principal

- `GET /api/rubrics`: devuelve rubricas.
- `GET /api/history`: devuelve historial local.
- `POST /api/feedback`: genera retroalimentacion desde archivo o texto.
- `PATCH /api/history/:id/status`: actualiza estado.
- `PATCH /api/history/:id/final-text`: guarda la version editada de la retroalimentacion final.

## Prompt base usado

> Actua como especialista en educacion medica, evaluacion docente y diseno curricular. Analiza la entrega del profesor con base en la rubrica seleccionada. Genera una retroalimentacion clara, respetuosa, academica y util. No inventes informacion. Si falta evidencia, indicalo. La respuesta debe ser breve, personalizada y lista para pegar en Moodle.
