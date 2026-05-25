const ROWS = 15;
const COLS = 15;
const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
const PRICE_PER_SEAT = 45;
const SERVICE_FEE_PERCENTAGE = 0.05;

let selectedSeats = [];
let currentEvent = null;
let currentTicket = null;
let currentDate = null;
let occupiedSeats = [];
let stripe = null;
let stripePublicKey = null;
let cardElements = null;

const API_BASE = 'http://localhost:3000/api';

async function crearTicket(usuarioID, asientos, eventoID, fecha, duracion) {
    try {
        const response = await fetch(`${API_BASE}/tickets/crear`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioID, asientos, eventoID, fecha, duracion })
        });
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return { error: error.message };
    }
}

async function actualizarTicket(ticketID, asientos, confirmado) {
    try {
        const response = await fetch(`${API_BASE}/tickets/actualizar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketID, asientos, confirmado })
        });
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return { error: error.message };
    }
}

async function obtenerTicketUsuarioEvento(usuarioID, eventoID) {
    try {
        const response = await fetch(`${API_BASE}/tickets/por-usuario-y-evento?usuarioID=${usuarioID}&eventoID=${eventoID}`);
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function fetchStripeKey() {
    try {
        const response = await fetch(`${API_BASE}/pago/config`);
        const data = await response.json();
        stripePublicKey = data.publicKey;
        stripe = Stripe(stripePublicKey);

        const elements = stripe.elements();
        const style = {
            base: {
                fontSize: '14px',
                fontFamily: "'Inter', sans-serif",
                color: '#1c1b1c',
                '::placeholder': { color: '#7a7579' },
            },
        };
        const cardNumber = elements.create('cardNumber', { style, showIcon: true });
        cardNumber.mount('#card-number');
        cardNumber.on('change', ({ error }) => {
            const displayError = document.getElementById('card-errors');
            if (error) {
                displayError.textContent = error.message;
                displayError.style.display = 'block';
            } else {
                displayError.textContent = '';
                displayError.style.display = 'none';
            }
        });
        const cardExpiry = elements.create('cardExpiry', { style });
        cardExpiry.mount('#card-expiry');
        const cardCvc = elements.create('cardCvc', { style });
        cardCvc.mount('#card-cvc');
        cardElements = cardNumber;
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

    console.log('Asientos actualizados:', selectedSeats);
    console.log('Ticket actual:', currentTicket);
    
    if (currentTicket && currentTicket.id) {
        console.log('Actualizando ticket:', currentTicket.id, 'asientos:', selectedSeats.join(', '));
        actualizarTicket(currentTicket.id, selectedSeats.join(', '), false);
    } else {
        console.warn('No hay ticket para actualizar');
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

window.seleccionarEvento = async function(eventoId, nombre, duracion, fecha) {
    const usuarioID = localStorage.getItem('usuarioId') || 'demo-user-123';
    
    currentEvent = { eventoId, nombre, duracion, fecha };
    
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
        if (ticketExistente.asientos) {
            selectedSeats = ticketExistente.asientos.split(',').map(s => s.trim()).filter(s => s);
        } else {
            selectedSeats = [];
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
    
    await cargarAsientosOcupados(eventoId);
    
    updateSummary();
};

async function cargarAsientosOcupados(eventoId) {
    const asientosPreviamenteSeleccionados = [...selectedSeats];
    occupiedSeats = await fetchAsientosOcupados(eventoId);
    generateSeatGrid();
    
    asientosPreviamenteSeleccionados.forEach(seatId => {
        if (!occupiedSeats.includes(seatId)) {
            selectedSeats.push(seatId);
            const seat = document.querySelector(`.seat[data-seat-id="${seatId}"]`);
            if (seat) {
                seat.classList.add('seat-selected');
                seat.textContent = '✓';
            }
        }
    });
    
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
    const userRole = localStorage.getItem('userRole');
    const isStaff = userRole === 'admin' || userRole === 'employee';
    const adminLink = document.getElementById('adminLink');
    const navMisTickets = document.getElementById('navMisTickets');
    const navTodosTickets = document.getElementById('navTodosTickets');

    const userEmailEl = document.getElementById('userEmail');
    if (userEmailEl) {
        userEmailEl.textContent = localStorage.getItem('userEmail') || '';
    }

    if (adminLink && !isStaff) {
        adminLink.style.display = 'none';
    }
    if (navTodosTickets) {
        navTodosTickets.style.display = isStaff ? 'inline' : 'none';
    }
    if (navMisTickets) {
        navMisTickets.style.display = isStaff ? 'none' : 'inline';
    }

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
        if (step3) step3.classList.add('hidden');
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

            const intentResult = await crearPaymentIntent(
                total,
                selectedSeats.join(', '),
                currentEvent.eventoId,
                localStorage.getItem('usuarioId')
            );

            if (intentResult.error) {
                alert('Error: ' + intentResult.error);
                btn.disabled = false;
                btn.textContent = 'Confirmar Compra';
                return;
            }

            const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(intentResult.clientSecret, {
                payment_method: {
                    card: cardElements,
                }
            });

            if (confirmError) {
                alert('Error en el pago: ' + confirmError.message);
                btn.disabled = false;
                btn.textContent = 'Confirmar Compra';
                return;
            }

            if (paymentIntent.status !== 'succeeded') {
                alert('El pago no se completó. Estado: ' + paymentIntent.status);
                btn.disabled = false;
                btn.textContent = 'Confirmar Compra';
                return;
            }

            if (currentTicket && currentTicket.id) {
                const ticketResult = await actualizarTicket(
                    currentTicket.id,
                    selectedSeats.join(', '),
                    true
                );

                console.log('ticketResult:', ticketResult);

                if (ticketResult.error) {
                    alert('Error al confirmar ticket: ' + ticketResult.error);
                } else {
                    alert('¡Compra confirmada! Gracias por tu compra en EventHub.');
                    location.reload();
                }
            } else {
                alert('Error: No hay ticket para confirmar');
            }

            btn.disabled = false;
            btn.textContent = 'Confirmar Compra';
        });
    });
    
    document.getElementById('navEntradas').addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.main > .steps-indicator, .main > .content-grid').forEach(el => el.classList.remove('hidden'));
        document.getElementById('navEntradas').classList.add('nav-link-active');
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

const logoutBtn = document.querySelector('.btn-primary');
if (logoutBtn && logoutBtn.textContent.includes('Cerrar')) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('usuarioId');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userEmail');
        window.location.href = '/guest';
    });
}