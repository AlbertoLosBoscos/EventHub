let zonaRow = null;
let zonaPriceMap = {};
let zonaSeatMap = {};
let disabledSeats = [];
let visibilidadReducidaSeats = [];

async function loadZonas() {
    if (!currentAnfiteatro || !currentAnfiteatro.id) {
        zonaRow = null;
        zonaPriceMap = {};
        zonaSeatMap = {};
        disabledSeats = [];
        visibilidadReducidaSeats = [];
        return;
    }
    try {
        const r = await fetch(`${API_BASE}/zonas/mostrar/${currentAnfiteatro.id}`);
        zonaRow = await r.json();
        if (!zonaRow || !zonaRow.id) {
            zonaPriceMap = {};
            zonaSeatMap = {};
            disabledSeats = [];
            visibilidadReducidaSeats = [];
            return;
        }

        zonaPriceMap = {};
        zonaSeatMap = {};

        function parseSeats(val) {
            if (Array.isArray(val)) return val;
            if (!val) return [];
            try {
                let p = JSON.parse(val);
                if (Array.isArray(p)) return p;
                if (typeof p === 'string') {
                    let p2 = JSON.parse(p);
                    if (Array.isArray(p2)) return p2;
                }
                return [];
            } catch { return []; }
        }
        const zoneFields = [
            { seats: parseSeats(zonaRow.asientosVips), price: zonaRow.precioVips || 0, name: 'vip' },
            { seats: parseSeats(zonaRow.Zona1), price: zonaRow.precioZona1 || 0, name: 'zona1' },
            { seats: parseSeats(zonaRow.Zona2), price: zonaRow.precioZona2 || 0, name: 'zona2' },
            { seats: parseSeats(zonaRow.Zona3), price: zonaRow.precioZona3 || 0, name: 'zona3' },
        ];

        zoneFields.forEach(z => {
            (z.seats || []).forEach(seatId => {
                zonaPriceMap[seatId] = z.price;
                if (!zonaSeatMap[seatId]) zonaSeatMap[seatId] = [];
                zonaSeatMap[seatId].push(z.name);
            });
        });

        disabledSeats = parseSeats(zonaRow.asientosDiscapacitados);
        visibilidadReducidaSeats = parseSeats(zonaRow.visibilidadReducida);
    } catch (e) {
        console.error('[Zonas] Error al cargar zonas:', e);
        zonaPriceMap = {};
        zonaSeatMap = {};
    }
}

function getPrecioAsiento(seatId) {
    const price = zonaPriceMap[seatId];
    if (price !== undefined && price !== null) return Number(price);
    return 45;
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
    function parseSeats(val) {
        if (Array.isArray(val)) return val;
        if (!val) return [];
        try {
            let p = JSON.parse(val);
            if (Array.isArray(p)) return p;
            if (typeof p === 'string') {
                let p2 = JSON.parse(p);
                if (Array.isArray(p2)) return p2;
            }
            return [];
        } catch { return []; }
    }
    const asientosVacios = parseSeats(anfiteatro.asientosVacios);
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

            const seatZones = zonaSeatMap[seatId] || [];
            if (seatZones.includes('vip')) {
                seat.classList.add('seat-vip');
            }
            if (disabledSeats.includes(seatId)) {
                seat.classList.add('seat-disabled');
            }
            if (visibilidadReducidaSeats.includes(seatId)) {
                seat.classList.add('seat-visibilidad-reducida');
            }

            seat.addEventListener('click', () => toggleSeat(seat, seatId));
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
            zonaRow = null;
            zonaPriceMap = {};
            zonaSeatMap = {};
            disabledSeats = [];
        } else {
            currentAnfiteatro = anfiteatros[0];
            await loadZonas();
            generateSeatGrid();
        }
        occupiedSeats = [];
        misComprasSeats = [];
        selectedSeats = [];
        selectedPalco = null;
        selectedPalcoNumero = null;
        selectedPalcoPrecio = 0;
        selectedPalcoPisoID = null;

        const piso = pisos.find(p => p.id === pisoID);
        const planta = piso ? piso.planta : undefined;
        currentPisoPlanta = planta;

        if (planta !== undefined) {
            const usuarioID = localStorage.getItem('usuarioId') || 'demo-user-123';
            const ticketExistente = await obtenerTicketUsuarioEvento(usuarioID, currentEvent.eventoId, planta);
            if (ticketExistente && ticketExistente.id) {
                currentTicket = ticketExistente;
                if (currentTicket.asientos) {
                    const parts = currentTicket.asientos.split(',').map(s => s.trim()).filter(s => s);
                    parts.forEach(p => {
                        if (p.startsWith('PALCO-')) {
                            selectedPalcoNumero = p.replace('PALCO-', '');
                        } else {
                            selectedSeats.push(p);
                        }
                    });
                }
            } else {
                const result = await crearTicket(usuarioID, '', currentEvent.eventoId, currentEvent.fecha, currentEvent.duracion, planta);
                if (result.data && result.data.id) {
                    currentTicket = result.data;
                } else if (result.error) {
                    console.error('Error al crear ticket: ' + result.error);
                } else if (result.message) {
                    const ticketActualizado = await obtenerTicketUsuarioEvento(usuarioID, currentEvent.eventoId, planta);
                    if (ticketActualizado && ticketActualizado.id) {
                        currentTicket = ticketActualizado;
                    }
                }
            }
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
    document.getElementById('seatsSubtitle').textContent = `Anfiteatro ${pisos.find(p => p.id === pisoID)?.planta || ''}`;
    await cargarAnfiteatro(pisoID);
};