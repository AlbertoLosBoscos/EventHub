const API_BASE = 'http://localhost:3000/api';

function authHeaders() {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

function formatearAsientos(asientos) {
    if (!asientos) return 'Ninguno';
    return asientos.split(',').map(s => s.trim()).filter(s => s).map(s => {
        if (s.startsWith('PALCO-')) return 'Palco ' + s.replace('PALCO-', '');
        return s;
    }).join(', ');
}

document.addEventListener('DOMContentLoaded', () => {
    const userRole = localStorage.getItem('userRole');
    const isStaff = userRole === 'admin' || userRole === 'employee';

    const userEmailEl = document.getElementById('userEmail');
    if (userEmailEl) {
        userEmailEl.textContent = localStorage.getItem('userEmail') || '';
    }

    const adminLink = document.getElementById('adminLink');
    if (adminLink && !isStaff) {
        adminLink.style.display = 'none';
    }

    if (isStaff) {
        document.getElementById('clientView').classList.add('hidden');
        document.getElementById('staffView').classList.remove('hidden');
        cargarTodosTickets();
    } else {
        document.getElementById('staffView').classList.add('hidden');
        document.getElementById('clientView').classList.remove('hidden');
        cargarMisTickets();
    }

    document.getElementById('btnFiltrarTickets').addEventListener('click', (e) => {
        e.preventDefault();
        cargarTodosTickets();
    });

    const logoutBtn = document.querySelector('.btn-primary');
    if (logoutBtn && logoutBtn.textContent.includes('Cerrar')) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('usuarioId');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('token');
            window.location.href = '/guest';
        });
    }
});

async function cargarMisTickets() {
    const usuarioID = localStorage.getItem('usuarioId');
    if (!usuarioID) {
        window.location.href = '/login';
        return;
    }

    try {
        const r = await fetch(`${API_BASE}/tickets/por-usuario?usuarioID=${usuarioID}`, { headers: authHeaders() });
        const tickets = await r.json();
        const container = document.getElementById('ticketsList');
        container.innerHTML = '';

        const confirmados = tickets ? tickets.filter(t => t.confirmado) : [];

        if (confirmados.length === 0) {
            container.innerHTML = '<p class="ticket-empty">No tienes tickets confirmados.</p>';
            return;
        }

        confirmados.forEach(ticket => {
            const card = document.createElement('div');
            card.className = 'ticket-card';

            const fechaEvento = new Date(ticket.fecha);
            const ahora = new Date();
            fechaEvento.setHours(0, 0, 0, 0);
            ahora.setHours(0, 0, 0, 0);
            const puedeDevolver = fechaEvento > ahora;

            card.innerHTML = `
                <div class="ticket-info">
                    <h3>Ticket: ${ticket.id}</h3>
                    <p><strong>Evento:</strong> ${ticket.eventoNombre || ticket.eventoID || '-'}</p>
                    <p><strong>Email:</strong> ${ticket.usuarioEmail || '-'}</p>
                    <p><strong>Planta:</strong> ${ticket.planta ?? '-'}</p>
                    <p><strong>Asientos:</strong> ${formatearAsientos(ticket.asientos)}</p>
                    <p><strong>Fecha:</strong> ${ticket.fecha ? new Date(ticket.fecha).toLocaleDateString() : '-'}</p>
                    <p><strong>Estado:</strong> ✅ Confirmado</p>
                </div>
                <div class="ticket-actions">
                    <button class="btn-ticket-detalle" data-ticket='${encodeURIComponent(JSON.stringify(ticket))}'>Ver Detalles</button>
                    ${puedeDevolver ? `<button class="btn-ticket-devolver" data-id="${ticket.id}">Devolver</button>` : ''}
                </div>
            `;
            container.appendChild(card);
        });

        container.querySelectorAll('.btn-ticket-detalle').forEach(btn => {
            btn.addEventListener('click', () => {
                const ticket = JSON.parse(decodeURIComponent(btn.dataset.ticket));
                mostrarDetalleTicket(ticket);
            });
        });

        container.querySelectorAll('.btn-ticket-devolver').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('¿Devolver esta entrada?')) return;
                const ticketID = btn.dataset.id;
                try {
                    const r = await fetch(`${API_BASE}/tickets/devolver-cliente`, {
                        method: 'POST',
                        headers: authHeaders(),
                        body: JSON.stringify({ ticketID }),
                    });
                    const data = await r.json();
                    if (r.ok) {
                        alert('Entrada devuelta con éxito');
                        cargarMisTickets();
                    } else {
                        alert('Error: ' + (data.error || 'desconocido'));
                    }
                } catch {
                    alert('Error de conexión');
                }
            });
        });
    } catch {
        document.getElementById('ticketsList').innerHTML = '<p class="ticket-empty">Error al cargar tickets.</p>';
    }
}

