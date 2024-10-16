require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/analyze-priority', async (req, res) => {
  try {
    console.log('Solicitud recibida:', req.body);
    const { name, description = '', deadline } = req.body;
    
    const prompt = `Analiza la siguiente tarea y asigna una prioridad (baja, media, alta) basada en su nombre, descripción (si está disponible) y fecha límite:
    Nombre: ${name}
    ${description ? `Descripción: ${description}` : 'No hay descripción disponible.'}
    Fecha límite: ${deadline}
    Ten en cuenta la urgencia implícita en el nombre y la descripción (si está disponible), así como la proximidad de la fecha límite.
    Responde solo con la prioridad asignada en minúsculas: baja, media o alta.`;

    console.log('Prompt generado:', prompt);

    console.log('Iniciando llamada a OpenAI');
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Eres un asistente que analiza tareas y asigna prioridades." },
        { role: "user", content: prompt }
      ],
      max_tokens: 1,
      n: 1,
      temperature: 0.5,
    });
    console.log('Respuesta de OpenAI:', JSON.stringify(response, null, 2));

    const priority = response.choices[0].message.content.trim().toLowerCase();
    console.log('Prioridad asignada:', priority);
    res.json({ priority });
  } catch (error) {
    console.error('Error al analizar la prioridad:', error);
    
    // Función de fallback para asignar prioridad localmente
    const fallbackPriority = assignLocalPriority(req.body.name, req.body.deadline);
    
    res.json({ 
      priority: fallbackPriority,
      note: "Prioridad asignada localmente debido a un error en la API de OpenAI"
    });
  }
});

function assignLocalPriority(name, deadline) {
  const today = new Date();
  const taskDate = new Date(deadline);
  const daysUntilDeadline = Math.ceil((taskDate - today) / (1000 * 60 * 60 * 24));

  if (daysUntilDeadline <= 3) return 'alta';
  if (daysUntilDeadline <= 7) return 'media';
  return 'baja';
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
