console.log('script.js cargado');

// Inicializa una lista de tareas
let tasks = [];

// Función para guardar las tareas en localStorage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Función para cargar las tareas desde localStorage
function loadTasks() {
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
    }
}

// Ejecuta el código cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('taskForm');
    const tasksContainer = document.getElementById('tasksContainer');
    const reportContent = document.getElementById('reportContent');

    loadTasks(); // Cargar las tareas guardadas
    displayTasks(); // Mostrar las tareas cargadas

    taskForm.addEventListener('submit', addTask);
    
    console.log('DOM cargado');
    console.log('Elementos del DOM:', { taskForm, tasksContainer, reportContent });
    console.log('Event listener de submit añadido');

    const generateWeeklyPlanBtn = document.getElementById('generateWeeklyPlanBtn');
    generateWeeklyPlanBtn.addEventListener('click', displayWeeklyPlan);

    const checkRecurringTasksBtn = document.getElementById('checkRecurringTasksBtn');
    checkRecurringTasksBtn.addEventListener('click', suggestRecurringTasks);

    displayTaskTemplates(); // Mostrar plantillas existentes al cargar la página

    const suggestGroupsBtn = document.getElementById('suggestGroupsBtn');
    suggestGroupsBtn.addEventListener('click', suggestTaskGroups);

    const generateReportBtn = document.getElementById('generateReportBtn');
    generateReportBtn.addEventListener('click', generateProductivityReport);

    const voiceAssistantBtn = document.getElementById('voiceAssistantBtn');
    voiceAssistantBtn.addEventListener('click', startListening);

    setupSpeechRecognition();
});

