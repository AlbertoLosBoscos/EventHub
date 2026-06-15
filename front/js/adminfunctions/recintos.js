function authAdminHeaders() {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

async function cargarSitiosSelect(selectId) {
    try {
        const r = await fetch(`${API_BASE}/sitios/mostrar`);
        const sitios = await r.json();
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">-- Selecciona un sitio --</option>';
        sitios.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.nombre;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error('Error al cargar sitios:', e);
    }
}

async function cargarAnfiteatrosSelect(selectId) {
    try {
        const r = await fetch(`${API_BASE}/anfiteatros/mostrar`);
        const anfiteatros = await r.json();
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">-- Ninguno --</option>';
        (anfiteatros || []).forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = `Anfiteatro ${a.id.substring(0, 8)}... (${a.filas}x${a.columnas})`;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error('Error al cargar anfiteatros:', e);
    }
}

async function cargarPisosSelect(selectId, soloLibres, sitioID) {
    try {
        const url = soloLibres ? `${API_BASE}/pisos/sin-anfiteatro` : `${API_BASE}/pisos/mostrar`;
        const r = await fetch(url, { headers: soloLibres ? authAdminHeaders() : {} });
        let pisos = await r.json();
        if (!Array.isArray(pisos)) pisos = [];
        if (sitioID) {
            pisos = pisos.filter(p => String(p.sitioID) === String(sitioID));
        }
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = '<option value="">-- Selecciona un piso --</option>';
        pisos.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `Planta ${p.planta}`;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error('Error al cargar pisos:', e);
    }
}

async function crearSitio(e) {
    e.preventDefault();
    const body = {
        nombre: document.getElementById('inputSitioNombre').value,
        aforo: parseInt(document.getElementById('inputSitioAforo').value),
        direccion: document.getElementById('inputSitioDireccion').value || null,
        url_maps: document.getElementById('inputSitioUrlMaps').value || null,
    };
    const headers = { ...authAdminHeaders(), 'Content-Type': 'application/json' };
    try {
        const r = await fetch(`${API_BASE}/sitios/crear`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        const data = await r.json();
        if (r.ok) {
            mostrarMensaje('mensajeCrearSitio', 'Sitio creado con éxito', 'success');
            document.getElementById('formCrearSitio').reset();
            cargarSitiosSelect('inputSitioID');
            cargarSitiosSelect('editSitioID');
            cargarSitiosSelect('inputPisoSitio');
        } else {
            mostrarMensaje('mensajeCrearSitio', 'Error: ' + (data.error || 'desconocido'), 'error');
        }
    } catch (err) {
        mostrarMensaje('mensajeCrearSitio', 'Error de conexión', 'error');
    }
}

async function crearPiso(e) {
    e.preventDefault();
    const body = {
        planta: parseInt(document.getElementById('inputPisoPlanta').value),
        sitioID: document.getElementById('inputPisoSitio').value,
    };
    const headers = { ...authAdminHeaders(), 'Content-Type': 'application/json' };
    try {
        const r = await fetch(`${API_BASE}/pisos/crear`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        const data = await r.json();
        if (r.ok) {
            mostrarMensaje('mensajeCrearPiso', 'Piso creado con éxito', 'success');
            document.getElementById('formCrearPiso').reset();
            cargarPisosSelect('inputAnfiPiso', true);
            cargarPisosSelect('inputPalcoPiso');
        } else {
            mostrarMensaje('mensajeCrearPiso', 'Error: ' + (data.error || 'desconocido'), 'error');
        }
    } catch (err) {
        mostrarMensaje('mensajeCrearPiso', 'Error de conexión', 'error');
    }
}

function generarGrid() {
    const filas = parseInt(document.getElementById('inputAnfiFilas').value);
    const cols = parseInt(document.getElementById('inputAnfiColumnas').value);
    if (!filas || !cols || filas < 1 || cols < 1) return;

    const container = document.getElementById('anfiGridContainer');
    container.classList.remove('hidden');
    document.getElementById('btnCrearAnfiteatro').classList.remove('hidden');

    const grid = document.getElementById('anfiGrid');
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${cols}, 32px)`;
    grid.style.gridTemplateRows = `repeat(${filas}, 32px)`;

    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let f = 0; f < filas; f++) {
        for (let c = 0; c < cols; c++) {
            const seat = document.createElement('div');
            seat.className = 'anfi-seat';
            seat.dataset.seatId = `${f + 1}${letras[c]}`;
            seat.textContent = `${f + 1}${letras[c]}`;
            seat.addEventListener('click', () => {
                seat.classList.toggle('vacio');
            });
            grid.appendChild(seat);
        }
    }
}

async function crearAnfiteatro(e) {
    e.preventDefault();
    const seats = document.querySelectorAll('#anfiGrid .anfi-seat');
    if (seats.length === 0) {
        mostrarMensaje('mensajeCrearAnfiteatro', 'Genera el escenario primero', 'error');
        return;
    }
    const asientosVacios = [];
    seats.forEach(s => {
        if (s.classList.contains('vacio')) asientosVacios.push(s.dataset.seatId);
    });

    const body = {
        filas: parseInt(document.getElementById('inputAnfiFilas').value),
        columnas: parseInt(document.getElementById('inputAnfiColumnas').value),
        asientosVacios: asientosVacios,
        pisoID: document.getElementById('inputAnfiPiso').value,
    };
    const headers = { ...authAdminHeaders(), 'Content-Type': 'application/json' };
    try {
        const r = await fetch(`${API_BASE}/anfiteatros/crear`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        const data = await r.json();
        if (r.ok) {
            mostrarMensaje('mensajeCrearAnfiteatro', 'Anfiteatro creado con éxito', 'success');
            document.getElementById('formCrearAnfiteatro').reset();
            document.getElementById('anfiGridContainer').classList.add('hidden');
            document.getElementById('btnCrearAnfiteatro').classList.add('hidden');
            cargarPisosSelect('inputAnfiPiso', true);
        } else {
            mostrarMensaje('mensajeCrearAnfiteatro', 'Error: ' + (data.error || 'desconocido'), 'error');
        }
    } catch (err) {
        mostrarMensaje('mensajeCrearAnfiteatro', 'Error de conexión', 'error');
    }
}

async function crearPalco(e) {
    e.preventDefault();
    const body = {
        asientos: parseInt(document.getElementById('inputPalcoAsientos').value),
        precio: parseFloat(document.getElementById('inputPalcoPrecio').value),
        pisoID: document.getElementById('inputPalcoPiso').value,
    };
    const headers = { ...authAdminHeaders(), 'Content-Type': 'application/json' };
    try {
        const r = await fetch(`${API_BASE}/palcos/crear`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        const data = await r.json();
        if (r.ok) {
            mostrarMensaje('mensajeCrearPalco', 'Palco creado con éxito', 'success');
            document.getElementById('formCrearPalco').reset();
        } else {
            mostrarMensaje('mensajeCrearPalco', 'Error: ' + (data.error || 'desconocido'), 'error');
        }
    } catch (err) {
        mostrarMensaje('mensajeCrearPalco', 'Error de conexión', 'error');
    }
}

let zonaAnfiteatroActual = null;
let zonaData = {};
let zonaSelectedField = 'asientosVips';
let zonaGridSeats = [];
let modoDiscapacitado = false;
let modoVisibilidadReducida = false;

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

function generarZonaGrid() {
    const anfiteatro = zonaAnfiteatroActual;
    if (!anfiteatro) return;
    const filas = anfiteatro.filas;
    const columnas = anfiteatro.columnas;
    const asientosVacios = parseSeats(anfiteatro.asientosVacios);
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    const grid = document.getElementById('zonaGrid');
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${columnas}, 32px)`;
    grid.style.gridTemplateRows = `repeat(${filas}, 32px)`;

    zonaGridSeats = [];

    for (let f = 0; f < filas; f++) {
        for (let c = 0; c < columnas; c++) {
            const seatId = `${f + 1}${letters[c]}`;
            const seat = document.createElement('div');
            seat.className = 'anfi-seat';
            seat.dataset.seatId = seatId;
            seat.textContent = seatId;

            if (asientosVacios.includes(seatId)) {
                seat.classList.add('vacio');
                seat.style.cursor = 'default';
            } else {
                seat.addEventListener('click', () => toggleZonaSeat(seat, seatId));
            }

            grid.appendChild(seat);
            zonaGridSeats.push({ el: seat, id: seatId });
        }
    }

    actualizarGrid();
}

function toggleZonaSeat(seat, seatId) {
    if (seat.classList.contains('vacio')) return;

    if (modoDiscapacitado) {
        const arr = zonaData.asientosDiscapacitados || [];
        if (arr.includes(seatId)) {
            zonaData.asientosDiscapacitados = arr.filter(s => s !== seatId);
        } else {
            zonaData.asientosDiscapacitados = [...arr, seatId];
        }
        actualizarGrid();
        return;
    }

    if (modoVisibilidadReducida) {
        const arr = zonaData.visibilidadReducida || [];
        if (arr.includes(seatId)) {
            zonaData.visibilidadReducida = arr.filter(s => s !== seatId);
        } else {
            zonaData.visibilidadReducida = [...arr, seatId];
        }
        actualizarGrid();
        return;
    }

    if (seatInOtherZone(seatId)) {
        const zone = seatZoneName(seatId);
        mostrarMensaje('mensajeGestionarZonas', `Este asiento ya pertenece a ${zone}. Quítalo de allí primero.`, 'error');
        return;
    }

    const arr = zonaData[zonaSelectedField] || [];
    if (arr.includes(seatId)) {
        zonaData[zonaSelectedField] = arr.filter(s => s !== seatId);
    } else {
        zonaData[zonaSelectedField] = [...arr, seatId];
    }

    actualizarGrid();
}

function actualizarGrid() {
    const seatToZone = {};
    ['asientosVips', 'Zona1', 'Zona2', 'Zona3'].forEach(f => {
        (zonaData[f] || []).forEach(s => { seatToZone[s] = f; });
    });

    const disabled = zonaData.asientosDiscapacitados || [];
    const visibilidad = zonaData.visibilidadReducida || [];
    const zoneLabels = { asientosVips: 'VIP', Zona1: 'Z1', Zona2: 'Z2', Zona3: 'Z3' };

    zonaGridSeats.forEach(({ el, id }) => {
        el.classList.remove('zona-highlight', 'vip', 'discapacitados', 'visibilidad-reducida');
        el.title = '';

        const inCurrent = (zonaData[zonaSelectedField] || []).includes(id);
        const inOther = seatToZone[id] && seatToZone[id] !== zonaSelectedField;
        const isDisabled = disabled.includes(id);
        const isVisibilidad = visibilidad.includes(id);

        if (isDisabled) el.classList.add('discapacitados');
        if (isVisibilidad) el.classList.add('visibilidad-reducida');

        if (inCurrent) {
            el.classList.add('zona-highlight');
            if (zonaSelectedField === 'asientosVips') el.classList.add('vip');
            el.style.opacity = '1';
        } else if (inOther && !modoDiscapacitado && !modoVisibilidadReducida) {
            el.style.opacity = '0.4';
            el.title = `Pertenece a ${zoneLabels[seatToZone[id]]}`;
        } else {
            el.style.opacity = '1';
        }
    });

    const precio = getPrecioForSelected();
    document.getElementById('inputZonaPrecio').value = precio !== null ? precio : '';
}

function getPrecioForSelected() {
    if (zonaSelectedField === 'asientosVips') return zonaData.precioVips;
    if (zonaSelectedField === 'Zona1') return zonaData.precioZona1;
    if (zonaSelectedField === 'Zona2') return zonaData.precioZona2;
    if (zonaSelectedField === 'Zona3') return zonaData.precioZona3;
    return null;
}

function seatInOtherZone(seatId) {
    return ['asientosVips', 'Zona1', 'Zona2', 'Zona3']
        .filter(f => f !== zonaSelectedField)
        .some(f => (zonaData[f] || []).includes(seatId));
}

function seatZoneName(seatId) {
    const names = { asientosVips: 'VIP', Zona1: 'Zona 1', Zona2: 'Zona 2', Zona3: 'Zona 3' };
    for (const f of ['asientosVips', 'Zona1', 'Zona2', 'Zona3']) {
        if (f !== zonaSelectedField && (zonaData[f] || []).includes(seatId)) return names[f];
    }
    return null;
}

async function cargarZonaPorPiso(pisoID) {
    if (!pisoID) {
        document.getElementById('zonaGridContainer').classList.add('hidden');
        document.getElementById('zonaInfoAnfiteatro').classList.add('hidden');
        zonaAnfiteatroActual = null;
        return;
    }
    try {
        const r = await fetch(`${API_BASE}/anfiteatros/mostrar?pisoID=${pisoID}`);
        const anfiteatros = await r.json();
        zonaAnfiteatroActual = (anfiteatros || [])[0] || null;

        if (!zonaAnfiteatroActual) {
            document.getElementById('zonaInfoAnfiteatro').textContent = 'Este piso no tiene anfiteatro.';
            document.getElementById('zonaInfoAnfiteatro').classList.remove('hidden');
            document.getElementById('zonaGridContainer').classList.add('hidden');
            return;
        }

        document.getElementById('zonaInfoAnfiteatro').textContent = `Anfiteatro: ${zonaAnfiteatroActual.filas}×${zonaAnfiteatroActual.columnas} asientos`;
        document.getElementById('zonaInfoAnfiteatro').classList.remove('hidden');

        const zRes = await fetch(`${API_BASE}/zonas/mostrar/${zonaAnfiteatroActual.id}`);
        const zData = await zRes.json();

        zonaData = {
            asientosVips: parseSeats(zData?.asientosVips),
            precioVips: zData?.precioVips || 0,
            Zona1: parseSeats(zData?.Zona1),
            precioZona1: zData?.precioZona1 || 0,
            Zona2: parseSeats(zData?.Zona2),
            precioZona2: zData?.precioZona2 || 0,
            Zona3: parseSeats(zData?.Zona3),
            precioZona3: zData?.precioZona3 || 0,
            asientosDiscapacitados: parseSeats(zData?.asientosDiscapacitados),
            visibilidadReducida: parseSeats(zData?.visibilidadReducida),
        };

        document.getElementById('zonaGridContainer').classList.remove('hidden');
        generarZonaGrid();
    } catch (e) {
        console.error('Error al cargar anfiteatro:', e);
    }
}

async function guardarZonas() {
    if (!zonaAnfiteatroActual || !zonaAnfiteatroActual.id) {
        mostrarMensaje('mensajeGestionarZonas', 'Selecciona un piso con anfiteatro', 'error');
        return;
    }
    const anfiteatroID = zonaAnfiteatroActual.id;

    const body = {
        anfiteatroID,
        asientosVips: zonaData.asientosVips,
        precioVips: zonaData.precioVips,
        Zona1: zonaData.Zona1,
        precioZona1: zonaData.precioZona1,
        Zona2: zonaData.Zona2,
        precioZona2: zonaData.precioZona2,
        Zona3: zonaData.Zona3,
        precioZona3: zonaData.precioZona3,
        asientosDiscapacitados: zonaData.asientosDiscapacitados,
        visibilidadReducida: zonaData.visibilidadReducida,
    };
    const headers = { ...authAdminHeaders(), 'Content-Type': 'application/json' };
    try {
        const r = await fetch(`${API_BASE}/zonas/upsert`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        const data = await r.json();
        if (r.ok) {
            mostrarMensaje('mensajeGestionarZonas', 'Todas las zonas guardadas con éxito', 'success');
        } else {
            mostrarMensaje('mensajeGestionarZonas', 'Error: ' + (data.error || 'desconocido'), 'error');
        }
    } catch (err) {
        mostrarMensaje('mensajeGestionarZonas', 'Error de conexión', 'error');
    }
}
