async function cargarEventosSelect(selectId, mostrarSitio, futurosOnly) {
    try {
        const [rEventos, rSitios] = await Promise.all([
            fetch(`${API_BASE}/eventos/mostrar`),
            mostrarSitio ? fetch(`${API_BASE}/sitios/mostrar`) : Promise.resolve(null)
        ]);
        let eventos = await rEventos.json();
        let sitiosMap = {};
        if (rSitios) {
            const sitios = await rSitios.json();
            (sitios || []).forEach(s => { sitiosMap[s.id] = s.nombre; });
        }
        if (futurosOnly) {
            const ahora = new Date();
            eventos = (eventos || []).filter(ev => new Date(ev.fecha) > ahora);
        }
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">-- Selecciona un evento --</option>';
        (eventos || []).forEach(ev => {
            const opt = document.createElement('option');
            opt.value = ev.id;
            const sitioTexto = sitiosMap[ev.sitioID] ? ' - ' + sitiosMap[ev.sitioID] : '';
            opt.textContent = `${ev.nombre} (${new Date(ev.fecha).toLocaleDateString()})${sitioTexto}`;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error('Error al cargar eventos:', e);
    }
}

async function subirImagen(file) {
    const formData = new FormData();
    formData.append('imagen', file);
    const r = await fetch(`${API_BASE}/imagenes/imagen-evento`, {
        method: 'POST',
        body: formData,
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Error al subir imagen');
    return data.url;
}

async function crearEvento(e) {
    e.preventDefault();
    const fechaRaw = document.getElementById('inputFecha').value;
    const fileInput = document.getElementById('inputImagen');
    let imagenUrl = '';

    if (fileInput.files.length > 0) {
        try {
            imagenUrl = await subirImagen(fileInput.files[0]);
        } catch (err) {
            mostrarMensaje('mensajeCrear', 'Error al subir imagen: ' + err.message, 'error');
            return;
        }
    }

    const body = {
        nombre: document.getElementById('inputNombre').value,
        descripcion: document.getElementById('inputDescripcion').value,
        sitioID: document.getElementById('inputSitioID').value,
        fecha: new Date(fechaRaw).toISOString(),
        compania: document.getElementById('inputCompania').value,
        duracion: parseInt(document.getElementById('inputDuracion').value),
        imagen: imagenUrl || undefined,
    };
    try {
        const r = await fetch(`${API_BASE}/eventos/crear`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await r.json();
        if (r.ok) {
            mostrarMensaje('mensajeCrear', 'Evento creado con éxito', 'success');
            document.getElementById('formCrearEvento').reset();
            cargarEventosSelect('selectEliminar', true, true);
            cargarEventosSelect('selectGestionar', true, true);
        } else {
            mostrarMensaje('mensajeCrear', 'Error: ' + (data.error || 'desconocido'), 'error');
        }
    } catch (err) {
        mostrarMensaje('mensajeCrear', 'Error de conexión', 'error');
    }
}

async function eliminarEvento() {
    const select = document.getElementById('selectEliminar');
    const eventoId = select.value;
    if (!eventoId) {
        mostrarMensaje('mensajeEliminar', 'Selecciona un evento', 'error');
        return;
    }
    if (!confirm('¿Seguro que quieres eliminar este evento?')) return;
    try {
        const r = await fetch(`${API_BASE}/eventos/eliminar/${eventoId}`, { method: 'DELETE' });
        const data = await r.json();
        if (r.ok) {
            mostrarMensaje('mensajeEliminar', 'Evento eliminado con éxito', 'success');
            cargarEventosSelect('selectEliminar', true, true);
            cargarEventosSelect('selectGestionar', true, true);
        } else {
            mostrarMensaje('mensajeEliminar', 'Error: ' + (data.error || 'desconocido'), 'error');
        }
    } catch (err) {
        mostrarMensaje('mensajeEliminar', 'Error de conexión', 'error');
    }
}

async function cargarEventoEnFormulario() {
    const eventoId = document.getElementById('selectGestionar').value;
    if (!eventoId) return;
    try {
        const r = await fetch(`${API_BASE}/eventos/detalles/${eventoId}`);
        const ev = await r.json();
        document.getElementById('editNombre').value = ev.nombre || '';
        document.getElementById('editDescripcion').value = ev.descripcion || '';
        document.getElementById('editSitioID').value = ev.sitioID || '';
        if (ev.fecha) {
            const d = new Date(ev.fecha);
            const pad = n => String(n).padStart(2, '0');
            document.getElementById('editFecha').value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        }
        document.getElementById('editCompania').value = ev.compania || '';
        document.getElementById('editDuracion').value = ev.duracion || '';

        const preview = document.getElementById('editImagenPreview');
        if (ev.imagen) {
            preview.innerHTML = `<img src="${ev.imagen}" style="max-width:200px;max-height:120px;border-radius:6px;">`;
        } else {
            preview.innerHTML = '';
        }
    } catch (e) {
        console.error('Error al cargar evento:', e);
    }
}

async function guardarEdicion(e) {
    e.preventDefault();
    const eventoId = document.getElementById('selectGestionar').value;
    if (!eventoId) {
        mostrarMensaje('mensajeGestionar', 'Selecciona un evento', 'error');
        return;
    }
    const fechaRaw = document.getElementById('editFecha').value;
    const fileInput = document.getElementById('editImagen');
    let imagenUrl = undefined;

    if (fileInput.files.length > 0) {
        try {
            imagenUrl = await subirImagen(fileInput.files[0]);
        } catch (err) {
            mostrarMensaje('mensajeGestionar', 'Error al subir imagen: ' + err.message, 'error');
            return;
        }
    }

    const body = {
        nombre: document.getElementById('editNombre').value,
        descripcion: document.getElementById('editDescripcion').value,
        sitioID: document.getElementById('editSitioID').value,
        fecha: new Date(fechaRaw).toISOString(),
        compania: document.getElementById('editCompania').value,
        duracion: parseInt(document.getElementById('editDuracion').value),
    };
    if (imagenUrl) body.imagen = imagenUrl;

    try {
        const r = await fetch(`${API_BASE}/eventos/actualizar/${eventoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await r.json();
        if (r.ok) {
            mostrarMensaje('mensajeGestionar', 'Evento actualizado con éxito', 'success');
            cargarEventosSelect('selectEliminar', true, true);
            cargarEventosSelect('selectGestionar', true, true);
            cargarEventoEnFormulario();
        } else {
            mostrarMensaje('mensajeGestionar', 'Error: ' + (data.error || 'desconocido'), 'error');
        }
    } catch (err) {
        mostrarMensaje('mensajeGestionar', 'Error de conexión', 'error');
    }
}
