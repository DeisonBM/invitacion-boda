let ADMIN_KEY = '';
const STORAGE_KEY = 'boda_admin_key';

const loginBox = document.querySelector('#login-box');
const loginKeyInput = document.querySelector('#login-key');
const loginStatus = document.querySelector('#login-status');
const panel = document.querySelector('#panel');
const btnLogout = document.querySelector('#btn-logout');
const btnExportar = document.querySelector('#btn-exportar');

const formCrear = document.querySelector('#form-crear');
const crearStatus = document.querySelector('#crear-status');
const nuevoLinkBox = document.querySelector('#nuevo-link-box');
const nuevoLinkInput = document.querySelector('#nuevo-link');

const importTabs = document.querySelectorAll('.import-tab');
const importPanelExcel = document.querySelector('#import-panel-excel');
const importPanelTexto = document.querySelector('#import-panel-texto');
const importFile = document.querySelector('#import-file');
const importPreview = document.querySelector('#import-preview');
const importPreviewCount = document.querySelector('#import-preview-count');
const importPreviewLista = document.querySelector('#import-preview-lista');
const importTextarea = document.querySelector('#import-textarea');
const btnImportar = document.querySelector('#btn-importar');
const importStatus = document.querySelector('#import-status');
const importResultados = document.querySelector('#import-resultados');
const importLista = document.querySelector('#import-lista');

const tabla = document.querySelector('#tabla-invitados');
const resumenCupos = document.querySelector('#resumen-cupos');
const buscarInvitado = document.querySelector('#buscar-invitado');
const filterChips = document.querySelectorAll('.filter-chip');

const statTotal = document.querySelector('#stat-total');
const statCupos = document.querySelector('#stat-cupos');
const statSi = document.querySelector('#stat-si');
const statNo = document.querySelector('#stat-no');
const statPendiente = document.querySelector('#stat-pendiente');

let modoImportacion = 'excel';
let invitadosDesdeExcel = [];
let ultimaListaInvitados = [];
let filtroTexto = '';
let filtroEstado = 'todos';

function linkParaId(id) {
  const base = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
  return `${base}?id=${id}`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

/* ---------------- Compartir / Copiar ---------------- */
async function compartirLink(link, nombre) {
  const texto = `¡Hola${nombre ? ' ' + nombre : ''}! Aquí está tu invitación a la boda de María B & Roberto:`;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Invitación de boda', text: texto, url: link });
    } catch (err) {}
  } else {
    await navigator.clipboard.writeText(`${texto} ${link}`);
    alert('Tu navegador no permite compartir directamente. El link se copió al portapapeles.');
  }
}

function bindLinkButtons(scopeEl) {
  scopeEl.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.link);
      const original = btn.textContent;
      btn.textContent = '¡Copiado!';
      setTimeout(() => btn.textContent = original, 1200);
    });
  });
  scopeEl.querySelectorAll('.btn-share').forEach(btn => {
    btn.addEventListener('click', () => {
      compartirLink(btn.dataset.link, btn.dataset.nombre || '');
    });
  });
}

/* ---------------- Login / Sesión persistente ---------------- */
async function intentarLogin(key, mostrarError) {
  try {
    const res = await fetch(`${CONFIG.SCRIPT_URL}?action=listar&key=${encodeURIComponent(key)}`);
    const data = await res.json();
    if (data.ok) {
      ADMIN_KEY = key;
      localStorage.setItem(STORAGE_KEY, key);
      loginBox.hidden = true;
      panel.hidden = false;
      ultimaListaInvitados = data.invitados;
      aplicarFiltrosYRenderizar();
    } else {
      if (mostrarError) loginStatus.textContent = data.error || 'Clave incorrecta.';
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    return true;
  } catch (err) {
    if (mostrarError) loginStatus.textContent = 'Error de conexión.';
    return false;
  }
}

(async function autoLogin() {
  const savedKey = localStorage.getItem(STORAGE_KEY);
  if (savedKey) {
    loginStatus.textContent = 'Restaurando sesión…';
    const ok = await intentarLogin(savedKey, false);
    if (!ok) loginStatus.textContent = '';
  }
})();

document.querySelector('#btn-login')?.addEventListener('click', async () => {
  const key = loginKeyInput.value.trim();
  if (!key) return;
  loginStatus.textContent = 'Verificando…';
  await intentarLogin(key, true);
});

loginKeyInput?.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.querySelector('#btn-login')?.click();
});

