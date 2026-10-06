# Control de asistencia

Web App móvil para registrar la asistencia de **30 participantes** en **10 sesiones**.

- **Almacenamiento:** Google Sheets (`BD_Control_Asistencia`)
- **Backend:** Google Apps Script (V8)
- **Interfaz:** `index.html` (HTML, CSS y JavaScript, mobile-first)
- **Sincronización:** [clasp](https://github.com/google/clasp)

## Estructura

| Archivo | Responsabilidad |
|---|---|
| `Config.gs` | `SPREADSHEET_ID`, nombres de hojas (`HOJAS`) y acceso al libro |
| `Setup.gs` | `prepararBaseDatos()`: crea las hojas y carga P01–P30 y S01–S10 sin duplicar |
| `Code.gs` | `doGet()`: punto de entrada de la Web App |
| `Asistencia.gs` | `obtenerSesiones()`, `obtenerParticipantes(idSesion)`, `guardarAsistencia(idSesion, participantes)` |
| `index.html` | Interfaz: selector de sesión, contador, marcar todos, tarjetas Presente / Ausente / Justificante pendiente y guardado |
| `appsscript.json` | Manifiesto (zona horaria `America/Mexico_City`, runtime V8) |
| `.clasp.json` | Enlace con el proyecto remoto (no se versiona) |

## Modelo de datos

**Participantes** — `id_participante | nombre | correo | activo` (clave: `id_participante`).
`activo = FALSE` oculta a la persona sin borrar su historial.

**Sesiones** — `id_sesion | numero | fecha | tema | estado` (clave: `id_sesion`).
Las fechas se asignan semanalmente desde el día de inicialización. `estado` pasa de `PENDIENTE` a `REGISTRADA` al guardar.

**Asistencias** — `id_sesion | id_participante | estado | hora_registro`.
Llave compuesta `id_sesion + id_participante`: si ya existe se actualiza; nunca se inserta un duplicado.
`estado` admite tres valores:

| Valor | Significado |
|---|---|
| `PRESENTE` | Asistió a la sesión |
| `AUSENTE` | Faltó (valor por defecto) |
| `JUSTIFICANTE_PENDIENTE` | Faltó y avisó que entregará justificante; cámbialo a `PRESENTE` o `AUSENTE` al revisarlo |

## Puesta en operación

1. Crea la hoja de cálculo `BD_Control_Asistencia` y copia su ID (la parte de la URL entre `/d/` y `/edit`) en `SPREADSHEET_ID` de `Config.gs`.
2. `clasp push`
3. `clasp open-script`
4. Ejecuta manualmente `prepararBaseDatos()` y concede permisos.
5. Comprueba las tres hojas en Google Sheets.
6. **Implementar → Implementaciones de prueba** (URL `/dev`).
7. Selecciona una sesión, registra asistencia y verifica la hoja Asistencias.
8. Guarda de nuevo y confirma que no se duplican registros (máximo 300 filas = 30 × 10).
9. Cuando todo funcione: **Implementar → Nueva implementación → Aplicación web** (URL `/exec`).

## Permisos

La aplicación solo usa `SpreadsheetApp` (lectura/escritura del libro configurado) y `LockService`
(evita que dos guardados simultáneos se sobrescriban). Al publicar, elige con cuidado
**"Quién tiene acceso"**: cualquiera con la URL podrá modificar la asistencia.
