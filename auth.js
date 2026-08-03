import { supabase } from './db.js';

let isLoginMode = true;
const gate = document.getElementById('gate');
const appContainer = document.getElementById('appContainer');

export async function initAuth() {
    // Comprobar si ya hay sesión activa
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        unlockApp();
    }

    // Configurar UI de Auth
    const form = document.getElementById('authForm');
    const errBox = document.getElementById('authErr');
    const submitBtn = document.getElementById('authSubmitBtn');
    
    document.querySelectorAll('#authTabs button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#authTabs button').forEach(b => b.classList.remove('on'));
            e.target.classList.add('on');
            isLoginMode = e.target.dataset.action === 'login';
            submitBtn.textContent = isLoginMode ? 'Entrar' : 'Registrarse';
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errBox.textContent = '';
        submitBtn.disabled = true;

        const email = document.getElementById('userEmail').value.trim();
        const password = document.getElementById('userPass').value;

        try {
            let authResponse;
            if (isLoginMode) {
                authResponse = await supabase.auth.signInWithPassword({ email, password });
            } else {
                authResponse = await supabase.auth.signUp({ email, password });
            }

            if (authResponse.error) throw authResponse.error;
            unlockApp();
        } catch (error) {
            errBox.textContent = error.message;
        } finally {
            submitBtn.disabled = false;
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        lockApp();
    });
}

function unlockApp() {
    gate.classList.add('off');
    document.body.classList.remove('locked');
    appContainer.style.display = 'block';
}

function lockApp() {
    gate.classList.remove('off');
    document.body.classList.add('locked');
    appContainer.style.display = 'none';
    document.getElementById('authForm').reset();
}