// Función para agregar una nueva tarea
async function addTask(event) {
    event.preventDefault();

    const taskName = document.getElementById('taskName').value;
    const taskDeadline = document.getElementById('taskDeadline').value;
    const taskDescription = document.getElementById('taskDescription').value || '';
    const taskPriority = document.getElementById('taskPriority').value;
    let taskTimeEstimate = document.getElementById('taskTimeEstimate').value;
    const subtasksContainer = document.getElementById('subtasksContainer');
    const subtasks = Array.from(subtasksContainer.querySelectorAll('input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.value);

    if (!taskPriority) {
        alert('Por favor, selecciona una prioridad para la tarea.');
        return;
    }

    if (!taskTimeEstimate) {
        const suggestedTime = await getTimeEstimate(`${taskName} ${taskDescription}`);
        const userConfirmed = confirm(`La IA sugiere una estimación de ${suggestedTime} minutos para esta tarea. ¿Quieres usar esta estimación?`);
        if (userConfirmed) {
            taskTimeEstimate = suggestedTime;
        } else {
            alert('Por favor, ingresa una estimación de tiempo para la tarea.');
            return;
        }
    }

    console.log('Añadiendo tarea:', { taskName, taskDeadline, taskDescription, taskPriority, taskTimeEstimate, subtasks });

    const newTask = {
        name: taskName,
        deadline: taskDeadline,
        description: taskDescription,
        priority: taskPriority,
        timeEstimate: parseInt(taskTimeEstimate),
        completed: false,
        subtasks: subtasks.map(subtask => ({ name: subtask, completed: false }))
    };

    tasks.push(newTask);
    saveTasks();
    displayTasks();
    suggestTaskGroups(); // Actualizar sugerencias de grupos
    speakText(`Tarea aadida: ${newTask.name}`);
    event.target.reset();
}

async function analyzePriority(name, description, deadline) {
    const text = `Nombre: ${name}. Descripción: ${description}. Fecha límite: ${deadline}`;
    try {
        const priority = await predictPriority(text);
        return priority;
    } catch (error) {
        console.error('Error al analizar la prioridad:', error);
        return assignLocalPriority(name, deadline);
    }
}

function assignLocalPriority(name, deadline) {
    const today = new Date();
    const taskDate = new Date(deadline);
    const daysUntilDeadline = Math.ceil((taskDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilDeadline <= 3) return 'alta';
    if (daysUntilDeadline <= 7) return 'media';
    return 'baja';
}

// Función para mostrar las tareas en la interfaz de usuario
function displayTasks() {
    const tasksContainer = document.getElementById('tasksContainer');
    tasksContainer.innerHTML = '';

    const groupedTasks = {};
    tasks.forEach(task => {
        if (task.group) {
            if (!groupedTasks[task.group]) {
                groupedTasks[task.group] = [];
            }
            groupedTasks[task.group].push(task);
        } else {
            if (!groupedTasks['Sin grupo']) {
                groupedTasks['Sin grupo'] = [];
            }
            groupedTasks['Sin grupo'].push(task);
        }
    });

    for (const [groupName, groupTasks] of Object.entries(groupedTasks)) {
        const groupContainer = document.createElement('div');
        groupContainer.className = 'task-group';
        groupContainer.innerHTML = `<h3>${groupName}</h3>`;

        groupTasks.forEach((task, index) => {
            const taskItem = document.createElement('div');
            taskItem.className = 'task-item';
            taskItem.innerHTML = `
                <input type="checkbox" id="task${index}" ${task.completed ? 'checked' : ''} onchange="toggleTaskStatus(${index})">
                <label for="task${index}">
                    <strong>${task.name}</strong> - 
                    Prioridad: ${task.priority}, 
                    Fecha límite: ${task.deadline}
                    ${task.description ? `<p>${task.description}</p>` : ''}
                </label>
                <button onclick="editTask(${index})">Editar</button>
                <button onclick="deleteTask(${index})">Eliminar</button>
            `;
            groupContainer.appendChild(taskItem);
        });

        tasksContainer.appendChild(groupContainer);
    }

    // Agregar la sección de sugerencias de agrupaciones después de las tareas
    const groupSuggestionsSection = document.getElementById('groupSuggestionsSection');
    tasksContainer.appendChild(groupSuggestionsSection);

    updateReport();
}

// Función para eliminar una tarea
function deleteTask(index) {
    tasks.splice(index, 1);
    saveTasks(); // Guardar las tareas después de eliminar una
    displayTasks();
}

// Función para editar una tarea
function editTask(index) {
    // Implementa la lógica para editar una tarea
}

// Función para actualizar el reporte de productividad
function updateReport() {
    const reportContent = document.getElementById('reportContent');
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const pendingTasks = totalTasks - completedTasks;

    reportContent.innerHTML = `
        <h2>Informe de Tareas</h2>
        <p>Total de tareas: ${totalTasks}</p>
        <p>Tareas completadas: ${completedTasks}</p>
        <p>Tareas pendientes: ${pendingTasks}</p>
    `;
}

// Función para depuración
function logTasks() {
    console.log('Tareas actuales:', tasks);
}

function toggleTaskStatus(index) {
    tasks[index].completed = !tasks[index].completed;
    if (tasks[index].completed) {
        tasks[index].completedDate = new Date().toISOString();
    } else {
        delete tasks[index].completedDate;
    }
    saveTasks();
    displayTasks();
    updateReport();
}

let currentSort = 'deadline'; // Valor por defecto

function sortTasks(criteria) {
    currentSort = criteria;
    tasks.sort((a, b) => {
        switch (criteria) {
            case 'deadline':
                return new Date(a.deadline) - new Date(b.deadline);
            case 'priority':
                const priorityOrder = { 'alta': 0, 'media': 1, 'baja': 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            case 'status':
                return a.completed === b.completed ? 0 : a.completed ? 1 : -1;
            default:
                return 0;
        }
    });
    saveTasks(); // Guardar el nuevo orden
    displayTasks();
}

async function getAISuggestion(text) {
    const embeddings = await encoder.embed(text);
    const embeddingArray = await embeddings.array();
    const average = embeddingArray[0].reduce((a, b) => a + b, 0) / embeddingArray[0].length;
    
    if (average > 0.1) return 'alta';
    if (average > 0) return 'media';
    return 'baja';
}

async function getTimeEstimate(text) {
    const words = text.split(' ').length;
    let estimate = Math.round(words * 0.5); // 0.5 minutos por palabra
    estimate = Math.max(5, Math.min(480, estimate)); // Entre 5 minutos y 8 horas
    return estimate;
}

async function suggestSubtasks(taskName, taskDescription) {
    const combinedText = `${taskName} ${taskDescription}`.toLowerCase();
    let subtasks = [];

    // Objeto con diferentes categorías de tareas y sus subtareas correspondientes
    const taskCategories = {
        'informe': ['Recopilar datos', 'Analizar informacin', 'Redactar borrador', 'Revisar y editar', 'Finalizar y entregar'],
        'proyecto': ['Definir objetivos', 'Planificar etapas', 'Asignar recursos', 'Ejecutar plan', 'Monitorear progreso', 'Evaluar resultados'],
        'presentación': ['Investigar tema', 'Crear esquema', 'Diseñar diapositivas', 'Preparar notas', 'Ensayar presentación'],
        'investigación': ['Definir pregunta de investigación', 'Revisar literatura existente', 'Diseñar metodología', 'Recopilar datos', 'Analizar resultados', 'Escribir conclusiones'],
        'evento': ['Definir fecha y lugar', 'Crear lista de invitados', 'Planificar logística', 'Preparar materiales', 'Enviar invitaciones', 'Confirmar asistencia'],
        'desarrollo': ['Analizar requisitos', 'Diseñar solución', 'Implementar código', 'Realizar pruebas', 'Depurar errores', 'Documentar'],
        'marketing': ['Analizar mercado objetivo', 'Desarrollar estrategia', 'Crear contenido', 'Implementar campaña', 'Medir resultados', 'Ajustar estrategia'],
        'viaje': ['Investigar destino', 'Planificar itinerario', 'Reservar transporte y alojamiento', 'Preparar documentos', 'Hacer maletas', 'Confirmar reservas']
    };

    // Verificar si la tarea coincide con alguna categoría
    for (let category in taskCategories) {
        if (combinedText.includes(category)) {
            subtasks = taskCategories[category];
            break;
        }
    }

    // Si no hay coincidencias específicas, generar subtareas basadas en palabras clave
    if (subtasks.length === 0) {
        if (combinedText.includes('escribir') || combinedText.includes('redactar')) {
            subtasks = ['Hacer esquema', 'Escribir borrador', 'Revisar contenido', 'Editar y corregir', 'Finalizar documento'];
        } else if (combinedText.includes('comprar') || combinedText.includes('adquirir')) {
            subtasks = ['Investigar opciones', 'Comparar precios', 'Leer reseñas', 'Tomar decisión', 'Realizar compra'];
        } else if (combinedText.includes('aprender') || combinedText.includes('estudiar')) {
            subtasks = ['Definir objetivos de aprendizaje', 'Buscar recursos', 'Crear plan de estudio', 'Practicar regularmente', 'Evaluar progreso'];
        } else {
            // Si aún no hay coincidencias, sugerir pasos genéricos
            subtasks = ['Planificar', 'Investigar', 'Ejecutar', 'Revisar', 'Finalizar'];
        }
    }

    // Agregar algunas subtareas aleatorias adicionales para mayor variedad
    const additionalSubtasks = [
        'Consultar con colegas',
        'Establecer plazos intermedios',
        'Preparar informe de avance',
        'Realizar seguimiento',
        'Solicitar feedback',
        'Actualizar stakeholders',
        'Documentar proceso',
        'Identificar posibles obstáculos',
        'Crear plan de contingencia',
        'Celebrar logros intermedios'
    ];

    // Agregar 2-3 subtareas adicionales aleatorias
    const numberOfAdditional = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < numberOfAdditional; i++) {
        const randomSubtask = additionalSubtasks[Math.floor(Math.random() * additionalSubtasks.length)];
        if (!subtasks.includes(randomSubtask)) {
            subtasks.push(randomSubtask);
        }
    }

    // Mezclar el orden de las subtareas para mayor variedad
    return subtasks.sort(() => Math.random() - 0.5);
}

document.getElementById('suggestSubtasksBtn').addEventListener('click', async () => {
    const taskName = document.getElementById('taskName').value;
    const taskDescription = document.getElementById('taskDescription').value;
    const suggestedSubtasks = await suggestSubtasks(taskName, taskDescription);
    const subtasksContainer = document.getElementById('subtasksContainer');
    subtasksContainer.innerHTML = suggestedSubtasks.map((subtask, index) => `
        <div>
            <input type="checkbox" id="suggestedSubtask${index}" value="${subtask}">
            <label for="suggestedSubtask${index}">${subtask}</label>
        </div>
    `).join('');
});

function toggleSubtaskStatus(taskIndex, subtaskIndex) {
    tasks[taskIndex].subtasks[subtaskIndex].completed = !tasks[taskIndex].subtasks[subtaskIndex].completed;
    saveTasks();
    displayTasks();
}

function generateWeeklyPlan() {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));

    // Inicializar el plan semanal con todas las fechas
    const weekPlan = {};
    for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(day.getDate() + i);
        weekPlan[day.toDateString()] = [];
    }

    // Filtrar tareas para esta semana
    const thisWeekTasks = tasks.filter(task => {
        const taskDate = new Date(task.deadline);
        return taskDate >= startOfWeek && taskDate <= endOfWeek && !task.completed;
    });

    // Analizar patrones de productividad (simplificado)
    const productivityPattern = analyzeProductivityPattern();

    // Distribuir tareas basándose en prioridad, fecha límite y patrón de productividad
    thisWeekTasks.sort((a, b) => {
        if (a.priority !== b.priority) {
            return ['alta', 'media', 'baja'].indexOf(a.priority) - ['alta', 'media', 'baja'].indexOf(b.priority);
        }
        return new Date(a.deadline) - new Date(b.deadline);
    });

    thisWeekTasks.forEach(task => {
        const taskDate = new Date(task.deadline);
        const dayKey = taskDate.toDateString();
        if (weekPlan[dayKey]) {
            weekPlan[dayKey].push(task);
        } else {
            // Si la fecha límite es después de esta semana, asignar al día más productivo
            const mostProductiveDay = Object.keys(productivityPattern).reduce((a, b) => productivityPattern[a] > productivityPattern[b] ? a : b);
            weekPlan[mostProductiveDay].push(task);
        }
    });

    return weekPlan;
}