btnLogout?.addEventListener('click', () => {
  if (!confirm('¿Cerrar sesión?')) return;
  localStorage.removeItem(STORAGE_KEY);
  ADMIN_KEY = '';
  panel.hidden = true;
  loginBox.hidden = false;
  loginKeyInput.value = '';
  loginStatus.textContent = '';
});

async function cargarInvitados() {
  const res = await fetch(`${CONFIG.SCRIPT_URL}?action=listar&key=${encodeURIComponent(ADMIN_KEY)}`);
  const data = await res.json();
  if (data.ok) {
    ultimaListaInvitados = data.invitados;
    aplicarFiltrosYRenderizar();
  }
}

/* ---------------- Estadísticas ---------------- */
function renderStats(lista) {
  let totalAsignados = 0, totalSi = 0, totalNo = 0, totalPendiente = 0;
  lista.forEach(g => {
    totalAsignados += Number(g.CuposAsignados) || 0;
    if (g.Asistencia === 'Si') totalSi++;
    else if (g.Asistencia === 'No') totalNo++;
    else totalPendiente++;
  });
  if (statTotal) statTotal.textContent = lista.length;
  if (statCupos) statCupos.textContent = totalAsignados;
  if (statSi) statSi.textContent = totalSi;
  if (statNo) statNo.textContent = totalNo;
  if (statPendiente) statPendiente.textContent = totalPendiente;
}

/* ---------------- Filtros y búsqueda ---------------- */
function aplicarFiltrosYRenderizar() {
  renderStats(ultimaListaInvitados);

  let filtrados = ultimaListaInvitados;

  if (filtroTexto.trim() !== '') {
    const q = filtroTexto.trim().toLowerCase();
    filtrados = filtrados.filter(g => String(g.Nombre || '').toLowerCase().includes(q));
  }

  if (filtroEstado === 'Si') {
    filtrados = filtrados.filter(g => g.Asistencia === 'Si');
  } else if (filtroEstado === 'No') {
    filtrados = filtrados.filter(g => g.Asistencia === 'No');
  } else if (filtroEstado === 'pendiente') {
    filtrados = filtrados.filter(g => g.Asistencia !== 'Si' && g.Asistencia !== 'No');
  }

  renderTabla(filtrados, ultimaListaInvitados.length);
}

buscarInvitado?.addEventListener('input', () => {
  filtroTexto = buscarInvitado.value;
  aplicarFiltrosYRenderizar();
});

filterChips.forEach(chip => {
  chip.addEventListener('click', () => {
    filtroEstado = chip.dataset.filter;
    filterChips.forEach(c => c.classList.toggle('active', c === chip));
    aplicarFiltrosYRenderizar();
  });
});

