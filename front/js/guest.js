const API_BASE = 'http://localhost:3000/api';

async function fetchEventosPorFecha(fecha) {
    try {
        const response = await fetch(`${API_BASE}/eventos/por-fecha?fecha=${fecha}`);
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
        container.innerHTML = '<p class="no-events">No hay eventos disponibles para esta fecha.</p>';
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

async function cargarEventosPorFecha(fecha) {
    const eventos = await fetchEventosPorFecha(fecha);
    renderizarEventos(eventos);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('es-ES', options).replace(/^\w/, c => c.toUpperCase());
}

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('dateInput');
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today;
    
    document.getElementById('dateSelected').textContent = formatDate(today);
    cargarEventosPorFecha(today);

    dateInput.addEventListener('change', async (e) => {
        const fecha = e.target.value;
        document.getElementById('dateSelected').textContent = formatDate(fecha);
        await cargarEventosPorFecha(fecha);
    });
});