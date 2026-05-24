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
        });
    });

    if (userRole === 'employee') {
        document.querySelectorAll('.admin-nav-btn[data-section="crear"], .admin-nav-btn[data-section="eliminar"]').forEach(btn => {
            btn.style.display = 'none';
        });
        document.querySelector('.admin-nav-btn[data-section="gestionar"]')?.classList.add('active');
        document.getElementById('section-gestionar')?.classList.add('active');
        document.getElementById('section-crear')?.classList.remove('active');
        document.getElementById('section-eliminar')?.classList.remove('active');
    }

    cargarEventosSelect('selectEliminar', true, true);
    cargarEventosSelect('selectGestionar', true, true);
    cargarSitiosSelect('inputSitioID');
    cargarSitiosSelect('editSitioID');

    document.getElementById('formCrearEvento').addEventListener('submit', crearEvento);
    document.getElementById('btnEliminar').addEventListener('click', eliminarEvento);
    document.getElementById('selectGestionar').addEventListener('change', cargarEventoEnFormulario);
    document.getElementById('formEditarEvento').addEventListener('submit', guardarEdicion);
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
            cargarEventosSelect('selectGestionar', true);
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
            cargarEventosSelect('selectGestionar', true);
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
            cargarEventosSelect('selectGestionar', true);
        } else {
            mostrarMensaje('mensajeGestionar', 'Error: ' + (data.error || 'desconocido'), 'error');
        }
    } catch (err) {
        mostrarMensaje('mensajeGestionar', 'Error de conexión', 'error');
    }
}
