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
let selectedPalcoNumero = null;
let selectedPalcoPrecio = 0;

let supabaseRealtime = null;
let realtimeChannel = null;
let realtimeUsuarioID = null;
let currentPisoPlanta = undefined;

const API_BASE = 'http://localhost:3000/api';

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

function renderPisoSelector() {
    const container = document.getElementById('pisoSelector');
    container.innerHTML = pisos.map(p => `
        <button class="piso-btn${selectedPisoID === p.id ? ' active' : ''}"
                onclick="seleccionarPiso('${p.id}')">
            Planta ${p.planta}
        </button>
    `).join('');
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
        tag.textContent = `Palco ${selectedPalcoNumero || '?'} - Planta ${pisos.find(p => p.id === selectedPisoID)?.planta || ''}`;
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
        selectedPalcoNumero = null;
        selectedPalcoPrecio = 0;

        const dateSelectedEl = document.getElementById('dateSelected');
        if (dateSelectedEl) {
            dateSelectedEl.textContent = formatDate(fecha);
        }

        await cargarEventosPorFecha(fecha);

        const step3 = document.getElementById('step3');
        if (step3) step3.classList.add('hidden');
        unsuscribirRealtime();
    });

    const confirmBtns = document.querySelectorAll('#confirmPurchase');
    confirmBtns.forEach(confirmBtn => {
        confirmBtn.addEventListener('click', async (e) => {
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
            if (selectedPalcoNumero) asientosParaPago.push(`PALCO-${selectedPalcoNumero}`);
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
    iniciarRealtime();
});

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
        localStorage.removeItem('token');
        window.location.href = '/guest';
    });
}
