const API_BASE = 'http://localhost:3000/api';

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
    
    container.innerHTML = eventos.map(evento => `
        <div class="event-card">
            <div class="event-image">
                ${evento.imagen ? `<img src="${evento.imagen}" alt="${evento.nombre}">` : '<div class="event-image-placeholder"></div>'}
            </div>
            <div class="event-info">
                <span class="event-tag">${evento.categoria || 'Evento'}</span>
                <h3 class="event-name">${evento.nombre}</h3>
                <p class="event-location">📍 ${evento.sitio?.nombre || 'Por determinar'}</p>
                <p class="event-date">📅 ${new Date(evento.fecha).toLocaleString('es-ES')}</p>
                <div class="event-footer">
                    <span class="event-price">€${evento.precio || '45.00'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

async function cargarEventosPorRango(fechaInicio, fechaFin) {
    const eventos = await fetchEventosPorRango(fechaInicio, fechaFin);
    renderizarEventos(eventos);
}

document.addEventListener('DOMContentLoaded', () => {
    const dateInicio = document.getElementById('dateInputInicio');
    const dateFin = document.getElementById('dateInputFin');
    const today = new Date().toISOString().split('T')[0];
    const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    dateInicio.min = today;
    dateInicio.value = today;
    dateFin.min = today;
    dateFin.value = weekLater;
    
    cargarEventosPorRango(today, weekLater);

    function actualizarRango() {
        const inicio = dateInicio.value;
        const fin = dateFin.value;
        if (!inicio || !fin) return;
        if (fin < inicio) {
            dateFin.value = inicio;
            cargarEventosPorRango(inicio, inicio);
            return;
        }
        cargarEventosPorRango(inicio, fin);
    }

    dateInicio.addEventListener('change', actualizarRango);
    dateFin.addEventListener('change', actualizarRango);
});