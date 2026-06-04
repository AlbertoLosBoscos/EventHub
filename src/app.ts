import express from 'express';
import dotenv from 'dotenv';
import path from 'path';

import rutaAuth from './routes/rutaAuth';
import rutaEvento from './routes/rutaEvento';
import rutaSitio from './routes/rutaSitio';
import rutaAnfiteatro from './routes/rutaAnfiteatro';
import rutaPalco from './routes/rutaPalco';
import rutaPiso from './routes/rutaPiso';
import rutaTicket from './routes/rutaTicket';
import rutaPago from './routes/rutaPago';
import rutaImagenes from './routes/rutaImagenes';
import { supabase } from './supabase';
import { eliminarTicketsExpiradosCron } from './controllers/gestores/ControlTicket';
import { actualizarEstadosEventosCron } from './controllers/gestores/ControlEvento';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/auth', rutaAuth);
app.use('/api/eventos', rutaEvento);
app.use('/api/sitios', rutaSitio);
app.use('/api/anfiteatros', rutaAnfiteatro);
app.use('/api/palcos', rutaPalco);
app.use('/api/pisos', rutaPiso);
app.use('/api/tickets', rutaTicket);
app.use('/api/pago', rutaPago);
app.use('/api/imagenes', rutaImagenes);


app.get('/api/auth/callback', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Redirigiendo...</title></head>
<body>
<script>
(function() {
  var hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    var params = new URLSearchParams(hash.replace('#', '?'));
    var accessToken = params.get('access_token');
    if (accessToken) {
      try {
        var base64Url = accessToken.split('.')[1];
        var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        var payload = JSON.parse(atob(base64));
        var uid = payload.sub;
        var email = payload.email || '';
        if (uid) {
          localStorage.setItem('token', accessToken);
          localStorage.setItem('usuarioId', uid);
          localStorage.setItem('userEmail', email);
          fetch('/api/auth/verificar-usuario-oauth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId: uid, email: email })
          }).then(function(r) { return r.json(); }).then(function(d) {
            if (d.role) localStorage.setItem('userRole', d.role);
            window.location.href = '/main';
          }).catch(function(e) { console.error(e); window.location.href = '/main'; });
        }
      } catch(e) {
        console.error('Error al procesar el token:', e);
        window.location.href = '/login?error=auth';
      }
    } else {
      window.location.href = '/login';
    }
  } else {
    window.location.href = '/login';
  }
})();
</script>
</body>
</html>`);
});

app.get('/config/stripe-key', (req, res) => {
    res.json({ publicKey: process.env.STRIPE_PUBLISHABLE });
});

app.get('/api/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL,
        supabasePublishableKey: process.env.SUPABASE_KEY,
    });
});

app.use(express.static(path.join(__dirname, '../front'))); 

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../front/html/guest.html'));
});

app.get('/main', (req, res) => {
    res.sendFile(path.join(__dirname, '../front/html/main.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../front/html/login.html'));
});

app.get('/guest', (req, res) => {
    res.sendFile(path.join(__dirname, '../front/html/guest.html'));
});

app.get('/recuperar-contrasena', (req, res) => {
    res.sendFile(path.join(__dirname, '../front/html/reset-password.html'));
});

app.get('/registro', (req, res) => {
    res.sendFile(path.join(__dirname, '../front/html/register.html')); 
});

app.get('/adminmain', (req, res) => {
    res.sendFile(path.join(__dirname, '../front/html/adminmain.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../front/html/admin.html'));
});

app.get('/tickets', (req, res) => {
    res.sendFile(path.join(__dirname, '../front/html/tickets.html'));
});

app.post('/api/auth/verificar-usuario-oauth', async (req, res) => {
  const { usuarioId, email } = req.body;
  if (!usuarioId) return res.status(400).json({ error: 'usuarioId requerido' });
  try {
    const { data: existente } = await supabase
      .from('Auth_Users')
      .select('id, rol')
      .eq('id', usuarioId)
      .maybeSingle();
    if (!existente) {
      await supabase
        .from('Auth_Users')
        .insert({ id: usuarioId, email: email || '', rol: 'client' });
      return res.json({ success: true, role: 'client' });
    }
    res.json({ success: true, role: existente.rol || 'client' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/verificar-admin', async (req, res) => {
    const { usuarioId } = req.body;
    if (!usuarioId) {
        res.status(400).json({ admin: false });
        return;
    }
    try {
        const { data } = await supabase
            .from('Auth_Users')
            .select('rol')
            .eq('id', usuarioId)
            .maybeSingle();

        const isAdmin = data?.rol === 'admin' || data?.rol === 'employee';
        res.json({ admin: isAdmin });
    } catch {
        res.json({ admin: false });
    }
});

const startServer = (port: number) => {
    const server = app.listen(port, () => {
        console.log(`Servidor corriendo en http://localhost:${port}`);
    });

    server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`El puerto ${port} está ocupado, probando con el ${port + 1}...`);
            startServer(port + 1); 
        } else {
            console.error('Error al iniciar el servidor:', err);
        }
    });

    setInterval(eliminarTicketsExpiradosCron, 3 * 60 * 1000);
    console.log('[Cron] Limpieza de tickets expirados cada 3 minutos');

    setInterval(actualizarEstadosEventosCron, 3 * 60 * 1000);
    console.log('[Cron] Estados de eventos cada 3 minutos');
};

startServer(Number(PORT));