interface Task {
    id: number;
    text: string;
    completed: boolean;
    reminder: boolean;
    reminderTimerId?: string;
}

const taskInput = document.getElementById('taskInput') as HTMLInputElement;
const addTaskBtn = document.getElementById('addTaskBtn') as HTMLButtonElement;
const taskList = document.getElementById('taskList') as HTMLUListElement;
const filterBtns = document.querySelectorAll('.filter-btn') as NodeListOf<HTMLButtonElement>;
const emptyState = document.getElementById('emptyState') as HTMLDivElement;
const notification = document.getElementById('notification') as HTMLDivElement;
const progressFill = document.getElementById('progressFill') as HTMLDivElement;
const progressText = document.getElementById('progressText') as HTMLSpanElement;
const completedCount = document.getElementById('completedCount') as HTMLSpanElement;
const totalCount = document.getElementById('totalCount') as HTMLSpanElement;
const progressStats = document.getElementById('progressStats') as HTMLDivElement;

let tasks: Task[] = [];
let currentFilter: 'all' | 'active' | 'completed' = 'all';

init();

function init(): void {
    loadTasksFromStorage();

    if (tasks.length === 0) {
        loadTasksFromServer();
    } else {
        renderTasks();
    }

    setupEventListeners();
    updateProgressBar();
    updateAddButtonState();
}

function updateProgressBar(): void {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;

    completedCount.textContent = completedTasks.toString();
    totalCount.textContent = totalTasks.toString();

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

function updateProgressBarColor(percentage: number): void {
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

function setupEventListeners(): void {
    addTaskBtn.addEventListener('click', addTask);

    taskInput.addEventListener('keypress', function(e: KeyboardEvent) {
        if (e.key === 'Enter' && taskInput.value.trim() !== '') {
            addTask();
        }
    });

    taskInput.addEventListener('input', updateAddButtonState);
    taskInput.addEventListener('focus', updateAddButtonState);
    taskInput.addEventListener('blur', updateAddButtonState);

    filterBtns.forEach(btn => {
        btn.addEventListener('click', function(this: HTMLButtonElement) {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.getAttribute('data-filter') as 'all' | 'active' | 'completed';
            renderTasks();
        });
    });
}

function updateAddButtonState(): void {
    const isEmpty = taskInput.value.trim() === '';

    if (isEmpty) {
        addTaskBtn.disabled = true;
        addTaskBtn.classList.add('disabled');
        addTaskBtn.title = 'Input is empty';
    } else {
        addTaskBtn.disabled = false;
        addTaskBtn.classList.remove('disabled');
        addTaskBtn.title = 'Add magic task';
    }
}

function loadTasksFromStorage(): void {
    const storedTasks = localStorage.getItem('todoTasks');
    if (storedTasks) {
        tasks = JSON.parse(storedTasks) as Task[];
    }
}

function saveTasksToStorage(): void {
    localStorage.setItem('todoTasks', JSON.stringify(tasks));
}

async function loadTasksFromServer(): Promise<void> {
    try {
        const response = await fetch('https://jsonplaceholder.typicode.com/todos?_limit=5');
        const serverTasks = await response.json();

        tasks = serverTasks.map((task: any) => ({
            id: task.id,
            text: task.title,
            completed: task.completed,
            reminder: false,
            reminderTimerId: undefined
        }));

        saveTasksToStorage();
        renderTasks();
        showNotification('Magic is loaded!');
    } catch (error) {
        console.error('Some problem with magic:', error);
        showNotification('Magic from the server has failed', true);
    }
}

function addTask(): void {
    const text = taskInput.value.trim();

    if (text === '') {
        showNotification('Put the magic down', true);
        return;
    }

    const newTask: Task = {
        id: Date.now(),
        text: text,
        completed: false,
        reminder: false,

    };

    tasks.push(newTask);
    saveTasksToStorage();
    renderTasks();
    updateProgressBar();
    taskInput.value = '';
    updateAddButtonState();
    showNotification('Magic has been added!');
}

function deleteTask(id: number): void {
    const taskToDelete = tasks.find(task => task.id === id);
    if (taskToDelete && taskToDelete.reminderTimerId) {
        const timerId = (window as any)[taskToDelete.reminderTimerId];
        if (timerId) {
            clearTimeout(timerId);
            delete (window as any)[taskToDelete.reminderTimerId];
        }
    }

    tasks = tasks.filter(task => task.id !== id);
    saveTasksToStorage();
    renderTasks();
    updateProgressBar();
    showNotification('Magic has been deleted!');
}

function toggleTaskStatus(id: number): void {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newCompletedStatus = !task.completed;

    tasks = tasks.map(task => {
        if (task.id === id) {
            if (newCompletedStatus && task.reminderTimerId) {
                const timerId = (window as any)[task.reminderTimerId];
                if (timerId) {
                    clearTimeout(timerId);
                    delete (window as any)[task.reminderTimerId];
                }

                const { reminderTimerId, ...rest } = task;
                return {
                    ...rest,
                    completed: newCompletedStatus,
                    reminder: false
                };
            }
            return { ...task, completed: newCompletedStatus };
        }
        return task;
    });

    saveTasksToStorage();
    renderTasks();
    updateProgressBar();
}

function setReminder(id: number): void {
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
    if (task && task.reminder) {
        showNotification('We will remind you of your magical duties!');

        const reminderTimerId = `reminder_${id}`;

        tasks = tasks.map(t => {
            if (t.id === id) {
                return { ...t, reminderTimerId: reminderTimerId };
            }
            return t;
        });

        saveTasksToStorage();

        (window as any)[reminderTimerId] = setTimeout(() => {
            const currentTask = tasks.find(t => t.id === id);
            if (currentTask && !currentTask.completed && currentTask.reminder) {
                showNotification(`Magical reminder: "${currentTask.text}"`);
            }

            tasks = tasks.map(t => {
                if (t.id === id) {

                    return {
                        id: t.id,
                        text: t.text,
                        completed: t.completed,
                        reminder: t.reminder
                    } as Task;
                }
                return t;
            });
            saveTasksToStorage();
        }, 5000);
    } else {
        const taskWithTimer = tasks.find(t => t.id === id);
        if (taskWithTimer && taskWithTimer.reminderTimerId) {
            const timerId = (window as any)[taskWithTimer.reminderTimerId];
            if (timerId) {
                clearTimeout(timerId);
                delete (window as any)[taskWithTimer.reminderTimerId];
            }
        }

        showNotification('Magical reminder has been cancelled');
    }
}

function renderTasks(): void {
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

            const checkbox = taskItem.querySelector('.task-checkbox') as HTMLInputElement;
            const reminderBtn = taskItem.querySelector('.reminder-btn') as HTMLButtonElement;
            const deleteBtn = taskItem.querySelector('.delete-btn') as HTMLButtonElement;

            checkbox.addEventListener('change', () => toggleTaskStatus(task.id));
            reminderBtn.addEventListener('click', () => setReminder(task.id));
            deleteBtn.addEventListener('click', () => deleteTask(task.id));

            taskList.appendChild(taskItem);
        });
    }
}

function showNotification(message: string, isError: boolean = false): void {
    notification.textContent = message;
    notification.style.background = isError
        ? 'linear-gradient(135deg, #b825c9 0%, #b171bb 100%)'
        : 'linear-gradient(135deg, #b825c9 0%, #b171bb 100%)';

    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}