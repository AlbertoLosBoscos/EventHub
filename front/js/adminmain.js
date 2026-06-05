const API_BASE = 'http://localhost:3000/api';

function authHeaders() {
    const token = localStorage.getItem('token');
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
}

async function fetchEventosPorRango(inicio, fin) {
    try {
        const r = await fetch(`${API_BASE}/eventos/por-fecha?fechaInicio=${inicio}&fechaFin=${fin}`);
        if (!r.ok) throw new Error();
        return await r.json();
    } catch { return []; }
}

function renderizarEventos(eventos) {
    const container = document.getElementById('eventsContainer');
    const countEl = document.getElementById('eventsCount');
    if (!eventos || eventos.length === 0) {
        container.innerHTML = '<p class="no-events">No hay eventos en este rango.</p>';
        countEl.textContent = '0 eventos disponibles';
        return;
    }
    countEl.textContent = `${eventos.length} eventos disponibles`;
    const badgeMap = { disponible: '✅ Disponible', realizandose: '🔴 En emisión', terminado: '✅ Terminado', cancelado: '❌ Cancelado' };

    container.innerHTML = eventos.map(e => `
        <div class="event-card" data-event-id="${e.id}" onclick="seleccionarEvento('${e.id}')">
            <div class="event-image">
                ${e.imagen ? `<img src="${e.imagen}" alt="${e.nombre}">` : '<div class="event-image-placeholder"></div>'}
            </div>
            <div class="event-info">
                <h3 class="event-name">${e.nombre}</h3>
                <p class="event-location">📅 ${new Date(e.fecha).toLocaleDateString('es-ES')}</p>
                <div class="event-footer">
                    <span class="event-price">${e.compania || 'Sin compañía'}</span>
                    <span class="event-badge estado-${e.estado || 'disponible'}">${badgeMap[e.estado] || '✅ Disponible'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

window.seleccionarEvento = async function(eventoId) {
    document.querySelectorAll('.event-card').forEach(c => c.classList.remove('event-card-selected'));
    const card = document.querySelector(`.event-card[data-event-id="${eventoId}"]`);
    if (card) card.classList.add('event-card-selected');

    try {
        const r = await fetch(`${API_BASE}/eventos/detalles/${eventoId}`);
        const evento = await r.json();
        if (!evento) return;

        document.getElementById('detailID').textContent = evento.id;
        document.getElementById('detailNombre').textContent = evento.nombre;
        document.getElementById('detailDescripcion').textContent = evento.descripcion || 'Sin descripción';
        const sitioNombre = evento.sitio?.nombre || evento.sitioID || '-';
        document.getElementById('detailSitio').textContent = sitioNombre;
        const mapLink = document.getElementById('detailSitioMapLink');
        if (evento.sitio?.direccion) {
            mapLink.innerHTML = ` <a href="https://www.google.com/maps?q=${evento.sitio.direccion}" target="_blank" class="map-link">📍 Ver en Google Maps</a>`;
        } else {
            mapLink.innerHTML = '';
        }
        document.getElementById('detailFecha').textContent = evento.fecha ? new Date(evento.fecha).toLocaleString('es-ES') : '-';
        document.getElementById('detailCompania').textContent = evento.compania || '-';
        document.getElementById('detailEstado').textContent = evento.estado || 'disponible';
        document.getElementById('detailEstado').className = `estado-${evento.estado || 'disponible'}`;
        document.getElementById('detailDuracion').textContent = evento.duracion ? `${evento.duracion} min` : '-';

        const btnCancelar = document.getElementById('btnCancelarEvento');
        if (btnCancelar) {
            if (evento.estado === 'cancelado' || evento.estado === 'terminado') {
                btnCancelar.style.display = 'none';
            } else {
                btnCancelar.style.display = 'inline-block';
                btnCancelar.dataset.eventoId = evento.id;
            }
        }

        const imgContainer = document.getElementById('detailImage');
        if (evento.imagen) {
            imgContainer.innerHTML = `<img src="${evento.imagen}" alt="${evento.nombre}" class="detail-img">`;
        } else {
            imgContainer.innerHTML = '<div class="detail-img-placeholder">Sin imagen</div>';
        }

        document.getElementById('eventDetail').classList.remove('hidden');
        window.scrollTo({ top: document.getElementById('eventDetail').offsetTop - 20, behavior: 'smooth' });
    } catch { alert('Error al cargar detalles del evento'); }
};

document.addEventListener('DOMContentLoaded', () => {
    const userEmailEl = document.getElementById('userEmail');
    if (userEmailEl) {
        userEmailEl.textContent = localStorage.getItem('userEmail') || '';
    }

    const dateInicio = document.getElementById('dateInputInicio');
    const dateFin = document.getElementById('dateInputFin');
    const today = new Date().toISOString().split('T')[0];
    const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    dateInicio.min = today;
    dateInicio.value = today;
    dateFin.min = today;
    dateFin.value = weekLater;

    (async () => {
        const eventos = await fetchEventosPorRango(today, weekLater);
        renderizarEventos(eventos);
    })();

    function actualizarRango() {
        const inicio = dateInicio.value;
        const fin = dateFin.value;
        if (!inicio || !fin) return;
        if (fin < inicio) { dateFin.value = inicio; return; }
        document.getElementById('eventDetail').classList.add('hidden');
        (async () => {
            const eventos = await fetchEventosPorRango(inicio, fin);
            renderizarEventos(eventos);
        })();
    }

    dateInicio.addEventListener('change', actualizarRango);
    dateFin.addEventListener('change', actualizarRango);

    document.getElementById('btnCerrarDetalle').addEventListener('click', () => {
        document.getElementById('eventDetail').classList.add('hidden');
        document.querySelectorAll('.event-card').forEach(c => c.classList.remove('event-card-selected'));
    });

    document.getElementById('btnCancelarEvento').addEventListener('click', async function() {
        const eventoId = this.dataset.eventoId;
        if (!eventoId) return;
        if (!confirm('¿Seguro que quieres cancelar este evento?')) return;
        try {
            const r = await fetch(`${API_BASE}/eventos/actualizar/${eventoId}`, {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify({ estado: 'cancelado' }),
            });
            const data = await r.json();
            if (r.ok) {
                alert('Evento cancelado con éxito');
                location.reload();
            } else {
                alert('Error: ' + (data.error || 'desconocido'));
            }
        } catch {
            alert('Error de conexión');
        }
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