function analyzeProductivityPattern() {
    // En una implementación real, esto analizaría el historial de tareas completadas
    // Por ahora, usaremos un patrón ficticio
    return {
        'Mon': 0.8,
        'Tue': 0.9,
        'Wed': 0.7,
        'Thu': 0.85,
        'Fri': 0.75,
        'Sat': 0.5,
        'Sun': 0.4
    };
}

function displayWeeklyPlan() {
    const weekPlan = generateWeeklyPlan();
    const planContainer = document.getElementById('weeklyPlanContainer');
    planContainer.innerHTML = '<h2>Plan Semanal Recomendado</h2>';

    const calendarContainer = document.createElement('div');
    calendarContainer.className = 'calendar-container';

    const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    // Crear encabezados de días
    const headerRow = document.createElement('div');
    headerRow.className = 'calendar-row header';
    daysOfWeek.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-cell header';
        dayHeader.textContent = day;
        headerRow.appendChild(dayHeader);
    });
    calendarContainer.appendChild(headerRow);

    // Crear celdas de días con tareas
    const taskRow = document.createElement('div');
    taskRow.className = 'calendar-row tasks';
    Object.entries(weekPlan).forEach(([date, dayTasks]) => {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-cell';
        const dateObj = new Date(date);
        dayCell.innerHTML = `<strong>${dateObj.getDate()}/${dateObj.getMonth() + 1}</strong>`;
        
        if (dayTasks.length > 0) {
            const taskList = document.createElement('ul');
            dayTasks.forEach(task => {
                const taskItem = document.createElement('li');
                taskItem.textContent = `${task.name} (${task.priority})`;
                taskList.appendChild(taskItem);
            });
            dayCell.appendChild(taskList);
        } else {
            dayCell.innerHTML += '<p>Sin tareas</p>';
        }
        taskRow.appendChild(dayCell);
    });
    calendarContainer.appendChild(taskRow);

    planContainer.appendChild(calendarContainer);
}

