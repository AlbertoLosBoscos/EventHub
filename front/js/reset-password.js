const API_BASE = '/api';
const mensajeError = document.getElementById('mensajeError');

document.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token')) {
        mensajeError.style.display = 'block';
        mensajeError.textContent = 'Enlace inválido o expirado. Solicita un nuevo correo de recuperación.';
        return;
    }

    const params = new URLSearchParams(hash.replace('#', '?'));
    const accessToken = params.get('access_token');

    if (!accessToken) {
        mensajeError.style.display = 'block';
        mensajeError.textContent = 'Token no encontrado.';
        return;
    }

    localStorage.setItem('token', accessToken);

    const form = document.getElementById('formResetPassword');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('newPassword').value;

        if (newPassword.length < 6) {
            mensajeError.style.display = 'block';
            mensajeError.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/auth/actualizar-contrasena`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ password: newPassword })
            });

            const data = await res.json();
            if (res.ok) {
                alert('Contraseña actualizada correctamente. Redirigiendo al login...');
                localStorage.removeItem('token');
                window.location.href = '/login';
            } else {
                mensajeError.style.display = 'block';
                mensajeError.textContent = data.error || 'Error al actualizar la contraseña.';
            }
        } catch (error) {
            mensajeError.style.display = 'block';
            mensajeError.textContent = 'Error de conexión.';
        }
    });
});
