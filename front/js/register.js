const formRegistro = document.getElementById('formRegistro');
const mensajeError = document.getElementById('mensajeError');
const btnLogin = document.getElementById('btnLogin');

btnLogin.addEventListener('click', () => {
    window.location.href = '/'; 
});

formRegistro.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('emailUsuario').value;
    const password = document.getElementById('passwordUsuario').value;

    try {
        const respuesta = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const datos = await respuesta.json();
        console.log('Respuesta:', datos);

        if (respuesta.ok) {
            alert('Usuario registrado con éxito. Ahora puedes iniciar sesión.');
            window.location.href = '/'; 
        } else {
            throw new Error(datos.error || datos.mensaje || "Error al registrarse");
        }

    } catch (error) {
        mensajeError.style.display = 'block';
        mensajeError.textContent = error.message;
        console.error('Error:', error);
    }
});