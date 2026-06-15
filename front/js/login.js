const formLogin = document.getElementById('formLogin');
const mensajeError = document.getElementById('mensajeError');
const btnRegistro = document.getElementById('btnRegistro');
const btnGitHub = document.getElementById('btnGitHub');
const btnGoogle = document.getElementById('btnGoogle');
const btnMagicLink = document.getElementById('btnMagicLink');

formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('emailUsuario').value;
    const password = document.getElementById('passwordUsuario').value;

    try {
        const respuesta = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const datos = await respuesta.json();

        if (respuesta.ok && datos?.user?.id) {
            localStorage.setItem('usuarioId', datos.user.id);
            localStorage.setItem('userEmail', email);
            if (datos.role) localStorage.setItem('userRole', datos.role);
            if (datos.session?.access_token) localStorage.setItem('token', datos.session.access_token);
            if (datos.role === 'admin') {
                window.location.href = '/adminmain';
            } else {
                window.location.href = '/main';
            }
        } else {
            throw new Error(datos.mensaje || "Credenciales incorrectas o correo no verificado");
        }

    } catch (error) {
        mensajeError.style.display = 'block';
        mensajeError.textContent = error.message;
    }
});

btnRegistro.addEventListener('click', () => {
    window.location.href = '/registro';
});

btnGitHub.addEventListener('click', () => {
    window.location.href = 'http://localhost:3000/api/auth/login/github';
});

btnGoogle.addEventListener('click', () => {
    window.location.href = 'http://localhost:3000/api/auth/login/google';
});

btnRecuperar.addEventListener('click', async () => {
    const email = document.getElementById('emailUsuario').value;

    if (!email) {
        mensajeError.style.display = 'block';
        mensajeError.textContent = 'Introduce tu email primero.';
        return;
    }

    try {
        const res = await fetch('http://localhost:3000/api/auth/recuperar-contrasena', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const datos = await res.json();
        if (res.ok) {
            alert(datos.mensaje);
        } else {
            mensajeError.style.display = 'block';
            mensajeError.textContent = datos.error;
        }
    } catch (error) {
        mensajeError.style.display = 'block';
        mensajeError.textContent = 'Error de conexión.';
    }
});

btnMagicLink.addEventListener('click', async () => {
    const email = document.getElementById('emailUsuario').value;

    if (!email) {
        alert("Por favor, introduce tu email primero.");
        return;
    }

    try {
        const res = await fetch('http://localhost:3000/api/auth/magic-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const datos = await res.json();
        if (res.ok) {
            alert(datos.mensaje); 
        } else {
            alert("Error: " + datos.error);
        }
    } catch (error) {
        console.error("Error en Magic Link:", error);
    }
});

window.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash;
    
    if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.replace('#', '?'));
        const accessToken = params.get('access_token');
        
        if (accessToken) {
            try {
                const base64Url = accessToken.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));

                const payload = JSON.parse(jsonPayload);
                const uid = payload.sub; 

                if (uid) {
                    localStorage.setItem('usuarioId', uid);
                    localStorage.setItem('token', accessToken);
                    fetch('/api/auth/verificar-usuario-oauth', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ usuarioId: uid, email: payload.email || '' })
                    }).then(function(r) { return r.json(); }).then(function(d) {
                        if (d.role) localStorage.setItem('userRole', d.role);
                        window.location.href = '/main';
                    }).catch(function(e) { console.error(e); window.location.href = '/main'; });
                }
            } catch (e) {
                console.error("Error al decodificar el token de acceso:", e);
                mensajeError.style.display = 'block';
                mensajeError.textContent = "Error al iniciar sesión.";
            }
        }
    }
    
    if (window.location.search.includes('error=auth')) {
        mensajeError.style.display = 'block';
        mensajeError.textContent = "La autenticación ha fallado. Por favor, inténtalo de nuevo.";
    }
});