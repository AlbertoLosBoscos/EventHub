function authHeaders(extra) {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return { ...headers, ...extra };
}

async function crearTicket(usuarioID, asientos, eventoID, fecha, duracion) {
    try {
        const response = await fetch(`${API_BASE}/tickets/crear`, {
            method: 'POST',
            headers: authHeaders(),
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
            headers: authHeaders(),
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
        const token = localStorage.getItem('token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const response = await fetch(`${API_BASE}/tickets/por-usuario-y-evento?usuarioID=${usuarioID}&eventoID=${eventoID}`, { headers });
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function guardarTicket() {
    if (!currentTicket || !currentTicket.id) return;
    const partes = [];
    if (selectedPalcoNumero) partes.push(`PALCO-${selectedPalcoNumero}`);
    if (selectedSeats.length > 0) partes.push(selectedSeats.join(', '));
    const asientos = partes.join(', ');
    const piso = pisos.find(p => p.id === selectedPisoID);
    await actualizarTicket(currentTicket.id, asientos, false, piso?.planta);
}

async function crearPaymentIntent(cantidad, asientos, eventoId, usuarioId) {
    try {
        const response = await fetch(`${API_BASE}/pago/crear-intent`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ cantidad, asientos, eventoId, usuarioId })
        });
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return { error: error.message };
    }
}
