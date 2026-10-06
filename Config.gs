const SPREADSHEET_ID = '1nfgeZYzlKcTQfPx7WcUNhumHuhQl5bb6Q7WtwwNyOsw';
const NOMBRE_CURSO = 'Control de asistencia';

const HOJAS = Object.freeze({
  PARTICIPANTES: 'Participantes',
  SESIONES: 'Sesiones',
  ASISTENCIAS: 'Asistencias'
});

function obtenerLibro_() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.includes('PEGA_AQUI')) {
    throw new Error('Configura SPREADSHEET_ID en Config.gs antes de ejecutar la aplicación.');
  }

  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function obtenerHoja_(nombre) {
  let hoja = obtenerLibro_().getSheetByName(nombre);

  // Primera ejecución: si falta la hoja, se prepara la base automáticamente.
  if (!hoja) {
    prepararBaseDatos();
    hoja = obtenerLibro_().getSheetByName(nombre);
  }

  if (!hoja) {
    throw new Error(`No existe la hoja "${nombre}". Ejecuta prepararBaseDatos().`);
  }

  return hoja;
}