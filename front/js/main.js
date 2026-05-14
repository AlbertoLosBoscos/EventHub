const ROWS = 15;
const COLS = 15;
const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
const PRICE_PER_SEAT = 45;
const SERVICE_FEE_PERCENTAGE = 0.05;

const occupiedSeats = ['1F', '1G', '3A', '5D', '7K', '10M', '12B', '12C', '14O'];
let selectedSeats = [];

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

document.addEventListener('DOMContentLoaded', () => {
    generateSeatGrid();
    
    selectedSeats = ['1E', '1F'];
    updateSummary();
    
    document.querySelectorAll('.seat[data-seat-id="1E"], .seat[data-seat-id="1F"]').forEach(seat => {
        seat.classList.add('seat-selected');
        seat.textContent = '✓';
    });

    const confirmBtn = document.getElementById('confirmPurchase');
    confirmBtn.addEventListener('click', () => {
        if (selectedSeats.length === 0) {
            alert('Por favor, selecciona al menos un asiento.');
            return;
        }
        alert('¡Compra confirmada! Gracias por tu compra en EventHub.');
    });
});