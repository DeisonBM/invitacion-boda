/**
 * BACKEND RSVP · Boda María & Roberto
 * Pega este código en Extensiones > Apps Script de tu Google Sheet.
 * Hoja requerida: "Invitados" (se crea sola si no existe).
 */

const SHEET_NAME = 'Invitados';
const ADMIN_KEY  = 'maria123'; // <-- debe coincidir EXACTO con js/config.js
const HEADERS = ['ID','Nombre','CuposAsignados','CuposConfirmados','Asistencia','Mensaje','FechaConfirmacion','FechaCreacion'];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function rowToObj_(headers, row) {
  const obj = {};
  headers.forEach((h, i) => obj[h] = row[i]);
  return obj;
}

/* ---------------- GET ---------------- */
function doGet(e) {
  try {
    const action = e.parameter.action;
    const sheet = getSheet_();

    if (action === 'info') {
      const id = e.parameter.id;
      if (!id) return jsonOut_({ ok: false, error: 'Falta id' });
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(id)) {
          const g = rowToObj_(headers, data[i]);
          return jsonOut_({
            ok: true,
            id: g.ID,
            nombre: g.Nombre,
            cuposAsignados: g.CuposAsignados,
            cuposConfirmados: g.CuposConfirmados,
            asistencia: g.Asistencia,
            mensaje: g.Mensaje,
            yaConfirmo: g.Asistencia === 'Si' || g.Asistencia === 'No'
          });
        }
      }
      return jsonOut_({ ok: false, error: 'Invitado no encontrado' });
    }

    if (action === 'listar') {
      if (e.parameter.key !== ADMIN_KEY) return jsonOut_({ ok: false, error: 'Clave inválida' });
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1).map(r => rowToObj_(headers, r));
      return jsonOut_({ ok: true, invitados: rows });
    }

    return jsonOut_({ ok: false, error: 'Acción no reconocida (GET): ' + action });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

/* ---------------- POST ---------------- */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const sheet = getSheet_();

    if (action === 'crear') {
      if (body.key !== ADMIN_KEY) return jsonOut_({ ok: false, error: 'Clave inválida' });
      const nombre = (body.nombre || '').trim();
      const cupos = Number(body.cupos) || 1;
      if (!nombre) return jsonOut_({ ok: false, error: 'Falta nombre' });

      const id = Utilities.getUuid().split('-')[0] + Math.floor(Math.random() * 90 + 10);
      sheet.appendRow([id, nombre, cupos, '', '', '', '', new Date()]);
      return jsonOut_({ ok: true, id: id });
    }

    if (action === 'crearMasivo') {
      if (body.key !== ADMIN_KEY) return jsonOut_({ ok: false, error: 'Clave inválida' });
      const invitados = body.invitados;
      if (!Array.isArray(invitados) || invitados.length === 0) {
        return jsonOut_({ ok: false, error: 'La lista de invitados está vacía' });
      }

      const fecha = new Date();
      const creados = [];
      const filas = [];

      invitados.forEach(inv => {
        const nombre = (inv.nombre || '').trim();
        const cupos = Number(inv.cupos) || 1;
        if (!nombre) return;

        const id = Utilities.getUuid().split('-')[0] + Math.floor(Math.random() * 90 + 10);
        filas.push([id, nombre, cupos, '', '', '', '', fecha]);
        creados.push({ id: id, nombre: nombre, cupos: cupos });
      });

      if (filas.length === 0) return jsonOut_({ ok: false, error: 'No se encontró ningún nombre válido' });

      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, filas.length, HEADERS.length).setValues(filas);

      return jsonOut_({ ok: true, creados: creados });
    }

    if (action === 'eliminar') {
      if (body.key !== ADMIN_KEY) return jsonOut_({ ok: false, error: 'Clave inválida' });
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(body.id)) { rowIndex = i + 1; break; }
      }
      if (rowIndex === -1) return jsonOut_({ ok: false, error: 'No encontrado' });
      sheet.deleteRow(rowIndex);
      return jsonOut_({ ok: true });
    }

    if (action === 'confirmar') {
      const id = body.id;
      const asistencia = body.asistencia === 'Si' ? 'Si' : 'No';
      let cuposUsados = Number(body.cuposUsados) || 0;
      const mensaje = body.mensaje || '';

      // Una sola lectura de toda la hoja para ubicar al invitado (más rápido que buscar y luego releer)
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(id)) { rowIndex = i + 1; break; }
      }
      if (rowIndex === -1) return jsonOut_({ ok: false, error: 'Invitado no encontrado' });

      const filaActual = data[rowIndex - 1];
      const asistenciaActual = filaActual[4];
      if (asistenciaActual === 'Si' || asistenciaActual === 'No') {
        return jsonOut_({ ok: false, error: 'Ya habías confirmado tu asistencia anteriormente.' });
      }

      const cuposAsignados = Number(filaActual[2]) || 1;
      if (asistencia === 'Si') {
        cuposUsados = Math.max(1, Math.min(cuposUsados, cuposAsignados));
      } else {
        cuposUsados = 0;
      }

      // Una sola escritura de las 4 columnas juntas (más rápido que 4 setValue separados)
      sheet.getRange(rowIndex, 4, 1, 4).setValues([[cuposUsados, asistencia, mensaje, new Date()]]);

      return jsonOut_({ ok: true, cuposUsados: cuposUsados });
    }

    return jsonOut_({ ok: false, error: 'Acción no reconocida (POST): ' + action });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}
