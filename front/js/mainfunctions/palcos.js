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
        if (selectedPalcoNumero) {
            const palco = (palcos || []).find(p => String(p.numero) === String(selectedPalcoNumero));
            if (palco) {
                selectedPalco = palco.id;
                selectedPalcoPrecio = palco.precio;
            } else {
                selectedPalco = null;
                selectedPalcoNumero = null;
                selectedPalcoPrecio = 0;
            }
        }
        container.innerHTML = palcos.map(p => {
            const vendido = ocupados.includes(String(p.numero));
            return `
                <div class="palco-card${selectedPalco === p.id ? ' selected' : ''}${vendido ? ' sold' : ''}"
                     onclick="${vendido ? '' : `seleccionarPalco('${p.id}')`}">
                    <div class="palco-info">
                        <div class="palco-nombre">Palco ${p.numero || '?'}</div>
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

window.seleccionarPalco = async function(palcoID) {
    if (selectedPalco === palcoID) {
        selectedPalco = null;
        selectedPalcoNumero = null;
        selectedPalcoPrecio = 0;
    } else {
        selectedPalco = palcoID;
        try {
            const r = await fetch(`${API_BASE}/palcos/mostrar?pisoID=${selectedPisoID}`);
            const palcos = await r.json();
            const palco = (palcos || []).find(p => p.id === palcoID);
            selectedPalcoPrecio = palco ? palco.precio : 0;
            selectedPalcoNumero = palco ? palco.numero : null;
        } catch {
            selectedPalcoPrecio = 0;
            selectedPalcoNumero = null;
        }
    }
    cargarPalcos(selectedPisoID);
    await guardarTicket();
    updateSummary();
};
