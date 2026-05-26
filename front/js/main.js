const SERVICE_FEE_PERCENTAGE = 0.05;

let selectedSeats = [];
let currentEvent = null;
let currentTicket = null;
let currentDate = null;
let occupiedSeats = [];
let misComprasSeats = [];
let stripe = null;
let stripePublicKey = null;
let cardElements = null;

let currentSitioID = null;
let currentAnfiteatro = null;
let pisos = [];
let selectedPisoID = null;
let COL_LABELS = [];
let selectedPalco = null;
let selectedPalcoPrecio = 0;

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

async function actualizarTicket(ticketID, asientos, confirmado, planta) {
    try {
        const body = { ticketID, asientos, confirmado };
        if (planta !== undefined) body.planta = planta;
        const response = await fetch(`${API_BASE}/tickets/actualizar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
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

async function fetchAsientosOcupados(eventoID, usuarioID, planta) {
    try {
        let url = `${API_BASE}/tickets/asientos-ocupados?eventoID=${eventoID}`;
        if (usuarioID) url += `&usuarioID=${usuarioID}`;
        if (planta !== undefined) url += `&planta=${planta}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al obtener asientos ocupados');
        const data = await response.json();
        return {
            ocupados: data.ocupados || data || [],
            tusCompras: data.tusCompras || [],
        };
    } catch (error) {
        console.error('Error:', error);
        return { ocupados: [], tusCompras: [] };
    }
}

async function cargarPisos(sitioID) {
    try {
        const r = await fetch(`${API_BASE}/pisos/mostrar?sitioID=${sitioID}`);
        pisos = await r.json();
        if (!pisos || pisos.length === 0) {
            document.getElementById('pisoSelector').innerHTML = '<p>No hay pisos configurados para este sitio.</p>';
            document.getElementById('seatGrid').innerHTML = '';
            document.getElementById('seatsSubtitle').textContent = 'Sin pisos disponibles';
            return;
        }
        renderPisoSelector();
        const targetPiso = pisos.find(p => p.planta === 1) || pisos[0];
        await seleccionarPiso(targetPiso.id);
    } catch (e) {
        console.error('Error al cargar pisos:', e);
    }
}

function renderPisoSelector() {
    const container = document.getElementById('pisoSelector');
    container.innerHTML = pisos.map(p => `
        <button class="piso-btn${selectedPisoID === p.id ? ' active' : ''}"
                onclick="seleccionarPiso('${p.id}')">
            Planta ${p.planta}
        </button>
    `).join('');
}

window.seleccionarPiso = async function(pisoID) {
    selectedPisoID = pisoID;
    renderPisoSelector();
    document.getElementById('seatsSubtitle').textContent = `Planta ${pisos.find(p => p.id === pisoID)?.planta || ''}`;
    await cargarAnfiteatro(pisoID);
};

async function cargarAnfiteatro(pisoID) {
    try {
        const r = await fetch(`${API_BASE}/anfiteatros/mostrar?pisoID=${pisoID}`);
        const anfiteatros = await r.json();
        if (!anfiteatros || anfiteatros.length === 0) {
            document.getElementById('seatGrid').innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--on-surface-variant);padding:2rem">Este piso no tiene un anfiteatro configurado.</p>';
            currentAnfiteatro = null;
        } else {
            currentAnfiteatro = anfiteatros[0];
            generateSeatGrid();
        }
        occupiedSeats = [];
        misComprasSeats = [];
        selectedPalco = null;

        const piso = pisos.find(p => p.id === pisoID);
        const planta = piso ? piso.planta : undefined;

        if (currentTicket && currentTicket.id && planta !== undefined) {
            await actualizarTicket(currentTicket.id, undefined, undefined, planta);
        }

        generateSeatGrid();
        await cargarAsientosOcupados(currentEvent.eventoId, planta);
        await cargarPalcos(pisoID);
    } catch (e) {
        console.error('Error al cargar anfiteatro:', e);
    }
}

async function cargarAsientosOcupados(eventoId, planta) {
    const usuarioID = localStorage.getItem('usuarioId');
    const result = await fetchAsientosOcupados(eventoId, usuarioID, planta);
    occupiedSeats = result.ocupados;
    misComprasSeats = result.tusCompras;
    const grid = document.getElementById('seatGrid');
    if (!grid) return;
    document.querySelectorAll('.seat').forEach(seat => {
        const seatId = seat.dataset.seatId;
        if (misComprasSeats.includes(seatId)) {
            seat.classList.add('seat-tus-compras');
        } else if (occupiedSeats.includes(seatId)) {
            seat.classList.add('seat-occupied');
        }
    });
    selectedSeats.forEach(seatId => {
        if (!occupiedSeats.includes(seatId) && !misComprasSeats.includes(seatId)) {
            const seat = document.querySelector(`.seat[data-seat-id="${seatId}"]`);
            if (seat) {
                seat.classList.add('seat-selected');
                seat.textContent = '✓';
            }
        }
    });
    updateSummary();
}

