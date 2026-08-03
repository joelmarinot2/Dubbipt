import { initAuth } from './auth.js';
import { parseFile, processWithOllama } from './parser.js';

// Inicializar sistema
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
});

// Lógica del Dropzone
const fileInput = document.getElementById('fileInput');
const loading = document.getElementById('loading');
const resultsDiv = document.getElementById('results');
const loadMsg = document.getElementById('loadMsg');

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    loading.classList.remove('hidden');
    resultsDiv.innerHTML = ''; // Limpiar resultados anteriores

    try {
        loadMsg.textContent = 'Extrayendo texto del archivo...';
        const rawText = await parseFile(file);

        loadMsg.textContent = '🤖 Analizando desglose localmente (Ollama)...';
        const breakdown = await processWithOllama(rawText);

        renderResults(breakdown.personajes);

    } catch (err) {
        alert("Error: " + err.message);
        console.error(err);
    } finally {
        loading.classList.add('hidden');
        fileInput.value = ''; // Resetear input
    }
});

function renderResults(characters) {
    if (!characters || characters.length === 0) {
        resultsDiv.innerHTML = '<p>No se encontraron personajes.</p>';
        return;
    }

    characters.forEach(char => {
        const div = document.createElement('div');
        div.className = 'character-card';
        div.innerHTML = `
            <h3 style="margin:0 0 10px 0; color: var(--accent);">${char.nombre}</h3>
            <p style="margin:5px 0;"><strong>Loops/Takes totales:</strong> ${char.intervenciones_totales}</p>
            <p style="margin:5px 0; font-size: 0.9em; color: #aaa;"><strong>Páginas:</strong> ${char.paginas.join(', ')}</p>
        `;
        resultsDiv.appendChild(div);
    });
}