function detectRecurringTasks() {
    const taskFrequency = {};
    const recurringThreshold = 3; // Número de veces que una tarea debe aparecer para ser considerada recurrente

    tasks.forEach(task => {
        const taskKey = `${task.name.toLowerCase()}-${task.priority}`;
        if (taskFrequency[taskKey]) {
            taskFrequency[taskKey].count++;
            taskFrequency[taskKey].tasks.push(task);
        } else {
            taskFrequency[taskKey] = { count: 1, tasks: [task] };
        }
    });

    const recurringTasks = Object.entries(taskFrequency)
        .filter(([_, data]) => data.count >= recurringThreshold)
        .map(([key, data]) => ({
            name: data.tasks[0].name,
            priority: data.tasks[0].priority,
            count: data.count,
            averageTimeEstimate: data.tasks.reduce((sum, task) => sum + task.timeEstimate, 0) / data.count
        }));

    return recurringTasks;
}

function suggestRecurringTasks() {
    const recurringTasks = detectRecurringTasks();
    const suggestionsContainer = document.getElementById('recurringTasksSuggestions');
    suggestionsContainer.innerHTML = '<h3>Sugerencias de Tareas Recurrentes</h3>';

    if (recurringTasks.length === 0) {
        suggestionsContainer.innerHTML += '<p>No se han detectado tareas recurrentes aún.</p>';
        return;
    }

    const suggestionsList = document.createElement('ul');
    recurringTasks.forEach(task => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <strong>${task.name}</strong> (Prioridad: ${task.priority})
            <br>Detectada ${task.count} veces, tiempo promedio: ${Math.round(task.averageTimeEstimate)} minutos
            <br><button onclick="createTaskTemplate('${task.name}', '${task.priority}', ${task.averageTimeEstimate})">Crear Plantilla</button>
        `;
        suggestionsList.appendChild(listItem);
    });

    suggestionsContainer.appendChild(suggestionsList);
}

function createTaskTemplate(name, priority, timeEstimate) {
    const template = {
        name: name,
        priority: priority,
        timeEstimate: timeEstimate
    };

    // Guardar la plantilla (podrías almacenarla en localStorage o en tu backend)
    let templates = JSON.parse(localStorage.getItem('taskTemplates')) || [];
    templates.push(template);
    localStorage.setItem('taskTemplates', JSON.stringify(templates));

    alert(`Plantilla creada para la tarea: ${name}`);
    displayTaskTemplates(); // Actualizar la lista de plantillas mostradas
}

function displayTaskTemplates() {
    const templates = JSON.parse(localStorage.getItem('taskTemplates')) || [];
    const templatesContainer = document.getElementById('taskTemplatesContainer');
    templatesContainer.innerHTML = '<h3>Plantillas de Tareas</h3>';

    if (templates.length === 0) {
        templatesContainer.innerHTML += '<p>No hay plantillas de tareas disponibles.</p>';
        return;
    }

    const templatesList = document.createElement('ul');
    templates.forEach((template, index) => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <strong>${template.name}</strong> (Prioridad: ${template.priority}, Tiempo estimado: ${Math.round(template.timeEstimate)} minutos)
            <button onclick="useTaskTemplate(${index})">Usar</button>
        `;
        templatesList.appendChild(listItem);
    });

    templatesContainer.appendChild(templatesList);
}

