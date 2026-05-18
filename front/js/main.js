const ROWS = 15;
const COLS = 15;
const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
const PRICE_PER_SEAT = 45;
const SERVICE_FEE_PERCENTAGE = 0.05;

let selectedSeats = [];
let currentEvent = null;
let currentDate = null;
let occupiedSeats = [];
let stripe = null;
let stripePublicKey = null;

const API_BASE = 'http://localhost:3000/api';

async function fetchStripeKey() {
    try {
        const response = await fetch(`${API_BASE}/pago/config`);
        const data = await response.json();
        stripePublicKey = data.publicKey;
        stripe = Stripe(stripePublicKey);
    } catch (error) {
        console.error('Error al cargar Stripe:', error);
    }
}

async function crearPaymentIntent(cantidad, asientos, eventoId, usuarioId) {
    try {
        const response = await fetch(`${API_BASE}/pago/crear-intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cantidad, asientos, eventoId, usuarioId })
        });
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return { error: error.message };
    }
}

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

async function fetchAsientosOcupados(eventoID) {
    try {
        const response = await fetch(`${API_BASE}/tickets/asientos-ocupados?eventoID=${eventoID}`);
        if (!response.ok) throw new Error('Error al obtener asientos ocupados');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

async function crearTicket(datos) {
    try {
        const response = await fetch(`${API_BASE}/tickets/crear`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        if (!response.ok) throw new Error('Error al crear ticket');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return { error: error.message };
    }
}

function generateSeatGrid() {
    const seatGrid = document.getElementById('seatGrid');
    seatGrid.innerHTML = '';

    const emptyCorner = document.createElement('div');
    seatGrid.appendChild(emptyCorner);

    for (let col = 0; col < COLS; col++) {
        const label = document.createElement('div');
        label.className = 'seat-label';
        label.textContent = COL_LABELS[col];
        seatGrid.appendChild(label);
    }

    for (let row = 1; row <= ROWS; row++) {
        const rowLabel = document.createElement('div');
        rowLabel.className = 'seat-label';
        rowLabel.textContent = row;
        seatGrid.appendChild(rowLabel);

        for (let col = 0; col < COLS; col++) {
            const seat = document.createElement('div');
            const seatId = `${row}${COL_LABELS[col]}`;
            
            seat.className = 'seat';
            seat.dataset.seatId = seatId;
            seat.dataset.row = row;
            seat.dataset.col = COL_LABELS[col];

            if (occupiedSeats.includes(seatId)) {
                seat.classList.add('seat-occupied');
            } else {
                seat.addEventListener('click', () => toggleSeat(seat, seatId));
            }

            seatGrid.appendChild(seat);
        }
    }
}

function toggleSeat(seatElement, seatId) {
    if (seatElement.classList.contains('seat-occupied')) {
        return;
    }

    if (selectedSeats.includes(seatId)) {
        selectedSeats = selectedSeats.filter(s => s !== seatId);
        seatElement.classList.remove('seat-selected');
        seatElement.textContent = '';
    } else {
        selectedSeats.push(seatId);
        seatElement.classList.add('seat-selected');
        seatElement.textContent = '✓';
    }

    updateSummary();
}

function updateSummary() {
    const seatCount = selectedSeats.length;
    const seatCountEl = document.getElementById('seatCount');
    const selectedSeatsList = document.getElementById('selectedSeatsList');
    const subtotalEl = document.getElementById('subtotal');
    const serviceFeeEl = document.getElementById('serviceFee');
    const totalEl = document.getElementById('total');

    seatCountEl.textContent = seatCount;

    selectedSeatsList.innerHTML = '';
    selectedSeats.forEach(seatId => {
        const row = seatId.slice(0, -1);
        const col = seatId.slice(-1);
        const tag = document.createElement('span');
        tag.className = 'seat-tag';
        tag.textContent = `FILA ${row}, ${col}${row}`;
        selectedSeatsList.appendChild(tag);
    });

    const subtotal = seatCount * PRICE_PER_SEAT;
    const serviceFee = subtotal * SERVICE_FEE_PERCENTAGE;
    const total = subtotal + serviceFee;

    subtotalEl.textContent = `€${subtotal.toFixed(2)}`;
    serviceFeeEl.textContent = `€${serviceFee.toFixed(2)}`;
    totalEl.textContent = `€${total.toFixed(2)}`;
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
        <div class="event-card" data-event-id="${evento.id}" onclick="seleccionarEvento('${evento.id}', '${evento.nombre}', ${evento.duracion}, '${evento.fecha}')">
            <div class="event-image">
                ${evento.imagen ? `<img src="${evento.imagen}" alt="${evento.nombre}">` : '<div class="event-image-placeholder"></div>'}
            </div>
            <div class="event-info">
                <span class="event-tag">${evento.categoria || 'Evento'}</span>
                <h3 class="event-name">${evento.nombre}</h3>
                <p class="event-location">📍 ${evento.sitio?.nombre || 'Por determinar'}</p>
                <div class="event-footer">
                    <span class="event-price">€${evento.precio || '45.00'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

window.seleccionarEvento = function(eventoId, nombre, duracion, fecha) {
    currentEvent = { eventoId, nombre, duracion, fecha };
    
    document.querySelectorAll('.event-card').forEach(card => {
        card.classList.remove('event-card-selected');
    });
    
    const selectedCard = document.querySelector(`.event-card[data-event-id="${eventoId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('event-card-selected');
        selectedCard.innerHTML += '<div class="event-badge-selected">SELECCIONADO</div>';
    }

    document.getElementById('step3').classList.remove('hidden');
    document.getElementById('stepIndicator3').classList.remove('step-inactive');
    updateStepIndicator(3);
    
    cargarAsientosOcupados(eventoId);
};

async function cargarAsientosOcupados(eventoId) {
    occupiedSeats = await fetchAsientosOcupados(eventoId);
    generateSeatGrid();
    selectedSeats = [];
    updateSummary();
}

function updateStepIndicator(step) {
    for (let i = 1; i <= 4; i++) {
        const stepEl = document.getElementById(`stepIndicator${i}`);
        const stepNum = stepEl?.querySelector('.step-number');
        
        if (i < step) {
            stepNum?.classList.add('step-number-active');
            stepEl?.classList.remove('step-inactive');
        } else if (i === step) {
            stepNum?.classList.add('step-number-active');
        } else {
            stepNum?.classList.remove('step-number-active');
            if (i > step) stepEl?.classList.add('step-inactive');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('dateInput');
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today;
    
    currentDate = today;
    document.getElementById('dateSelected').textContent = formatDate(today);
    cargarEventosPorFecha(today);

    dateInput.addEventListener('change', async (e) => {
        const fecha = e.target.value;
        
        currentDate = fecha;
        selectedSeats = [];
        currentEvent = null;
        
        const dateSelectedEl = document.getElementById('dateSelected');
        if (dateSelectedEl) {
            dateSelectedEl.textContent = formatDate(fecha);
        }
        
        await cargarEventosPorFecha(fecha);
        
        const step3 = document.getElementById('step3');
        const step4 = document.getElementById('step4');
        if (step3) step3.classList.add('hidden');
        if (step4) step4.classList.add('hidden');
    });

    const confirmBtns = document.querySelectorAll('#confirmPurchase');
    confirmBtns.forEach(confirmBtn => {
        confirmBtn.addEventListener('click', async (e) => {
            console.log('Botón clickeado');
            console.log('selectedSeats:', selectedSeats);
            console.log('currentEvent:', currentEvent);
            
            if (selectedSeats.length === 0) {
                alert('Por favor, selecciona al menos un asiento.');
                return;
            }

            if (!currentEvent) {
                alert('Por favor, selecciona un evento.');
                return;
            }

            const btn = e.target;
            const subtotal = selectedSeats.length * PRICE_PER_SEAT;
            const serviceFee = subtotal * SERVICE_FEE_PERCENTAGE;
            const total = subtotal + serviceFee;

            btn.disabled = true;
            btn.textContent = 'Procesando...';

            console.log('Creando payment intent...');
            const intentResult = await crearPaymentIntent(
                total,
                selectedSeats.join(', '),
                currentEvent.eventoId,
                localStorage.getItem('usuarioId')
            );

            console.log('intentResult:', intentResult);

            if (intentResult.error) {
                alert('Error: ' + intentResult.error);
                btn.disabled = false;
                btn.textContent = 'Confirmar Compra';
                return;
            }

            alert('Pago procesado correctamente');

            const ticketResult = await crearTicket({
                usuarioID: localStorage.getItem('usuarioId') || 'demo-user-123',
                asientos: selectedSeats.join(', '),
                nEvento: currentEvent.eventoId,
                fecha: currentEvent.fecha,
                duracion: currentEvent.duracion
            });

            console.log('ticketResult:', ticketResult);

            if (ticketResult.error) {
                alert('Error al crear ticket: ' + ticketResult.error);
            } else {
                alert('¡Compra confirmada! Gracias por tu compra en EventHub.');
                selectedSeats = [];
                updateSummary();
            }

            btn.disabled = false;
            btn.textContent = 'Confirmar Compra';
        });
    });
    
    fetchStripeKey();
});

async function cargarEventosPorFecha(fecha) {
    const eventos = await fetchEventosPorFecha(fecha);
    renderizarEventos(eventos);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('es-ES', options).replace(/^\w/, c => c.toUpperCase());
}

document.getElementById('step3').classList.add('hidden');
document.getElementById('step4').classList.add('hidden');

const logoutBtn = document.querySelector('.btn-primary');
if (logoutBtn && logoutBtn.textContent.includes('Cerrar')) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('usuarioId');
        window.location.href = '/guest';
    });
}