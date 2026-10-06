const ESTADOS = Object.freeze({
  PRESENTE: 'PRESENTE',
  AUSENTE: 'AUSENTE',
  JUSTIFICANTE_PENDIENTE: 'JUSTIFICANTE_PENDIENTE'
});

function obtenerSesiones() {
  const hoja = obtenerHoja_(HOJAS.SESIONES);

  if (hoja.getLastRow() < 2) {
    return [];
  }

  const datos = hoja
    .getRange(2, 1, hoja.getLastRow() - 1, 5)
    .getValues();

  const zona = Session.getScriptTimeZone();

  // google.script.run no puede devolver objetos Date: se envían como texto.
  return datos
    .filter(fila => fila[0])
    .map(fila => ({
      id: String(fila[0]),
      numero: fila[1],
      fecha: fila[2] instanceof Date
        ? Utilities.formatDate(fila[2], zona, 'yyyy-MM-dd')
        : String(fila[2]),
      tema: String(fila[3]),
      estado: String(fila[4])
    }));
}

function obtenerParticipantes(idSesion) {
  if (!idSesion) {
    throw new Error('Debes seleccionar una sesión.');
  }

  const participantes = leerFilas_(obtenerHoja_(HOJAS.PARTICIPANTES), 4);
  const asistencias = leerFilas_(obtenerHoja_(HOJAS.ASISTENCIAS), 4);

  const estadoPorParticipante = new Map();

  asistencias.forEach(fila => {
    if (fila[0] === idSesion) {
      estadoPorParticipante.set(fila[1], fila[2]);
    }
  });

  return participantes
    .filter(fila => fila[0] && esActivo_(fila[3]))
    .map(fila => ({
      id: String(fila[0]),
      nombre: String(fila[1]),
      correo: String(fila[2]),
      estado: normalizarEstado_(estadoPorParticipante.get(fila[0]))
    }));
}

function guardarAsistencia(idSesion, participantes) {
  if (!idSesion) {
    throw new Error('Debes seleccionar una sesión.');
  }

  if (!Array.isArray(participantes) || participantes.length === 0) {
    throw new Error('No se recibieron participantes.');
  }

  if (!obtenerSesiones().some(s => s.id === idSesion)) {
    throw new Error(`La sesión ${idSesion} no existe.`);
  }

  // Evita que dos personas guardando al mismo tiempo se sobrescriban.
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const hoja = obtenerHoja_(HOJAS.ASISTENCIAS);
    const existentes = leerFilas_(hoja, 4);

    // Llave compuesta id_sesion|id_participante -> posición en "existentes".
    const indice = new Map();
    existentes.forEach((fila, i) => {
      indice.set(`${fila[0]}|${fila[1]}`, i);
    });

    const ahora = new Date();

    participantes.forEach(p => {
      if (!p || !p.id) return;

      const clave = `${idSesion}|${p.id}`;
      const registro = [
        idSesion,
        p.id,
        normalizarEstado_(p.estado),
        ahora
      ];

      if (indice.has(clave)) {
        existentes[indice.get(clave)] = registro;
      } else {
        indice.set(clave, existentes.length);
        existentes.push(registro);
      }
    });

    if (existentes.length > 0) {
      hoja.getRange(2, 1, existentes.length, 4).setValues(existentes);
      hoja.getRange(2, 4, existentes.length, 1)
        .setNumberFormat('yyyy-mm-dd hh:mm:ss');
    }

    marcarSesionRegistrada_(idSesion);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  const contar = estado =>
    participantes.filter(p => p && normalizarEstado_(p.estado) === estado).length;

  return {
    ok: true,
    idSesion,
    presentes: contar(ESTADOS.PRESENTE),
    ausentes: contar(ESTADOS.AUSENTE),
    justificantes: contar(ESTADOS.JUSTIFICANTE_PENDIENTE),
    total: participantes.length
  };
}

function marcarSesionRegistrada_(idSesion) {
  const hoja = obtenerHoja_(HOJAS.SESIONES);
  const datos = leerFilas_(hoja, 5);
  const posicion = datos.findIndex(fila => fila[0] === idSesion);

  if (posicion >= 0) {
    hoja.getRange(posicion + 2, 5).setValue('REGISTRADA');
  }
}

function leerFilas_(hoja, columnas) {
  if (hoja.getLastRow() < 2) return [];
  return hoja.getRange(2, 1, hoja.getLastRow() - 1, columnas).getValues();
}

// Cualquier valor desconocido o vacío se guarda como AUSENTE.
function normalizarEstado_(estado) {
  const valor = String(estado || '').toUpperCase();
  return Object.values(ESTADOS).includes(valor) ? valor : ESTADOS.AUSENTE;
}

function esActivo_(valor) {
  return valor === true || String(valor).toUpperCase() === 'TRUE';
}
