const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');
const filterBtns = document.querySelectorAll('.filter-btn');
const emptyState = document.getElementById('emptyState');
const notification = document.getElementById('notification');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const completedCount = document.getElementById('completedCount');
const totalCount = document.getElementById('totalCount');
const progressStats = document.getElementById('progressStats');

let tasks = [];
let currentFilter = 'all';

init();

function init() {
    loadTasksFromStorage();

    if (tasks.length === 0) {
        loadTasksFromServer();
    } else {
        renderTasks();
    }

    setupEventListeners();
    updateProgressBar();
}

function updateProgressBar() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;

    completedCount.textContent = completedTasks;
    totalCount.textContent = totalTasks;

    const progressPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    progressFill.style.width = `${progressPercentage}%`;
    progressText.textContent = `${progressPercentage}%`;

    updateProgressBarColor(progressPercentage);

    if (progressPercentage === 100 && totalTasks > 0) {
        progressFill.classList.add('completed');
    } else {
        progressFill.classList.remove('completed');
    }

    progressStats.style.display = totalTasks === 0 ? 'none' : 'block';
}

function updateProgressBarColor(percentage) {
    if (percentage === 0) {
        progressFill.style.background = 'linear-gradient(90deg, #e1bee7, #ce93d8)';
    } else if (percentage === 100) {
        progressFill.style.background = 'linear-gradient(90deg, #7b1fa2, #4a148c)';
    } else if (percentage >= 75) {
        progressFill.style.background = 'linear-gradient(90deg, #e1bee7, #ce93d8)';
    } else if (percentage >= 50) {
        progressFill.style.background = 'linear-gradient(90deg, #ba68c8, #ab47bc)';
    } else if (percentage >= 25) {
        progressFill.style.background = 'linear-gradient(90deg, #ce93d8, #ba68c8)';
    } else {
        progressFill.style.background = 'linear-gradient(90deg, #e1bee7, #ce93d8)';
    }
}

function setupEventListeners() {
    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {

            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');


            currentFilter = this.getAttribute('data-filter');
            renderTasks();
        });
    });
}

function loadTasksFromStorage() {
    const storedTasks = localStorage.getItem('todoTasks');
    if (storedTasks) {
        tasks = JSON.parse(storedTasks);
    }
}

function saveTasksToStorage() {
    localStorage.setItem('todoTasks', JSON.stringify(tasks));
}

async function loadTasksFromServer() {
    try {
        const response = await fetch('https://jsonplaceholder.typicode.com/todos?_limit=5');
        const serverTasks = await response.json();


        tasks = serverTasks.map(task => ({
            id: task.id,
            text: task.title,
            completed: task.completed,
            reminder: false
        }));


        saveTasksToStorage();


        renderTasks();


        showNotification('Magic is loaded!');
    } catch (error) {
        console.error('Some problem with magic:', error);
        showNotification('Magic from the server has failed', true);
    }
}

function addTask() {
    const text = taskInput.value.trim();

    if (text === '') {
        showNotification('Put the magic down', true);
        return;
    }


    const newTask = {
        id: Date.now(),
        text: text,
        completed: false,
        reminder: false
    };


    tasks.push(newTask);
    saveTasksToStorage();
    renderTasks();
    updateProgressBar();


    taskInput.value = '';


    showNotification('Magic has been added!');
}

function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    saveTasksToStorage();
    renderTasks();
    updateProgressBar();
    showNotification('Magic has been deleted!');
}

function toggleTaskStatus(id) {
    tasks = tasks.map(task => {
        if (task.id === id) {
            return { ...task, completed: !task.completed };
        }
        return task;
    });

    saveTasksToStorage();
    renderTasks();
    updateProgressBar();
}

function setReminder(id) {
    tasks = tasks.map(task => {
        if (task.id === id) {
            return { ...task, reminder: !task.reminder };
        }
        return task;
    });

    saveTasksToStorage();
    renderTasks();
    updateProgressBar();

    const task = tasks.find(t => t.id === id);
    if (task.reminder) {
        showNotification('We will remind you of your magical duties!');


        setTimeout(() => {
            if (tasks.find(t => t.id === id && !t.completed && t.reminder)) {
                showNotification(`Magical reminder: "${task.text}"`);
            }
        }, 5000);
    } else {
        showNotification('Magical reminder has been cancelled');
    }
}

function renderTasks() {

    let filteredTasks = tasks;

    taskList.innerHTML = '';

    if (currentFilter === 'active') {
        filteredTasks = tasks.filter(task => !task.completed);
    } else if (currentFilter === 'completed') {
        filteredTasks = tasks.filter(task => task.completed);
    }

    if (filteredTasks.length === 0) {
        emptyState.style.display = 'block';
        taskList.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        taskList.style.display = 'block';


        filteredTasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;

            taskItem.innerHTML = `
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                    <span class="task-text ${task.completed ? 'completed' : ''}">${task.text}</span>
                    <div class="task-actions">
                        <button class="action-btn reminder-btn" title="${task.reminder ? 'Cancel your magical reminder' : 'Set a magical reminder'}">
                            ${task.reminder ? '🛎️' : '⌚'}
                        </button>
                        <button class="action-btn delete-btn">🦝</button>
                    </div>
                `;

            const checkbox = taskItem.querySelector('.task-checkbox');
            const reminderBtn = taskItem.querySelector('.reminder-btn');
            const deleteBtn = taskItem.querySelector('.delete-btn');

            checkbox.addEventListener('change', () => toggleTaskStatus(task.id));
            reminderBtn.addEventListener('click', () => setReminder(task.id));
            deleteBtn.addEventListener('click', () => deleteTask(task.id));

            taskList.appendChild(taskItem);
        });
    }
}

function showNotification(message, isError = false) {
    notification.textContent = message;
    notification.style.background = isError
        ? 'linear-gradient(135deg, #b825c9 0%, #b171bb 100%)'
        : 'linear-gradient(135deg, #b825c9 0%, #b171bb 100%)';

    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}


