let ADMIN_KEY = '';

const loginBox = document.querySelector('#login-box');
const loginKeyInput = document.querySelector('#login-key');
const loginStatus = document.querySelector('#login-status');
const panel = document.querySelector('#panel');

const formCrear = document.querySelector('#form-crear');
const crearStatus = document.querySelector('#crear-status');
const nuevoLinkBox = document.querySelector('#nuevo-link-box');
const nuevoLinkInput = document.querySelector('#nuevo-link');

const tabla = document.querySelector('#tabla-invitados');
const resumenCupos = document.querySelector('#resumen-cupos');

function linkParaId(id) {
  // Ajusta esta ruta si index.html vive en otra ubicación de tu hosting
  const base = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
  return `${base}?id=${id}`;
}

document.querySelector('#btn-login')?.addEventListener('click', async () => {
  const key = loginKeyInput.value.trim();
  if (!key) return;
  loginStatus.textContent = 'Verificando…';
  try {
    const res = await fetch(`${CONFIG.SCRIPT_URL}?action=listar&key=${encodeURIComponent(key)}`);
    const data = await res.json();
    if (data.ok) {
      ADMIN_KEY = key;
      loginBox.hidden = true;
      panel.hidden = false;
      renderInvitados(data.invitados);
    } else {
      loginStatus.textContent = data.error || 'Clave incorrecta.';
    }
  } catch (err) {
    loginStatus.textContent = 'Error de conexión.';
  }
});

async function cargarInvitados() {
  const res = await fetch(`${CONFIG.SCRIPT_URL}?action=listar&key=${encodeURIComponent(ADMIN_KEY)}`);
  const data = await res.json();
  if (data.ok) renderInvitados(data.invitados);
}

function renderInvitados(lista) {
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
      <td>${escapeHtml(g.Nombre)}</td>
      <td>${g.CuposAsignados}</td>
      <td><span class="badge ${badgeClass}">${estadoTxt}</span></td>
      <td>${g.CuposConfirmados || '-'}</td>
      <td>${escapeHtml(g.Mensaje || '')}</td>
      <td class="link-copy">
        <input type="text" readonly value="${link}">
        <button data-link="${link}" class="btn-copy">Copiar</button>
      </td>
      <td><button class="btn-del" data-id="${g.ID}">Eliminar</button></td>
    `;
    tabla.appendChild(tr);
  });

  resumenCupos.textContent = `Invitados: ${lista.length} · Cupos totales asignados: ${totalAsignados} · Confirmaron sí: ${totalSi} (${totalConfirmados} cupos) · Confirmaron no: ${totalNo}`;

  tabla.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.link);
      btn.textContent = '¡Copiado!';
      setTimeout(() => btn.textContent = 'Copiar', 1200);
    });
  });

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

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

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
      nuevoLinkInput.value = linkParaId(result.id);
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

document.querySelector('#btn-copiar-nuevo')?.addEventListener('click', () => {
  navigator.clipboard.writeText(nuevoLinkInput.value);
});