function useTaskTemplate(index) {
    const templates = JSON.parse(localStorage.getItem('taskTemplates')) || [];
    const template = templates[index];

    document.getElementById('taskName').value = template.name;
    document.getElementById('taskPriority').value = template.priority;
    document.getElementById('taskTimeEstimate').value = Math.round(template.timeEstimate);

    alert(`Plantilla aplicada: ${template.name}`);
}

function analyzeProductivity() {
    const completedTasks = tasks.filter(task => task.completed);
    const pendingTasks = tasks.filter(task => !task.completed);

    const totalTasks = tasks.length;
    const completionRate = (completedTasks.length / totalTasks) * 100;

    const priorityCompletion = {
        alta: { completed: 0, total: 0 },
        media: { completed: 0, total: 0 },
        baja: { completed: 0, total: 0 }
    };

    tasks.forEach(task => {
        priorityCompletion[task.priority].total++;
        if (task.completed) {
            priorityCompletion[task.priority].completed++;
        }
    });

    const averageCompletionTime = completedTasks.reduce((sum, task) => sum + task.timeEstimate, 0) / completedTasks.length;

    const mostProductiveDay = getMostProductiveDay(completedTasks);

    const overdueTasks = pendingTasks.filter(task => new Date(task.deadline) < new Date()).length;

    return {
        totalTasks,
        completedTasks: completedTasks.length,
        pendingTasks: pendingTasks.length,
        completionRate,
        priorityCompletion,
        averageCompletionTime,
        mostProductiveDay,
        overdueTasks
    };
}

