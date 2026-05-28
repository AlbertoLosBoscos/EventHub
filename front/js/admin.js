const API_BASE = 'http://localhost:3000/api';

function authHeaders() {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

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

    document.querySelectorAll('.subpanel-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.subpanel-nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.subpanel-section').forEach(s => s.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('subsection-' + btn.dataset.subsection).classList.add('active');
            if (btn.dataset.subsection === 'crear-anfiteatro') {
                cargarPisosSelect('inputAnfiPiso', true);
            } else if (btn.dataset.subsection === 'crear-palco') {
                cargarPisosSelect('inputPalcoPiso');
            }
        });
    });

    if (userRole === 'employee') {
        document.querySelectorAll('.admin-nav-btn[data-section="crear"], .admin-nav-btn[data-section="eliminar"], .admin-nav-btn[data-section="usuarios"]').forEach(btn => {
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

    document.getElementById('formCrearPiso').addEventListener('submit', crearPiso);
    document.getElementById('formCrearAnfiteatro').addEventListener('submit', crearAnfiteatro);
    document.getElementById('formCrearPalco').addEventListener('submit', crearPalco);
    document.getElementById('btnGenerarGrid').addEventListener('click', generarGrid);

    cargarSitiosSelect('inputPisoSitio');
    cargarPisosSelect('inputAnfiPiso', true);
    cargarPisosSelect('inputPalcoPiso');
    document.getElementById('formCrearSitio').addEventListener('submit', crearSitio);

    cargarUsuarios();
});

function mostrarMensaje(id, texto, tipo) {
    const el = document.getElementById(id);
    el.textContent = texto;
    el.className = 'admin-mensaje ' + tipo;
}

async function cargarUsuarios() {
    try {
        const r = await fetch(`${API_BASE}/auth/usuarios`, { headers: authHeaders() });
        const usuarios = await r.json();
        const container = document.getElementById('usuariosList');
        container.innerHTML = '';

        const currentUserId = localStorage.getItem('usuarioId');

        usuarios.forEach(u => {
            const esAdmin = u.rol === 'admin';
            const esYo = u.id === currentUserId;

            const card = document.createElement('div');
            card.className = 'user-card';
            card.innerHTML = `
                <div class="user-card-info">
                    <p><strong>ID:</strong> ${u.id} ${esYo ? '(tú)' : ''}</p>
                    <p><strong>Email:</strong> ${u.email || '-'}</p>
                    <p><strong>Registrado:</strong> ${u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</p>
                    <p><strong>Rol:</strong> <span id="rol-${u.id}">${u.rol}</span></p>
                    <p><strong>Baneado:</strong> <span id="ban-${u.id}">${u.baneado ? 'Sí' : 'No'}</span></p>
                </div>
                <div class="user-card-actions">
                    <div>
                        <select id="rolSelect-${u.id}" data-id="${u.id}" ${(esYo || esAdmin) ? 'disabled' : ''}>
                            <option value="client" ${u.rol === 'client' ? 'selected' : ''}>Client</option>
                            <option value="employee" ${u.rol === 'employee' ? 'selected' : ''}>Employee</option>
                            <option value="admin" ${u.rol === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                        ${(esYo || esAdmin) ? '<small style="color:var(--error);font-size:11px;">no modificable</small>' : ''}
                    </div>
                    ${!esAdmin ? `<button class="${u.baneado ? 'btn-unban' : 'btn-ban'}" data-id="${u.id}">
                        ${u.baneado ? 'Desbanear' : 'Banear'}
                    </button>` : ''}
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
                        headers: authHeaders(),
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
                        headers: authHeaders(),
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
