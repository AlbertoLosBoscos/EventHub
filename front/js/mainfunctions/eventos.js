async function fetchEventosPorRango(fechaInicio, fechaFin) {
    try {
        const response = await fetch(`${API_BASE}/eventos/por-fecha?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
        if (!response.ok) throw new Error('Error al obtener eventos');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

function renderizarEventos(eventos) {
    const container = document.getElementById('eventsContainer');
    const countEl = document.getElementById('eventsCount');

    if (!eventos || eventos.length === 0) {
        container.innerHTML = '<p class="no-events">No hay eventos disponibles en este rango de fechas.</p>';
        countEl.textContent = '0 eventos disponibles';
        return;
    }

    countEl.textContent = `${eventos.length} eventos disponibles`;

    const badgeMap = { disponible: '✅ Disponible', realizandose: '🔴 En emisión', terminado: '🏁 Terminado', cancelado: '❌ Cancelado' };
    const blocked = ['realizandose', 'terminado', 'cancelado'];

    container.innerHTML = eventos.map(evento => `
        <div class="event-card ${blocked.includes(evento.estado) ? 'event-card-disabled' : ''}" data-event-id="${evento.id}" data-estado="${evento.estado || 'disponible'}" onclick="${blocked.includes(evento.estado) ? '' : `seleccionarEvento('${evento.id}', '${evento.nombre}', ${evento.duracion}, '${evento.fecha}', '${evento.sitioID || ''}')`}">
            <div class="event-image">
                ${evento.imagen ? `<img src="${evento.imagen}" alt="${evento.nombre}">` : '<div class="event-image-placeholder"></div>'}
            </div>
            <div class="event-info">
                <span class="event-tag">${evento.categoria || 'Evento'}</span>
                <h3 class="event-name">${evento.nombre}</h3>
                <p class="event-location">📍 ${evento.sitio?.nombre && evento.sitio?.direccion ? `<a href="https://www.google.com/maps?q=${evento.sitio.direccion}" target="_blank" class="map-link">${evento.sitio.nombre}</a>` : (evento.sitio?.nombre || 'Por determinar')}</p>
                <div class="event-footer">
                    <span class="event-price">€${evento.precio || '45.00'}</span>
                    <span class="event-badge estado-${evento.estado || 'disponible'}">${badgeMap[evento.estado] || '✅ Disponible'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

async function cargarEventosPorRango(fechaInicio, fechaFin) {
    const eventos = await fetchEventosPorRango(fechaInicio, fechaFin);
    renderizarEventos(eventos);
}

window.seleccionarEvento = async function(eventoId, nombre, duracion, fecha, sitioID) {
    const usuarioID = localStorage.getItem('usuarioId') || 'demo-user-123';

    currentEvent = { eventoId, nombre, duracion, fecha };
    currentSitioID = sitioID;

    selectedSeats = [];
    occupiedSeats = [];
    misComprasSeats = [];

    document.querySelectorAll('.event-card').forEach(card => {
        card.classList.remove('event-card-selected');
    });

    const selectedCard = document.querySelector(`.event-card[data-event-id="${eventoId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('event-card-selected');
        selectedCard.innerHTML += '<div class="event-badge-selected">SELECCIONADO</div>';
    }

    const ticketExistente = await obtenerTicketUsuarioEvento(usuarioID, eventoId);

    if (ticketExistente && ticketExistente.id) {
        currentTicket = ticketExistente;
        selectedPalco = null;
        selectedPalcoNumero = null;
        selectedPalcoPrecio = 0;
        selectedSeats = [];
        if (ticketExistente.asientos) {
            const parts = ticketExistente.asientos.split(',').map(s => s.trim()).filter(s => s);
            parts.forEach(p => {
                if (p.startsWith('PALCO-')) {
                    selectedPalcoNumero = p.replace('PALCO-', '');
                } else {
                    selectedSeats.push(p);
                }
            });
        }
    } else {
        const result = await crearTicket(usuarioID, '', eventoId, fecha, duracion);
        if (result.data && result.data.id) {
            currentTicket = result.data;
            selectedSeats = [];
        } else if (result.error) {
            console.error('Error al crear ticket: ' + result.error);
        } else if (result.message) {
            const ticketActualizado = await obtenerTicketUsuarioEvento(usuarioID, eventoId);
            if (ticketActualizado && ticketActualizado.id) {
                currentTicket = ticketActualizado;
            }
        }
    }

    document.getElementById('step3').classList.remove('hidden');
    document.getElementById('stepIndicator3').classList.remove('step-inactive');
    updateStepIndicator(3);

    if (currentSitioID) {
        await cargarPisos(currentSitioID);
    } else {
        document.getElementById('pisoSelector').innerHTML = '<p>Este evento no tiene un sitio asignado.</p>';
        document.getElementById('seatGrid').innerHTML = '';
        document.getElementById('seatsSubtitle').textContent = 'Sin ubicación';
    }

    suscribirEventoRealtime(eventoId);
    updateSummary();
};
