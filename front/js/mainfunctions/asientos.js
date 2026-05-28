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

function getPrecioAsiento(seatId) {
    if (currentAnfiteatro && currentAnfiteatro.asientosVips && currentAnfiteatro.asientosVips.includes(seatId)) {
        return currentAnfiteatro.precioVips || currentAnfiteatro.precio || 45;
    }
    return currentAnfiteatro?.precio || 45;
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
        currentPisoPlanta = planta;

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

window.seleccionarPiso = async function(pisoID) {
    selectedPisoID = pisoID;
    renderPisoSelector();
    document.getElementById('seatsSubtitle').textContent = `Planta ${pisos.find(p => p.id === pisoID)?.planta || ''}`;
    await cargarAnfiteatro(pisoID);
};