function getMostProductiveDay(completedTasks) {
    const tasksByDay = completedTasks.reduce((acc, task) => {
        const day = new Date(task.completedDate).toLocaleDateString('es-ES', { weekday: 'long' });
        acc[day] = (acc[day] || 0) + 1;
        return acc;
    }, {});

    return Object.entries(tasksByDay).reduce((a, b) => a[1] > b[1] ? a : b)[0];
}

function generateProductivityReport() {
    const productivity = analyzeProductivity();
    const reportContainer = document.getElementById('productivityReportContainer');
    reportContainer.innerHTML = '<h2>Informe de Productividad</h2>';

    const report = document.createElement('div');
    report.innerHTML = `
        <p>Total de tareas: ${productivity.totalTasks}</p>
        <p>Tareas completadas: ${productivity.completedTasks}</p>
        <p>Tareas pendientes: ${productivity.pendingTasks}</p>
        <p>Tasa de finalización: ${productivity.completionRate.toFixed(2)}%</p>
        <h3>Finalización por prioridad:</h3>
        <ul>
            <li>Alta: ${productivity.priorityCompletion.alta.completed}/${productivity.priorityCompletion.alta.total}</li>
            <li>Media: ${productivity.priorityCompletion.media.completed}/${productivity.priorityCompletion.media.total}</li>
            <li>Baja: ${productivity.priorityCompletion.baja.completed}/${productivity.priorityCompletion.baja.total}</li>
        </ul>
        <p>Tiempo promedio de finalización: ${Math.round(productivity.averageCompletionTime)} minutos</p>
        <p>Día más productivo: ${productivity.mostProductiveDay}</p>
        <p>Tareas atrasadas: ${productivity.overdueTasks}</p>
    `;

    reportContainer.appendChild(report);

    // Generar gráficos
    generateProductivityCharts(productivity);
}

