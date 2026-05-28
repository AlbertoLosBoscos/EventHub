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
        const pisos = await r.json();
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">-- Selecciona un piso --</option>';
        const filtrados = sitioID ? (pisos || []).filter(p => p.sitioID === sitioID) : (pisos || []);
        filtrados.forEach(p => {
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
                if (seat.classList.contains('vacio')) {
                    seat.classList.remove('vacio');
                    seat.classList.add('vip');
                } else if (seat.classList.contains('vip')) {
                    seat.classList.remove('vip');
                } else {
                    seat.classList.add('vacio');
                }
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
    const asientosVips = [];
    seats.forEach(s => {
        if (s.classList.contains('vacio')) asientosVacios.push(s.dataset.seatId);
        if (s.classList.contains('vip')) asientosVips.push(s.dataset.seatId);
    });

    const body = {
        precio: parseFloat(document.getElementById('inputAnfiPrecio').value),
        precioVips: parseFloat(document.getElementById('inputAnfiPrecioVip').value) || null,
        filas: parseInt(document.getElementById('inputAnfiFilas').value),
        columnas: parseInt(document.getElementById('inputAnfiColumnas').value),
        asientosVacios,
        asientosVips,
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
