const API_BASE = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    const usuarioId = localStorage.getItem('usuarioId');
    const userRole = localStorage.getItem('userRole');

    if (!usuarioId) {
        window.location.href = '/login';
        return;
    }

    if (userRole !== 'admin' && userRole !== 'employee') {
        fetch(`${API_BASE}/auth/verificar-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId })
        })
        .then(r => r.json())
        .then(data => {
            if (!data.admin) {
                window.location.href = '/';
            }
        })
        .catch(() => { window.location.href = '/'; });
    }

    document.getElementById('adminEmail').textContent = usuarioId;

    document.getElementById('btnVolver').addEventListener('click', () => {
        window.location.href = '/main';
    });

    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('section-' + btn.dataset.section).classList.add('active');
            if (btn.dataset.section === 'usuarios') cargarUsuarios();
        });
    });

    if (userRole === 'employee') {
        document.querySelectorAll('.admin-nav-btn[data-section="crear"], .admin-nav-btn[data-section="crear-sitio"], .admin-nav-btn[data-section="eliminar"], .admin-nav-btn[data-section="usuarios"]').forEach(btn => {
            btn.style.display = 'none';
        });
        document.querySelector('.admin-nav-btn[data-section="gestionar"]')?.classList.add('active');
        document.getElementById('section-gestionar')?.classList.add('active');
        document.getElementById('section-crear')?.classList.remove('active');
        document.getElementById('section-eliminar')?.classList.remove('active');
        document.getElementById('section-usuarios')?.classList.remove('active');
    }

    cargarEventosSelect('selectEliminar', true, true);
    cargarEventosSelect('selectGestionar', true, true);
    cargarSitiosSelect('inputSitioID');
    cargarSitiosSelect('editSitioID');

    document.getElementById('formCrearEvento').addEventListener('submit', crearEvento);
    document.getElementById('btnEliminar').addEventListener('click', eliminarEvento);
    document.getElementById('selectGestionar').addEventListener('change', cargarEventoEnFormulario);
    document.getElementById('formEditarEvento').addEventListener('submit', guardarEdicion);
    document.getElementById('formCrearSitio').addEventListener('submit', crearSitio);

    cargarUsuarios();
});

function mostrarMensaje(id, texto, tipo) {
    const el = document.getElementById(id);
    el.textContent = texto;
    el.className = 'admin-mensaje ' + tipo;
}

async function cargarEventosSelect(selectId, mostrarSitio, futurosOnly) {
    try {
        const [rEventos, rSitios] = await Promise.all([
            fetch(`${API_BASE}/eventos/mostrar`),
            mostrarSitio ? fetch(`${API_BASE}/sitios/mostrar`) : Promise.resolve(null)
        ]);
        let eventos = await rEventos.json();
        let sitiosMap = {};
        if (rSitios) {
            const sitios = await rSitios.json();
            (sitios || []).forEach(s => { sitiosMap[s.id] = s.nombre; });
        }
        if (futurosOnly) {
            const ahora = new Date();
            eventos = (eventos || []).filter(ev => new Date(ev.fecha) > ahora);
        }
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">-- Selecciona un evento --</option>';
        (eventos || []).forEach(ev => {
            const opt = document.createElement('option');
            opt.value = ev.id;
            const sitioTexto = sitiosMap[ev.sitioID] ? ' - ' + sitiosMap[ev.sitioID] : '';
            opt.textContent = `${ev.nombre} (${new Date(ev.fecha).toLocaleDateString()})${sitioTexto}`;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error('Error al cargar eventos:', e);
    }
}

async function cargarSitiosSelect(selectId) {
    try {
        const r = await fetch(`${API_BASE}/sitios/mostrar`);
        const sitios = await r.json();
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">-- Selecciona un sitio --</option>';
        sitios.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.nombre;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error('Error al cargar sitios:', e);
    }
}

async function crearEvento(e) {
    e.preventDefault();
    const fechaRaw = document.getElementById('inputFecha').value;
    const body = {
        nombre: document.getElementById('inputNombre').value,
        descripcion: document.getElementById('inputDescripcion').value,
        sitioID: document.getElementById('inputSitioID').value,
        fecha: new Date(fechaRaw).toISOString(),
        compania: document.getElementById('inputCompania').value,
        duracion: parseInt(document.getElementById('inputDuracion').value),
    };
    try {
        const r = await fetch(`${API_BASE}/eventos/crear`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await r.json();
        if (r.ok) {
            mostrarMensaje('mensajeCrear', 'Evento creado con éxito', 'success');
            document.getElementById('formCrearEvento').reset();
            cargarEventosSelect('selectEliminar', true, true);
            cargarEventosSelect('selectGestionar', true, true);
        } else {
            mostrarMensaje('mensajeCrear', 'Error: ' + (data.error || 'desconocido'), 'error');
        }
    } catch (err) {
        mostrarMensaje('mensajeCrear', 'Error de conexión', 'error');
    }
}

async function eliminarEvento() {
    const select = document.getElementById('selectEliminar');
    const eventoId = select.value;
    if (!eventoId) {
        mostrarMensaje('mensajeEliminar', 'Selecciona un evento', 'error');
        return;
    }
    if (!confirm('¿Seguro que quieres eliminar este evento?')) return;
    try {
        const r = await fetch(`${API_BASE}/eventos/eliminar/${eventoId}`, { method: 'DELETE' });
        const data = await r.json();
        if (r.ok) {
            mostrarMensaje('mensajeEliminar', 'Evento eliminado con éxito', 'success');
            cargarEventosSelect('selectEliminar', true, true);
            cargarEventosSelect('selectGestionar', true, true);
        } else {
            mostrarMensaje('mensajeEliminar', 'Error: ' + (data.error || 'desconocido'), 'error');
        }
    } catch (err) {
        mostrarMensaje('mensajeEliminar', 'Error de conexión', 'error');
    }
}

async function cargarEventoEnFormulario() {
    const eventoId = document.getElementById('selectGestionar').value;
    if (!eventoId) return;
    try {
        const r = await fetch(`${API_BASE}/eventos/detalles/${eventoId}`);
        const ev = await r.json();
        document.getElementById('editNombre').value = ev.nombre || '';
        document.getElementById('editDescripcion').value = ev.descripcion || '';
        document.getElementById('editSitioID').value = ev.sitioID || '';
        if (ev.fecha) {
            const d = new Date(ev.fecha);
            const pad = n => String(n).padStart(2, '0');
            document.getElementById('editFecha').value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        }
        document.getElementById('editCompania').value = ev.compania || '';
        document.getElementById('editDuracion').value = ev.duracion || '';
    } catch (e) {
        console.error('Error al cargar evento:', e);
    }
}

async function guardarEdicion(e) {
    e.preventDefault();
    const eventoId = document.getElementById('selectGestionar').value;
    if (!eventoId) {
        mostrarMensaje('mensajeGestionar', 'Selecciona un evento', 'error');
        return;
    }
    const fechaRaw = document.getElementById('editFecha').value;
    const body = {
        nombre: document.getElementById('editNombre').value,
        descripcion: document.getElementById('editDescripcion').value,
        sitioID: document.getElementById('editSitioID').value,
        fecha: new Date(fechaRaw).toISOString(),
        compania: document.getElementById('editCompania').value,
        duracion: parseInt(document.getElementById('editDuracion').value),
    };
    try {
        const r = await fetch(`${API_BASE}/eventos/actualizar/${eventoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await r.json();
        if (r.ok) {
            mostrarMensaje('mensajeGestionar', 'Evento actualizado con éxito', 'success');
            cargarEventosSelect('selectEliminar', true, true);
            cargarEventosSelect('selectGestionar', true, true);
        } else {
            mostrarMensaje('mensajeGestionar', 'Error: ' + (data.error || 'desconocido'), 'error');
        }
    } catch (err) {
        mostrarMensaje('mensajeGestionar', 'Error de conexión', 'error');
    }
}

async function crearSitio(e) {
    e.preventDefault();
    const body = {
        nombre: document.getElementById('inputSitioNombre').value,
        aforo: parseInt(document.getElementById('inputSitioAforo').value),
        anfiteatrosID: document.getElementById('inputSitioAnfiteatro').value || null,
    };
    try {
        const r = await fetch(`${API_BASE}/sitios/crear`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await r.json();
        if (r.ok) {
            mostrarMensaje('mensajeCrearSitio', 'Sitio creado con éxito', 'success');
            document.getElementById('formCrearSitio').reset();
            cargarSitiosSelect('inputSitioID');
            cargarSitiosSelect('editSitioID');
        } else {
            mostrarMensaje('mensajeCrearSitio', 'Error: ' + (data.error || 'desconocido'), 'error');
        }
    } catch (err) {
        mostrarMensaje('mensajeCrearSitio', 'Error de conexión', 'error');
    }
}

async function cargarUsuarios() {
    try {
        const r = await fetch(`${API_BASE}/auth/usuarios`);
        const usuarios = await r.json();
        const container = document.getElementById('usuariosList');
        container.innerHTML = '';

        usuarios.forEach(u => {
            const card = document.createElement('div');
            card.className = 'user-card';
            card.innerHTML = `
                <div class="user-card-info">
                    <p><strong>ID:</strong> ${u.id}</p>
                    <p><strong>Email:</strong> ${u.email || '-'}</p>
                    <p><strong>Registrado:</strong> ${u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</p>
                    <p><strong>Rol:</strong> <span id="rol-${u.id}">${u.rol}</span></p>
                    <p><strong>Baneado:</strong> <span id="ban-${u.id}">${u.baneado ? 'Sí' : 'No'}</span></p>
                </div>
                <div class="user-card-actions">
                    <div>
                        <select id="rolSelect-${u.id}" data-id="${u.id}">
                            <option value="client" ${u.rol === 'client' ? 'selected' : ''}>Client</option>
                            <option value="employee" ${u.rol === 'employee' ? 'selected' : ''}>Employee</option>
                            <option value="admin" ${u.rol === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </div>
                    <button class="${u.baneado ? 'btn-unban' : 'btn-ban'}" data-id="${u.id}">
                        ${u.baneado ? 'Desbanear' : 'Banear'}
                    </button>
                </div>
            `;
            container.appendChild(card);
        });

        container.querySelectorAll('[id^="rolSelect-"]').forEach(sel => {
            sel.addEventListener('change', async () => {
                const id = sel.dataset.id;
                const rol = sel.value;
                try {
                    await fetch(`${API_BASE}/auth/usuarios/${id}/rol`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rol }),
                    });
                    document.getElementById(`rol-${id}`).textContent = rol;
                } catch {}
            });
        });

        container.querySelectorAll('.btn-ban, .btn-unban').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                try {
                    const r = await fetch(`${API_BASE}/auth/usuarios/${id}/ban`, {
                        method: 'PUT',
                    });
                    if (r.ok) {
                        cargarUsuarios();
                    }
                } catch {}
            });
        });
    } catch (e) {
        document.getElementById('usuariosList').innerHTML = '<p>Error al cargar usuarios</p>';
    }
}
