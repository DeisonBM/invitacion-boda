/**
 * BACKEND RSVP · Boda María & Roberto
 * Pega este código en Extensiones > Apps Script de tu Google Sheet.
 * Hoja requerida: "Invitados" (se crea sola si no existe).
 */

const SHEET_NAME = 'Invitados';
const ADMIN_KEY  = 'CAMBIA-ESTA-CLAVE-123'; // <-- cámbiala aquí y en js/admin.js
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

function findRowIndexById_(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 1; // fila real (1-indexed, +header)
  }
  return -1;
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
            yaConfirmo: g.Asistencia !== '' && g.Asistencia !== undefined
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

    return jsonOut_({ ok: false, error: 'Acción no reconocida' });
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

    if (action === 'eliminar') {
      if (body.key !== ADMIN_KEY) return jsonOut_({ ok: false, error: 'Clave inválida' });
      const rowIndex = findRowIndexById_(sheet, body.id);
      if (rowIndex === -1) return jsonOut_({ ok: false, error: 'No encontrado' });
      sheet.deleteRow(rowIndex);
      return jsonOut_({ ok: true });
    }

    if (action === 'confirmar') {
      const id = body.id;
      const asistencia = body.asistencia === 'Si' ? 'Si' : 'No';
      let cuposUsados = Number(body.cuposUsados) || 0;
      const mensaje = body.mensaje || '';

      const rowIndex = findRowIndexById_(sheet, id);
      if (rowIndex === -1) return jsonOut_({ ok: false, error: 'Invitado no encontrado' });

      const cuposAsignados = Number(sheet.getRange(rowIndex, 3).getValue()) || 1;
      if (asistencia === 'Si') {
        cuposUsados = Math.max(1, Math.min(cuposUsados, cuposAsignados));
      } else {
        cuposUsados = 0;
      }

      sheet.getRange(rowIndex, 4).setValue(cuposUsados);      // CuposConfirmados
      sheet.getRange(rowIndex, 5).setValue(asistencia);       // Asistencia
      sheet.getRange(rowIndex, 6).setValue(mensaje);          // Mensaje
      sheet.getRange(rowIndex, 7).setValue(new Date());       // FechaConfirmacion

      return jsonOut_({ ok: true, cuposUsados: cuposUsados });
    }

    return jsonOut_({ ok: false, error: 'Acción no reconocida' });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}
