async function iniciarRealtime() {
    try {
        const cfg = await fetch(`${API_BASE}/config`).then(r => r.json());
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.97.0');
        supabaseRealtime = createClient(cfg.supabaseUrl, cfg.supabasePublishableKey);
        realtimeUsuarioID = localStorage.getItem('usuarioId');
    } catch (e) {
        console.warn('No se pudo iniciar Realtime:', e);
    }
}

function suscribirEventoRealtime(eventoID) {
    if (!supabaseRealtime || !eventoID) return;
    unsuscribirRealtime();
    realtimeChannel = supabaseRealtime
        .channel(`evento-${eventoID}`)
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'BDTicket', filter: `eventoID=eq.${eventoID}` },
            (payload) => {
                if (realtimeUsuarioID && payload.new?.usuarioID === realtimeUsuarioID) {
                    if (payload.eventType === 'UPDATE' && payload.old?.confirmado === false && payload.new?.confirmado === true) {
                    } else {
                        return;
                    }
                }
                if (realtimeUsuarioID && payload.old?.usuarioID === realtimeUsuarioID) return;
                if (currentPisoPlanta !== undefined) {
                    cargarAsientosOcupados(eventoID, currentPisoPlanta);
                    cargarPalcos(selectedPisoID);
                }
            }
        )
        .subscribe();
}

function unsuscribirRealtime() {
    if (realtimeChannel) {
        supabaseRealtime.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
}
