let selectedPalcoPisoID = null;

async function fetchPalcosOcupados(eventoID, planta) {
    try {
        const usuarioID = localStorage.getItem('usuarioId') || '';
        let url = `${API_BASE}/tickets/asientos-ocupados?eventoID=${eventoID}&usuarioID=${usuarioID}`;
        if (planta !== undefined) url += `&planta=${planta}`;
        const r = await fetch(url);
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
        const pisoObj = pisos.find(p => p.id === pisoID);
        const ocupados = await fetchPalcosOcupados(currentEvent.eventoId, pisoObj?.planta);
        if (selectedPalcoNumero && (!selectedPalcoPisoID || selectedPalcoPisoID === pisoID)) {
            const palco = (palcos || []).find(p => String(p.numero) === String(selectedPalcoNumero));
            if (palco) {
                selectedPalco = palco.id;
                selectedPalcoPrecio = palco.precio;
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
        selectedPalcoPisoID = null;
    } else {
        selectedPalco = palcoID;
        selectedPalcoPisoID = selectedPisoID;
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