function generateProductivityCharts(productivity) {
    // Gráfico de tareas completadas vs pendientes
    new Chart(document.getElementById('tasksChart'), {
        type: 'pie',
        data: {
            labels: ['Completadas', 'Pendientes'],
            datasets: [{
                data: [productivity.completedTasks, productivity.pendingTasks],
                backgroundColor: ['#36a2eb', '#ff6384']
            }]
        }
    });

    // Gráfico de finalización por prioridad
    new Chart(document.getElementById('priorityChart'), {
        type: 'bar',
        data: {
            labels: ['Alta', 'Media', 'Baja'],
            datasets: [{
                label: 'Completadas',
                data: [
                    productivity.priorityCompletion.alta.completed,
                    productivity.priorityCompletion.media.completed,
                    productivity.priorityCompletion.baja.completed
                ],
                backgroundColor: '#36a2eb'
            }, {
                label: 'Total',
                data: [
                    productivity.priorityCompletion.alta.total,
                    productivity.priorityCompletion.media.total,
                    productivity.priorityCompletion.baja.total
                ],
                backgroundColor: '#ff6384'
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

let recognition;

function setupSpeechRecognition() {
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new window.SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = function(event) {
        const last = event.results.length - 1;
        const command = event.results[last][0].transcript.toLowerCase();
        console.log('Comando reconocido:', command);
        processVoiceCommand(command);
    };

    recognition.onerror = function(event) {
        console.error('Error en el reconocimiento de voz:', event.error);
    };
}

function startListening() {
    recognition.start();
    console.log('Escuchando...');
}

function processVoiceCommand(command) {
    if (command.includes('agregar tarea')) {
        const taskInfo = command.replace('agregar tarea', '').trim();
        const date = extractDateFromCommand(taskInfo);
        const taskName = taskInfo.replace(date, '').trim();
        addTaskByVoice(taskName, date);
    } else if (command.includes('generar informe')) {
        generateProductivityReport();
        speakText('Informe de productividad generado');
    } else if (command.includes('resumen de tareas')) {
        speakTasksSummary();
    } else {
        speakText('Lo siento, no entendí el comando. Por favor, inténtalo de nuevo.');
    }
}

function addTaskByVoice(taskName, deadline) {
    const newTask = {
        name: taskName,
        description: '',
        deadline: deadline,
        priority: 'media',
        completed: false
    };

    tasks.push(newTask);
    saveTasks();
    displayTasks();
    speakText(`Tarea añadida: ${taskName} para el ${formatDate(deadline)}`);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function speakTasksSummary() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const pendingTasks = totalTasks - completedTasks;

    const summary = `Tienes un total de ${totalTasks} tareas. 
                     ${completedTasks} tareas completadas y 
                     ${pendingTasks} tareas pendientes.`;

    speakText(summary);
}

function speakText(text) {
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = 'es-ES';
    window.speechSynthesis.speak(speech);
}

function extractDateFromCommand(command) {
    const dateKeywords = {
        'hoy': 0,
        'mañana': 1,
        'pasado mañana': 2
    };

    const dateRegex = /\b(\d{1,2})\s+de\s+(\w+)(?:\s+(?:de|del)?\s+(\d{4}))?\b/i;
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    for (const [keyword, daysToAdd] of Object.entries(dateKeywords)) {
        if (command.includes(keyword)) {
            const date = new Date();
            date.setDate(date.getDate() + daysToAdd);
            return date.toISOString().split('T')[0];
        }
    }

    const match = command.match(dateRegex);
    if (match) {
        const day = parseInt(match[1]);
        const monthIndex = monthNames.findIndex(month => month.startsWith(match[2].toLowerCase()));
        const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
        if (monthIndex !== -1) {
            return new Date(year, monthIndex, day).toISOString().split('T')[0];
        }
    }

    return new Date().toISOString().split('T')[0]; // Fecha actual por defecto
}

function calculateSimilarity(task1, task2) {
    const text1 = `${task1.name} ${task1.description}`.toLowerCase();
    const text2 = `${task2.name} ${task2.description}`.toLowerCase();

    const words1 = text1.split(/\W+/);
    const words2 = text2.split(/\W+/);

    const commonWords = words1.filter(word => words2.includes(word));
    const similarity = commonWords.length / Math.sqrt(words1.length * words2.length);

    return similarity;
}

function groupSimilarTasks(tasks, similarityThreshold = 0.3) {
    const groups = [];

    tasks.forEach(task => {
        let addedToGroup = false;

        for (const group of groups) {
            const averageSimilarity = group.reduce((sum, groupTask) => 
                sum + calculateSimilarity(task, groupTask), 0) / group.length;

            if (averageSimilarity >= similarityThreshold) {
                group.push(task);
                addedToGroup = true;
                break;
            }
        }

        if (!addedToGroup) {
            groups.push([task]);
        }
    });

    return groups;
}

function suggestTaskGroups() {
    const groups = groupSimilarTasks(tasks);
    const suggestionsContainer = document.getElementById('taskGroupSuggestions');
    suggestionsContainer.innerHTML = '<h3>Sugerencias de Agrupación de Tareas</h3>';

    if (groups.length <= 1) {
        suggestionsContainer.innerHTML += '<p>No se encontraron grupos de tareas similares.</p>';
        return;
    }

    const suggestionsList = document.createElement('ul');
    groups.forEach((group, index) => {
        if (group.length > 1) {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <strong>Grupo ${index + 1}:</strong>
                <ul>
                    ${group.map(task => `<li>${task.name}</li>`).join('')}
                </ul>
                <button onclick="createTaskGroup(${index})">Crear Grupo</button>
            `;
            suggestionsList.appendChild(listItem);
        }
    });

    suggestionsContainer.appendChild(suggestionsList);
}

function createTaskGroup(groupIndex) {
    const groups = groupSimilarTasks(tasks);
    const group = groups[groupIndex];

    const groupName = prompt('Ingrese un nombre para este grupo de tareas:');
    if (groupName) {
        group.forEach(task => {
            task.group = groupName;
        });

        saveTasks();
        displayTasks();
        suggestTaskGroups();
        alert(`Grupo "${groupName}" creado con ${group.length} tareas.`);
    }
}