async function cargarTodosTickets() {
    const container = document.getElementById('todosTicketsList');
    container.innerHTML = '<p class="ticket-empty">Cargando...</p>';

    const ticketID = document.getElementById('filtroTicketID').value.trim();
    const email = document.getElementById('filtroEmail').value.trim();

    let url = `${API_BASE}/tickets/buscar?`;
    if (ticketID) url += `ticketID=${encodeURIComponent(ticketID)}&`;
    if (email) url += `email=${encodeURIComponent(email)}&`;

    try {
        const r = await fetch(url, { headers: authHeaders() });
        const tickets = await r.json();
        container.innerHTML = '';

        if (!tickets || tickets.length === 0) {
            container.innerHTML = '<p class="ticket-empty">No se encontraron tickets.</p>';
            return;
        }

        tickets.forEach(ticket => {
            const card = document.createElement('div');
            card.className = 'ticket-card';

            const fechaEvento = new Date(ticket.fecha);
            const ahora = new Date();
            fechaEvento.setHours(0, 0, 0, 0);
            ahora.setHours(0, 0, 0, 0);
            const puedeDevolver = fechaEvento > ahora;

            card.innerHTML = `
                <div class="ticket-info">
                    <h3>Ticket: ${ticket.id}</h3>
                    <p><strong>Evento:</strong> ${ticket.eventoNombre || ticket.eventoID || '-'}</p>
                    <p><strong>Email:</strong> ${ticket.usuarioEmail || ticket.usuarioID || '-'}</p>
                    <p><strong>Planta:</strong> ${ticket.planta ?? '-'}</p>
                    <p><strong>Asientos:</strong> ${formatearAsientos(ticket.asientos)}</p>
                    <p><strong>Fecha:</strong> ${ticket.fecha ? new Date(ticket.fecha).toLocaleDateString() : '-'}</p>
                    <p><strong>Estado:</strong> ${ticket.confirmado ? '✅ Confirmado' : '⏳ Pendiente'}</p>
                </div>
                <div class="ticket-actions">
                    <button class="btn-ticket-detalle" data-ticket='${encodeURIComponent(JSON.stringify(ticket))}'>Ver Detalles</button>
                    ${puedeDevolver ? `<button class="btn-ticket-devolver" data-id="${ticket.id}">Devolver</button>` : ''}
                </div>
            `;
            container.appendChild(card);
        });

        container.querySelectorAll('.btn-ticket-detalle').forEach(btn => {
            btn.addEventListener('click', () => {
                const ticket = JSON.parse(decodeURIComponent(btn.dataset.ticket));
                mostrarDetalleTicket(ticket);
            });
        });

        container.querySelectorAll('.btn-ticket-devolver').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('¿Devolver esta entrada?')) return;
                const ticketID = btn.dataset.id;
                try {
                    const r = await fetch(`${API_BASE}/tickets/devolver-cliente`, {
                        method: 'POST',
                        headers: authHeaders(),
                        body: JSON.stringify({ ticketID }),
                    });
                    const data = await r.json();
                    if (r.ok) {
                        alert('Entrada devuelta con éxito');
                        cargarTodosTickets();
                    } else {
                        alert('Error: ' + (data.error || 'desconocido'));
                    }
                } catch {
                    alert('Error de conexión');
                }
            });
        });
    } catch {
        container.innerHTML = '<p class="ticket-empty">Error al cargar tickets.</p>';
    }
}

function mostrarDetalleTicket(ticket) {
    const modal = document.createElement('div');
    modal.className = 'ticket-detalle-modal';
    modal.innerHTML = `
        <div class="ticket-detalle-content">
            <h3>Detalle del Ticket</h3>
            <p><strong>ID:</strong> ${ticket.id}</p>
            <p><strong>Evento:</strong> ${ticket.eventoNombre || '-'}</p>
            <p><strong>Evento ID:</strong> ${ticket.eventoID || '-'}</p>
            <p><strong>Email:</strong> ${ticket.usuarioEmail || '-'}</p>
            <p><strong>Usuario ID:</strong> ${ticket.usuarioID || '-'}</p>
            <p><strong>Planta:</strong> ${ticket.planta ?? '-'}</p>
            <p><strong>Asientos:</strong> ${ticket.asientos || 'Ninguno'}</p>
            <p><strong>Fecha evento:</strong> ${ticket.fecha ? new Date(ticket.fecha).toLocaleString() : '-'}</p>
            <p><strong>Duración:</strong> ${ticket.duracion || '-'} min</p>
            <p><strong>Estado:</strong> ${ticket.confirmado ? 'Confirmado' : 'Pendiente'}</p>
            <p><strong>Creado:</strong> ${ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '-'}</p>
            <button id="cerrarDetalle">Cerrar</button>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#cerrarDetalle').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}