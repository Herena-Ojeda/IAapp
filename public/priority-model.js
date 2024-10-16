let encoder;

async function loadModel() {
    encoder = await use.load();
    console.log('Modelo cargado');
}

async function predictPriority(text) {
    if (!encoder) {
        console.log('Modelo no cargado, cargando ahora...');
        await loadModel();
    }
    
    const embeddings = await encoder.embed(text);
    const embeddingArray = await embeddings.array();
    const average = embeddingArray[0].reduce((a, b) => a + b, 0) / embeddingArray[0].length;
    
    if (average > 0.1) return 'alta';
    if (average > 0) return 'media';
    return 'baja';
}

loadModel();