async function cargarPalcoPrecio(palcoID) {
    try {
        const r = await fetch(`${API_BASE}/palcos/mostrar`);
        const palcos = await r.json();
        const palco = (palcos || []).find(p => p.id === palcoID);
        selectedPalcoPrecio = palco ? palco.precio : 0;
    } catch {
        selectedPalcoPrecio = 0;
    }
}

async function cargarPalcos(pisoID) {
    try {
        const r = await fetch(`${API_BASE}/palcos/mostrar?pisoID=${pisoID}`);
        const palcos = await r.json();
        const container = document.getElementById('palcosList');
        if (!palcos || palcos.length === 0) {
            container.innerHTML = '<p class="palco-empty">No hay palcos en este piso.</p>';
            return;
        }
        const ocupados = await fetchPalcosOcupados(currentEvent.eventoId);
        if (selectedPalco) {
            const palco = (palcos || []).find(p => p.id === selectedPalco);
            if (palco) selectedPalcoPrecio = palco.precio;
        }
        container.innerHTML = palcos.map(p => {
            const vendido = ocupados.includes(p.id);
            return `
                <div class="palco-card${selectedPalco === p.id ? ' selected' : ''}${vendido ? ' sold' : ''}"
                     onclick="${vendido ? '' : `seleccionarPalco('${p.id}')`}">
                    <div class="palco-info">
                        <div class="palco-nombre">Palco ${p.id.substring(0, 8)}</div>
                        <div class="palco-asientos">${p.asientos} asientos</div>
                        <div class="palco-precio">€${p.precio}</div>
                    </div>
                    <div class="palco-check">${selectedPalco === p.id ? '✓' : ''}</div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Error al cargar palcos:', e);
    }
}

async function fetchPalcosOcupados(eventoID) {
    try {
        const usuarioID = localStorage.getItem('usuarioId') || '';
        const r = await fetch(`${API_BASE}/tickets/asientos-ocupados?eventoID=${eventoID}&usuarioID=${usuarioID}`);
        const data = await r.json();
        const ocupados = (data.ocupados || []).filter(s => s.startsWith('PALCO-'));
        const tusCompras = (data.tusCompras || []).filter(s => s.startsWith('PALCO-'));
        const todos = [...new Set([...ocupados, ...tusCompras])];
        return todos.map(s => s.replace('PALCO-', ''));
    } catch {
        return [];
    }
}

window.seleccionarPalco = async function(palcoID) {
    if (selectedPalco === palcoID) {
        selectedPalco = null;
        selectedPalcoPrecio = 0;
    } else {
        selectedPalco = palcoID;
        try {
            const r = await fetch(`${API_BASE}/palcos/mostrar?pisoID=${selectedPisoID}`);
            const palcos = await r.json();
            const palco = (palcos || []).find(p => p.id === palcoID);
            selectedPalcoPrecio = palco ? palco.precio : 0;
        } catch {
            selectedPalcoPrecio = 0;
        }
    }
    cargarPalcos(selectedPisoID);
    await guardarTicket();
    updateSummary();
};

function generateSeatGrid() {
    const anfiteatro = currentAnfiteatro;
    if (!anfiteatro) return;
    const filas = anfiteatro.filas;
    const columnas = anfiteatro.columnas;
    const asientosVacios = anfiteatro.asientosVacios || [];
    const asientosVips = anfiteatro.asientosVips || [];
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    COL_LABELS = [];
    for (let i = 0; i < columnas; i++) {
        COL_LABELS.push(letters[i]);
    }

    const seatGrid = document.getElementById('seatGrid');
    seatGrid.innerHTML = '';
    seatGrid.style.gridTemplateColumns = `2rem repeat(${columnas}, 2rem)`;

    const emptyCorner = document.createElement('div');
    seatGrid.appendChild(emptyCorner);

    for (let col = 0; col < columnas; col++) {
        const label = document.createElement('div');
        label.className = 'seat-label';
        label.textContent = COL_LABELS[col];
        seatGrid.appendChild(label);
    }

    for (let row = 1; row <= filas; row++) {
        const rowLabel = document.createElement('div');
        rowLabel.className = 'seat-label';
        rowLabel.textContent = row;
        seatGrid.appendChild(rowLabel);

        for (let col = 0; col < columnas; col++) {
            const seatId = `${row}${COL_LABELS[col]}`;

            if (asientosVacios.includes(seatId)) {
                const placeholder = document.createElement('div');
                placeholder.style.visibility = 'hidden';
                placeholder.style.pointerEvents = 'none';
                placeholder.style.width = '2rem';
                placeholder.style.height = '2rem';
                seatGrid.appendChild(placeholder);
                continue;
            }

            const seat = document.createElement('div');
            seat.className = 'seat';
            seat.dataset.seatId = seatId;
            seat.dataset.row = row;
            seat.dataset.col = COL_LABELS[col];
            seat.dataset.isVip = asientosVips.includes(seatId) ? 'true' : 'false';

            if (asientosVips.includes(seatId)) {
                seat.classList.add('seat-vip');
                seat.addEventListener('click', () => toggleSeat(seat, seatId));
            } else {
                seat.addEventListener('click', () => toggleSeat(seat, seatId));
            }

            seatGrid.appendChild(seat);
        }
    }
}

async function guardarTicket() {
    if (!currentTicket || !currentTicket.id) return;
    const partes = [];
    if (selectedPalco) partes.push(`PALCO-${selectedPalco}`);
    if (selectedSeats.length > 0) partes.push(selectedSeats.join(', '));
    const asientos = partes.join(', ');
    const piso = pisos.find(p => p.id === selectedPisoID);
    await actualizarTicket(currentTicket.id, asientos, false, piso?.planta);
}

function toggleSeat(seatElement, seatId) {
    if (seatElement.classList.contains('seat-occupied') || seatElement.classList.contains('seat-tus-compras')) {
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

    if (currentTicket && currentTicket.id) {
        guardarTicket();
    }

    updateSummary();
}

function getPrecioAsiento(seatId) {
    if (currentAnfiteatro && currentAnfiteatro.asientosVips && currentAnfiteatro.asientosVips.includes(seatId)) {
        return currentAnfiteatro.precioVips || currentAnfiteatro.precio || 45;
    }
    return currentAnfiteatro?.precio || 45;
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

    if (selectedPalco) {
        const tag = document.createElement('span');
        tag.className = 'seat-tag';
        tag.textContent = `Palco ${selectedPalco.substring(0, 8)} - ${pisos.find(p => p.id === selectedPisoID)?.planta || ''}`;
        selectedSeatsList.appendChild(tag);
    }

    selectedSeats.forEach(seatId => {
        const row = seatId.slice(0, -1);
        const col = seatId.slice(-1);
        const tag = document.createElement('span');
        tag.className = 'seat-tag';
        const precio = getPrecioAsiento(seatId);
        tag.textContent = `FILA ${row}, ${col}${row} €${precio}`;
        selectedSeatsList.appendChild(tag);
    });

    let subtotal = selectedSeats.reduce((sum, s) => sum + getPrecioAsiento(s), 0);
    if (selectedPalco) subtotal += selectedPalcoPrecio;
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
        <div class="event-card" data-event-id="${evento.id}" onclick="seleccionarEvento('${evento.id}', '${evento.nombre}', ${evento.duracion}, '${evento.fecha}', '${evento.sitioID || ''}')">
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
        selectedPalcoPrecio = 0;
        selectedSeats = [];
        if (ticketExistente.asientos) {
            const parts = ticketExistente.asientos.split(',').map(s => s.trim()).filter(s => s);
            parts.forEach(p => {
                if (p.startsWith('PALCO-')) {
                    selectedPalco = p.replace('PALCO-', '');
                } else {
                    selectedSeats.push(p);
                }
            });
            if (selectedPalco) {
                cargarPalcoPrecio(selectedPalco);
            }
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
    
    updateSummary();
};


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
        currentSitioID = null;
        currentAnfiteatro = null;
        pisos = [];
        selectedPisoID = null;
        selectedPalco = null;
        selectedPalcoPrecio = 0;
        
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
            
            if (selectedSeats.length === 0 && !selectedPalco) {
                alert('Por favor, selecciona al menos un asiento o un palco.');
                return;
            }

            if (!currentEvent) {
                alert('Por favor, selecciona un evento.');
                return;
            }

            const btn = e.target;
            let subtotal = selectedSeats.reduce((sum, s) => sum + getPrecioAsiento(s), 0);
            if (selectedPalco) subtotal += selectedPalcoPrecio;
            const serviceFee = subtotal * SERVICE_FEE_PERCENTAGE;
            const total = subtotal + serviceFee;

            btn.disabled = true;
            btn.textContent = 'Procesando...';

            const asientosParaPago = [];
            if (selectedPalco) asientosParaPago.push(`PALCO-${selectedPalco}`);
            if (selectedSeats.length > 0) asientosParaPago.push(selectedSeats.join(', '));
            const asientosStr = asientosParaPago.join(', ');

            const intentResult = await crearPaymentIntent(
                total,
                asientosStr,
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
                    asientosStr,
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