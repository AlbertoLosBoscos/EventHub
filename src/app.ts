import express from 'express';
import dotenv from 'dotenv';
import path from 'path';

import rutaAuth from './routes/rutaAuth';
import rutaEvento from './routes/rutaEvento';
import rutaSitio from './routes/rutaSitio';
import rutaAnfiteatro from './routes/rutaAnfiteatro';
import rutaPalco from './routes/rutaPalco';
import rutaTicket from './routes/rutaTicket';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/auth', rutaAuth);
app.use('/api/eventos', rutaEvento);
app.use('/api/sitios', rutaSitio);
app.use('/api/anfiteatros', rutaAnfiteatro);
app.use('/api/palcos', rutaPalco);
app.use('/api/tickets', rutaTicket);


app.get('/config/stripe-key', (req, res) => {
    res.json({ publicKey: process.env.STRIPE_PUBLISHABLE });
});

app.use(express.static(path.join(__dirname, '../front'))); 

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../front/html/login.html'));
});

app.get('/registro', (req, res) => {
    res.sendFile(path.join(__dirname, '../front/html/register.html')); 
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
};

startServer(Number(PORT));