/* ---------------- Tabla de invitados ---------------- */
function renderTabla(lista, totalGeneral) {
  tabla.innerHTML = '';
  let totalAsignados = 0, totalConfirmados = 0, totalSi = 0, totalNo = 0;

  lista.forEach(g => {
    totalAsignados += Number(g.CuposAsignados) || 0;
    if (g.Asistencia === 'Si') { totalSi++; totalConfirmados += Number(g.CuposConfirmados) || 0; }
    if (g.Asistencia === 'No') totalNo++;

    const estadoTxt = g.Asistencia === 'Si' ? 'Confirmó' : g.Asistencia === 'No' ? 'No asiste' : 'Pendiente';
    const badgeClass = g.Asistencia === 'Si' ? 'badge-si' : g.Asistencia === 'No' ? 'badge-no' : 'badge-pendiente';
    const link = linkParaId(g.ID);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="Nombre">${escapeHtml(g.Nombre)}</td>
      <td data-label="Cupos asig.">${g.CuposAsignados}</td>
      <td data-label="Estado"><span class="badge ${badgeClass}">${estadoTxt}</span></td>
      <td data-label="Cupos conf.">${g.CuposConfirmados || '-'}</td>
      <td data-label="Mensaje">${escapeHtml(g.Mensaje || '')}</td>
      <td data-label="Link" class="link-copy">
        <input type="text" readonly value="${link}">
        <button data-link="${link}" class="btn-copy">Copiar</button>
        <button data-link="${link}" data-nombre="${escapeHtml(g.Nombre)}" class="btn-share">Compartir</button>
      </td>
      <td data-label=""><button class="btn-del" data-id="${g.ID}">Eliminar</button></td>
    `;
    tabla.appendChild(tr);
  });

  const totalTexto = lista.length === totalGeneral
    ? `Invitados: ${lista.length}`
    : `Mostrando ${lista.length} de ${totalGeneral} invitados`;

  resumenCupos.textContent = `${totalTexto} · Cupos en esta vista: ${totalAsignados} · Confirmaron sí: ${totalSi} (${totalConfirmados} cupos) · Confirmaron no: ${totalNo}`;

  bindLinkButtons(tabla);

  tabla.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este invitado?')) return;
      await fetch(CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'eliminar', id: btn.dataset.id, key: ADMIN_KEY })
      });
      cargarInvitados();
    });
  });
}

/* ---------------- Crear invitado individual ---------------- */
formCrear?.addEventListener('submit', async event => {
  event.preventDefault();
  const data = new FormData(formCrear);
  crearStatus.textContent = 'Creando…';
  nuevoLinkBox.hidden = true;
  try {
    const res = await fetch(CONFIG.SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'crear',
        nombre: data.get('nombre'),
        cupos: data.get('cupos'),
        key: ADMIN_KEY
      })
    });
    const result = await res.json();
    if (result.ok) {
      crearStatus.textContent = '¡Invitado creado!';
      const link = linkParaId(result.id);
      nuevoLinkInput.value = link;
      document.querySelector('#btn-compartir-nuevo').dataset.link = link;
      document.querySelector('#btn-compartir-nuevo').dataset.nombre = data.get('nombre');
      document.querySelector('#btn-copiar-nuevo').dataset.link = link;
      nuevoLinkBox.hidden = false;
      formCrear.reset();
      cargarInvitados();
    } else {
      crearStatus.textContent = result.error || 'Error al crear invitado.';
    }
  } catch (err) {
    crearStatus.textContent = 'Error de conexión.';
  }
});
bindLinkButtons(nuevoLinkBox);

/* ---------------- Tabs: Excel vs Texto ---------------- */
importTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    modoImportacion = tab.dataset.tab;
    importTabs.forEach(t => t.classList.toggle('active', t === tab));
    importPanelExcel.hidden = modoImportacion !== 'excel';
    importPanelTexto.hidden = modoImportacion !== 'texto';
    importStatus.textContent = '';
  });
});

/* ---------------- Leer archivo Excel/CSV ---------------- */
importFile?.addEventListener('change', event => {
  const file = event.target.files[0];
  importPreview.hidden = true;
  invitadosDesdeExcel = [];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const workbook = XLSX.read(e.target.result, { type: 'array' });
      const primeraHoja = workbook.SheetNames[0];
      const hoja = workbook.Sheets[primeraHoja];
      const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '' });

      invitadosDesdeExcel = filas
        .map(fila => {
          const nombre = String(fila[0] ?? '').trim();
          const cuposRaw = fila[1];
          const cupos = Number(cuposRaw);
          return { nombre, cupos: Number.isFinite(cupos) && cupos > 0 ? cupos : 1 };
        })
        .filter(item => item.nombre.length > 0)
        .filter(item => !/^(nombre|nombres|invitado|invitados)$/i.test(item.nombre));

      importPreviewCount.textContent = invitadosDesdeExcel.length;
      importPreviewLista.innerHTML = invitadosDesdeExcel
        .map(g => `<div class="import-item"><span>${escapeHtml(g.nombre)} — ${g.cupos} cupo${g.cupos > 1 ? 's' : ''}</span></div>`)
        .join('');
      importPreview.hidden = invitadosDesdeExcel.length === 0;

      importStatus.textContent = invitadosDesdeExcel.length === 0
        ? 'No se encontraron filas válidas en el archivo.'
        : '';
    } catch (err) {
      importStatus.textContent = 'No se pudo leer el archivo. Verifica que sea un Excel o CSV válido.';
    }
  };
  reader.readAsArrayBuffer(file);
});

/* ---------------- Parseo de texto pegado ---------------- */
function parsearListaImportacion(texto) {
  return texto
    .split('\n')
    .map(linea => linea.trim())
    .filter(linea => linea.length > 0)
    .map(linea => {
      const partes = linea.split(',');
      const nombre = (partes[0] || '').trim();
      const cupos = partes[1] ? Number(partes[1].trim()) : 1;
      return { nombre, cupos: Number.isFinite(cupos) && cupos > 0 ? cupos : 1 };
    })
    .filter(item => item.nombre.length > 0);
}

/* ---------------- Importar (Excel o texto) ---------------- */
btnImportar?.addEventListener('click', async () => {
  const invitados = modoImportacion === 'excel'
    ? invitadosDesdeExcel
    : parsearListaImportacion(importTextarea.value);

  if (invitados.length === 0) {
    importStatus.textContent = modoImportacion === 'excel'
      ? 'Primero sube un archivo con invitados válidos.'
      : 'No se detectó ningún nombre válido en la lista.';
    return;
  }

  importStatus.textContent = `Importando ${invitados.length} invitado(s)…`;
  importResultados.hidden = true;
  importLista.innerHTML = '';

  try {
    const res = await fetch(CONFIG.SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'crearMasivo', invitados, key: ADMIN_KEY })
    });
    const result = await res.json();
    if (result.ok) {
      importStatus.textContent = `¡${result.creados.length} invitado(s) creado(s) correctamente!`;
      result.creados.forEach(g => {
        const link = linkParaId(g.id);
        const row = document.createElement('div');
        row.className = 'import-item';
        row.innerHTML = `
          <span>${escapeHtml(g.nombre)} (${g.cupos} cupo${g.cupos > 1 ? 's' : ''})</span>
          <input type="text" readonly value="${link}">
          <button data-link="${link}" class="btn-copy">Copiar</button>
          <button data-link="${link}" data-nombre="${escapeHtml(g.nombre)}" class="btn-share">Compartir</button>
        `;
        importLista.appendChild(row);
      });
      bindLinkButtons(importLista);
      importResultados.hidden = false;

      importTextarea.value = '';
      importFile.value = '';
      invitadosDesdeExcel = [];
      importPreview.hidden = true;

      cargarInvitados();
    } else {
      importStatus.textContent = result.error || 'Error al importar la lista.';
    }
  } catch (err) {
    importStatus.textContent = 'Error de conexión.';
  }
});

/* ---------------- Exportar a Excel ---------------- */
btnExportar?.addEventListener('click', () => {
  if (ultimaListaInvitados.length === 0) {
    alert('Todavía no hay invitados para exportar.');
    return;
  }

  const filas = ultimaListaInvitados.map(g => ({
    'Nombre': g.Nombre,
    'Cupos asignados': g.CuposAsignados,
    'Estado': g.Asistencia === 'Si' ? 'Confirmó' : g.Asistencia === 'No' ? 'No asiste' : 'Pendiente',
    'Cupos confirmados': g.CuposConfirmados || '',
    'Mensaje': g.Mensaje || '',
    'Link de invitación': linkParaId(g.ID),
    'Fecha de creación': g.FechaCreacion || ''
  }));

  const hoja = XLSX.utils.json_to_sheet(filas);
  hoja['!cols'] = [
    { wch: 24 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 30 }, { wch: 55 }, { wch: 18 }
  ];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Invitados');

  const fechaArchivo = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(libro, `invitados-boda-${fechaArchivo}.xlsx`);
});
