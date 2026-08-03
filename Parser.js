pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");
        fullText += `[PÁGINA ${i}]\n${pageText}\n`;
    }
    return fullText;
}

export async function parseFile(file) {
    if (file.name.endsWith('.pdf')) {
        return await extractTextFromPDF(file);
    } else if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    } else {
        throw new Error("Formato no soportado. Usa PDF o DOCX.");
    }
}

export async function processWithOllama(scriptText) {
    // Apuntando al puerto por defecto de Ollama
    const OLLAMA_URL = 'http://localhost:11434/api/generate';
    
    const prompt = `
    Eres un asistente experto en producción de casting y dirección de doblaje. 
    Analiza este guion y devuelve ÚNICAMENTE un objeto JSON válido con la estructura exacta indicada, sin markdown ni explicaciones.
    Estructura requerida:
    {
      "personajes": [
        { "nombre": "NOMBRE", "intervenciones_totales": 0, "paginas": [1, 2] }
      ]
    }
    Guion a analizar:
    ${scriptText.substring(0, 10000)}
    `;

    const response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'llama3', // Asegúrate de tener este modelo instalado localmente o cámbialo por el que uses
            prompt: prompt,
            stream: false,
            format: 'json'
        })
    });

    if (!response.ok) throw new Error("Asegúrate de que Ollama está corriendo en localhost:11434");
    
    const data = await response.json();
    return JSON.parse(data.response);
}