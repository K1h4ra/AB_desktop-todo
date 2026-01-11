// Desktop Todo Widget - Main Application Logic
class TodoWidget {
    constructor() {
        this.tasks = [];
        this.currentTheme = 'dark';
        this.isAlwaysOnTop = true;
        this.opacity = 80;
        this.editMode = false;
        this.editingTaskId = null;
        this.editingSubtaskIndex = null;
        this.draggedTaskId = null;
        this.dragOverTaskId = null;
        this.draggedSubtaskIndex = null;
        this.dragOverSubtaskIndex = null;
        
        this.init();
    }
    
    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        await this.loadTasks();
        this.updateUI();
        this.applyTheme();
        this.applyOpacity();
        this.setupNotificationListeners();
    }
    
    async loadSettings() {
        try {
            this.currentTheme = await window.electronAPI.getStoreValue('theme', 'dark');
            this.isAlwaysOnTop = await window.electronAPI.getStoreValue('alwaysOnTop', true);
            this.opacity = await window.electronAPI.getStoreValue('opacity', 80);
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
    
    async loadTasks() {
        try {
            this.tasks = await window.electronAPI.getStoreValue('tasks', []);
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.tasks = [];
        }
    }
    
    async saveTasks() {
        try {
            await window.electronAPI.setStoreValue('tasks', this.tasks);
        } catch (error) {
            console.error('Error saving tasks:', error);
        }
    }
    
    setupEventListeners() {
        // Task input handlers
        const taskInput = document.getElementById('taskInput');
        const addBtn = document.getElementById('addBtn');
        
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && taskInput.value.trim()) {
                this.addTask(taskInput.value.trim());
                taskInput.value = '';
            }
        });
        
        addBtn.addEventListener('click', () => {
            if (taskInput.value.trim()) {
                this.addTask(taskInput.value.trim());
                taskInput.value = '';
            }
        });
        
        // Window control handlers
        document.getElementById('minimizeBtn').addEventListener('click', () => {
            window.electronAPI.minimizeWindow();
        });
        
        document.getElementById('closeBtn').addEventListener('click', () => {
            window.electronAPI.closeWindow();
        });
        
        document.getElementById('alwaysOnTopBtn').addEventListener('click', async () => {
            this.isAlwaysOnTop = await window.electronAPI.toggleAlwaysOnTop();
            this.updateAlwaysOnTopButton();
        });
        
        document.getElementById('themeBtn').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        document.getElementById('clearCompletedBtn').addEventListener('click', () => {
            this.clearCompleted();
        });
        
        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', () => {
            window.electronAPI.navigateToSettings();
        });
        
        // Edit task button
        document.getElementById('editTaskBtn').addEventListener('click', () => {
            this.toggleEditMode();
        });
        
        // Focus management
        taskInput.addEventListener('focus', () => {
            taskInput.select();
        });
        
        // Auto-focus on app activation
        window.addEventListener('focus', () => {
            if (!taskInput.matches(':focus')) {
                taskInput.focus();
            }
        });
    }
    
    setupNotificationListeners() {
        // Listen for opacity updates from settings window
        window.electronAPI.onOpacityUpdated((event, opacity) => {
            this.opacity = opacity;
            this.applyOpacity();
        });
        
        // Listen for theme updates from settings window
        window.electronAPI.onThemeUpdated((event, theme) => {
            this.currentTheme = theme;
            this.applyTheme();
            this.applyOpacity();
        });
        
        // Clean up listeners when window is about to close
        window.addEventListener('beforeunload', () => {
            window.electronAPI.removeAllListeners('opacity-updated');
            window.electronAPI.removeAllListeners('theme-updated');
        });
    }
    
    addTask(text) {
        // Get selected task type
        const taskType = document.querySelector('input[name="taskType"]:checked').value;
        
        const task = {
            id: Date.now() + Math.random(),
            text: text,
            type: taskType,
            completed: false,
            createdAt: new Date().toISOString(),
            // Only add subtasks array for multi-task type
            subtasks: taskType === 'multi' ? [] : undefined,
            // Add expanded state for multi-task type
            expanded: taskType === 'multi' ? false : undefined
        };
        
        this.tasks.unshift(task);
        this.saveTasks();
        this.updateUI();
        
        // Add animation to new task
        setTimeout(() => {
            const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
            if (taskElement) {
                taskElement.classList.add('slide-in');
            }
        }, 10);
    }
    
    toggleTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            this.saveTasks();
            
            // Add completion animation
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            if (taskElement && task.completed) {
                taskElement.classList.add('task-complete');
                setTimeout(() => taskElement.classList.remove('task-complete'), 300);
            }
            
            this.updateUI();
        }
    }
    
    deleteTask(taskId) {
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            taskElement.classList.add('fade-out');
            setTimeout(() => {
                this.tasks = this.tasks.filter(t => t.id !== taskId);
                this.saveTasks();
                this.updateUI();
            }, 200);
        }
    }
    
    // Edit mode functions
    toggleEditMode() {
        if (this.editMode) {
            this.exitEditMode();
        } else {
            this.enterEditMode();
        }
    }
    
    enterEditMode() {
        this.editMode = true;
        this.editingTaskId = null;
        
        // Update UI to show edit mode
        const editBtn = document.getElementById('editTaskBtn');
        editBtn.classList.add('bg-blue-500/20', 'text-blue-500');
        editBtn.title = 'Exit Edit Mode (Click a task to edit)';
        
        // Add visual indicator to all tasks
        this.tasks.forEach(task => {
            const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
            if (taskElement) {
                taskElement.classList.add('cursor-pointer', 'ring-2', 'ring-blue-500/50');
                taskElement.title = 'Click to edit this task';
            }
        });
        
        // Show notification
        this.showEditModeNotification(true);
    }
    
    exitEditMode() {
        this.editMode = false;
        this.editingTaskId = null;
        
        // Update UI to hide edit mode
        const editBtn = document.getElementById('editTaskBtn');
        editBtn.classList.remove('bg-blue-500/20', 'text-blue-500');
        editBtn.title = 'Edit Task';
        
        // Remove visual indicators from all tasks
        this.tasks.forEach(task => {
            const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
            if (taskElement) {
                taskElement.classList.remove('cursor-pointer', 'ring-2', 'ring-blue-500/50');
                taskElement.title = '';
            }
        });
        
        // Hide notification
        this.showEditModeNotification(false);
    }
    
    selectTaskForEdit(taskId, subtaskIndex = null) {
        if (!this.editMode) return;
        
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        this.editingTaskId = taskId;
        this.editingSubtaskIndex = subtaskIndex;
        
        // Update UI to show selected task or subtask
        this.tasks.forEach(t => {
            const taskElement = document.querySelector(`[data-task-id="${t.id}"]`);
            if (taskElement) {
                if (t.id === taskId) {
                    taskElement.classList.add('ring-2', 'ring-blue-500');
                } else {
                    taskElement.classList.remove('ring-2', 'ring-blue-500');
                }
            }
        });
        
        // Show edit input for the selected task or subtask
        this.showEditInputForTask(task, subtaskIndex);
    }
    
    showEditInputForTask(task, subtaskIndex = null) {
        const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
        if (!taskElement) return;
        
        let textElement;
        let targetText;
        let targetContainer;
        
        if (subtaskIndex !== null) {
            // Editing a subtask
            const subtaskItem = taskElement.querySelector(`[data-subtask-index="${subtaskIndex}"]`);
            if (!subtaskItem) return;
            
            textElement = subtaskItem.querySelector('p');
            if (!textElement) return;
            
            targetText = task.subtasks[subtaskIndex].text;
            targetContainer = subtaskItem.querySelector('.subtask-item');
        } else {
            // Editing a main task
            textElement = taskElement.querySelector('p');
            if (!textElement) return;
            
            targetText = task.text;
            targetContainer = taskElement;
        }
        
        // Create edit input
        const editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.value = targetText;
        editInput.className = 'w-full px-2 py-1 text-sm rounded bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/10 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50';
        
        // Replace text with input
        textElement.replaceWith(editInput);
        editInput.focus();
        editInput.select();
        
        // Handle save on Enter
        editInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && editInput.value.trim()) {
                this.saveEditedTask(task.id, editInput.value.trim(), subtaskIndex);
            }
        });
        
        // Handle cancel on Escape
        editInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.cancelEdit(task.id, subtaskIndex);
            }
        });
        
        // Handle blur to save
        editInput.addEventListener('blur', () => {
            if (editInput.value.trim()) {
                this.saveEditedTask(task.id, editInput.value.trim(), subtaskIndex);
            } else {
                this.cancelEdit(task.id, subtaskIndex);
            }
        });
    }
    
    saveEditedTask(taskId, newText, subtaskIndex = null) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            if (subtaskIndex !== null && task.subtasks && task.subtasks[subtaskIndex]) {
                // Save subtask
                task.subtasks[subtaskIndex].text = newText;
            } else {
                // Save main task
                task.text = newText;
            }
            this.saveTasks();
            this.updateUI();
        }
        this.exitEditMode();
    }
    
    cancelEdit(taskId, subtaskIndex = null) {
        this.updateUI();
    }
    
    showEditModeNotification(isActive) {
        // Create or remove notification
        let notification = document.getElementById('editModeNotification');
        
        if (isActive) {
            if (!notification) {
                notification = document.createElement('div');
                notification.id = 'editModeNotification';
                notification.className = 'fixed bottom-16 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-blue-500/80 text-white text-xs rounded-lg shadow-lg z-50 transition-all opacity-100';
                
                // Use flex layout to ensure proper alignment
                notification.innerHTML = `
                    <div class="flex items-start">
                        <svg class="w-3 h-3 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                        <span class="flex-grow">Click on a task to edit</span>
                    </div>
                `;
                
                document.getElementById('app').appendChild(notification);
                
                // Add fade-out animation after 1.5 seconds (1500ms)
                setTimeout(() => {
                    // Start fade-out animation
                    notification.style.transition = 'opacity 0.5s ease-out';
                    notification.style.opacity = '0';
                    
                    // Remove the element after animation completes
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.remove();
                        }
                    }, 500);
                }, 1500);
            }
        } else {
            if (notification) {
                notification.remove();
            }
        }
    }
    
    // Subtask management functions
    toggleSubtasks(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || task.type !== 'multi') return;
        
        // Toggle expanded state
        task.expanded = !task.expanded;
        this.saveTasks();
        this.updateUI();
    }
    
    addSubtask(taskId, text) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.type === 'multi') {
            // Ensure subtasks array exists
            if (!task.subtasks) {
                task.subtasks = [];
            }
            
            const subtask = {
                id: Date.now() + Math.random(),
                text: text,
                completed: false,
                createdAt: new Date().toISOString()
            };
            
            task.subtasks.push(subtask);
            this.saveTasks();
            this.updateUI();
        }
    }
    
    toggleSubtask(taskId, subtaskIndex) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.subtasks && task.subtasks[subtaskIndex]) {
            const subtask = task.subtasks[subtaskIndex];
            subtask.completed = !subtask.completed;
            subtask.completedAt = subtask.completed ? new Date().toISOString() : null;
            this.saveTasks();
            this.updateUI();
        }
    }
    
    deleteSubtask(taskId, subtaskIndex) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.subtasks && task.subtasks[subtaskIndex]) {
            task.subtasks.splice(subtaskIndex, 1);
            this.saveTasks();
            this.updateUI();
        }
    }
    
    clearCompleted() {
        const completedTasks = this.tasks.filter(t => t.completed);
        if (completedTasks.length === 0) return;
        
        completedTasks.forEach(task => {
            const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
            if (taskElement) {
                taskElement.classList.add('fade-out');
            }
        });
        
        setTimeout(() => {
            this.tasks = this.tasks.filter(t => !t.completed);
            this.saveTasks();
            this.updateUI();
        }, 200);
    }
    
    updateUI() {
        this.renderTasks();
        this.updateTaskCount();
        this.updateClearButton();
        this.updateEmptyState();
    }
    
    renderTasks() {
        const tasksList = document.getElementById('tasksList');
        
        if (this.tasks.length === 0) {
            tasksList.innerHTML = '';
            return;
        }
        
        const tasksHTML = this.tasks.map(task => this.createTaskHTML(task)).join('');
        tasksList.innerHTML = tasksHTML;
        
        // Add event listeners to task elements
        this.tasks.forEach(task => {
            const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
            if (taskElement) {
                const checkbox = taskElement.querySelector('.task-checkbox');
                const deleteBtn = taskElement.querySelector('.delete-btn');
                
                checkbox.addEventListener('change', () => this.toggleTask(task.id));
                deleteBtn.addEventListener('click', () => this.deleteTask(task.id));
                
                // Add click event for edit mode
                taskElement.addEventListener('click', (e) => {
                    // Don't trigger if clicking on checkbox or delete button
                    if (e.target.closest('.task-checkbox') || e.target.closest('.delete-btn') || e.target.closest('.multi-task-indicator') || e.target.closest('.subtask-text') || e.target.closest('input')) {
                        return;
                    }
                    if (this.editMode) {
                        this.selectTaskForEdit(task.id);
                    }
                });
            }
        });
    }
    
    createTaskHTML(task) {
        const isCompleted = task.completed ? 'completed' : '';
        const textDecoration = task.completed ? 'line-through' : '';
        const opacity = task.completed ? 'opacity-60' : '';
        
        // Check if task is multi-task type
        const isMultiTask = task.type === 'multi';
        // Get expanded state, default to false if not set
        const isExpanded = task.expanded || false;
        
        return `
            <div class="task-item ${opacity} bg-white/10 dark:bg-black/10 rounded-lg p-3 border border-white/20 dark:border-white/5 hover:border-white/40 dark:hover:border-white/10 transition-all group cursor-move" 
                data-task-id="${task.id}" 
                draggable="true"
                ondragstart="window.todoWidget.handleDragStart(event, ${task.id})"
                ondragend="window.todoWidget.handleDragEnd(event)"
                ondragover="window.todoWidget.handleDragOver(event, ${task.id})"
                ondragleave="window.todoWidget.handleDragLeave(event)"
                ondrop="window.todoWidget.handleDrop(event, ${task.id})"
                style="transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;"
            >
                <div class="flex items-start space-x-3">
                    <label class="flex items-center cursor-pointer">
                        <input type="checkbox" class="task-checkbox sr-only" ${task.completed ? 'checked' : ''}>
                        <div class="w-5 h-5 rounded-full border-2 border-gray-400 dark:border-gray-500 flex items-center justify-center transition-all ${task.completed ? 'bg-green-500 border-green-500' : 'hover:border-green-400'}">
                            ${task.completed ? '<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>' : ''}
                        </div>
                    </label>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm text-gray-800 dark:text-gray-200 ${textDecoration} break-words leading-relaxed">
                            ${this.escapeHtml(task.text)}
                        </p>
                        ${task.completed && task.completedAt ? `
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Completed ${this.formatDate(task.completedAt)}
                            </p>
                        ` : ''}
                    </div>
                    
                    ${isMultiTask ? `
                        <!-- Multi-task indicator and expand/collapse button -->
                        <button class="multi-task-indicator p-1 rounded hover:bg-blue-500/20 transition-colors" title="Toggle subtasks" onclick="window.todoWidget.toggleSubtasks(${task.id})">
                            <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                ${isExpanded ? 
                                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>' : 
                                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>'
                                }
                            </svg>
                        </button>
                    ` : ''}
                    
                    <button class="delete-btn opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 transition-colors" title="Delete task">
                        <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
                
                ${isMultiTask ? `
                    <!-- Subtasks area -->
                    <div class="subtasks-container ${isExpanded ? '' : 'hidden'} mt-3 ml-8 border-l-2 border-white/20 dark:border-white/10 pl-4 space-y-2">
                        <!-- Add subtask input -->
                        <div class="relative">
                            <input 
                                type="text" 
                                placeholder="Add a subtask..." 
                                class="w-full px-3 py-1.5 text-xs rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/5 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                                onkeypress="if(event.key === 'Enter' && this.value.trim()) { window.todoWidget.addSubtask(${task.id}, this.value.trim()); this.value = ''; }"
                            >
                            <button class="absolute right-1 top-1/2 transform -translate-y-1/2 p-1 rounded-md hover:bg-blue-500/20 transition-colors" onclick="if(this.previousElementSibling.value.trim()) { window.todoWidget.addSubtask(${task.id}, this.previousElementSibling.value.trim()); this.previousElementSibling.value = ''; }">
                                <svg class="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                </svg>
                            </button>
                        </div>
                        
                        <!-- Subtasks list -->
                        <div class="subtasks-list space-y-2">
                            ${task.subtasks?.map((subtask, index) => `
                                <div class="subtask-item flex items-start space-x-2 cursor-move" 
                                    data-subtask-index="${index}" 
                                    draggable="true"
                                    ondragstart="window.todoWidget.handleSubtaskDragStart(event, ${task.id}, ${index})"
                                    ondragend="window.todoWidget.handleSubtaskDragEnd(event)"
                                    ondragover="window.todoWidget.handleSubtaskDragOver(event, ${task.id}, ${index})"
                                    ondragleave="window.todoWidget.handleSubtaskDragLeave(event)"
                                    ondrop="window.todoWidget.handleSubtaskDrop(event, ${task.id}, ${index})"
                                    style="transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;"
                                >
                                    <label class="flex items-center cursor-pointer mt-0.5">
                                        <input type="checkbox" class="subtask-checkbox sr-only" ${subtask.completed ? 'checked' : ''} onchange="window.todoWidget.toggleSubtask(${task.id}, ${index})">
                                        <div class="w-4 h-4 rounded-full border-2 border-gray-400 dark:border-gray-500 flex items-center justify-center transition-all ${subtask.completed ? 'bg-green-500 border-green-500' : 'hover:border-green-400'}">
                                            ${subtask.completed ? '<svg class="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>' : ''}
                                        </div>
                                    </label>
                                    <div class="flex-1 min-w-0">
                                        <p class="subtask-text text-xs text-gray-800 dark:text-gray-200 ${subtask.completed ? 'line-through opacity-60' : ''} break-words leading-relaxed cursor-pointer hover:bg-white/10 rounded px-1" onclick="if(window.todoWidget.editMode) { window.todoWidget.selectTaskForEdit(${task.id}, ${index}); }">
                                            ${this.escapeHtml(subtask.text)}
                                        </p>
                                    </div>
                                    <button class="subtask-delete-btn p-1 rounded-md hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100" title="Delete subtask" onclick="window.todoWidget.deleteSubtask(${task.id}, ${index})">
                                        <svg class="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                        </svg>
                                    </button>
                                </div>
                            `).join('') || '<p class="text-xs text-gray-500 dark:text-gray-400 italic">No subtasks yet</p>'}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    updateTaskCount() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const remaining = total - completed;
        
        const taskCountElement = document.getElementById('taskCount');
        if (total === 0) {
            taskCountElement.textContent = '0 tasks';
        } else if (completed === 0) {
            taskCountElement.textContent = `${total} ${total === 1 ? 'task' : 'tasks'}`;
        } else {
            taskCountElement.textContent = `${remaining} of ${total} remaining`;
        }
    }
    
    updateClearButton() {
        const clearBtn = document.getElementById('clearCompletedBtn');
        const hasCompleted = this.tasks.some(t => t.completed);
        
        if (hasCompleted) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }
    }
    
    updateEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const tasksList = document.getElementById('tasksList');
        
        if (this.tasks.length === 0) {
            emptyState.classList.remove('hidden');
            tasksList.classList.add('hidden');
        } else {
            emptyState.classList.add('hidden');
            tasksList.classList.remove('hidden');
        }
    }
    
    updateAlwaysOnTopButton() {
        const btn = document.getElementById('alwaysOnTopBtn');
        const svg = btn.querySelector('svg');
        
        if (this.isAlwaysOnTop) {
            btn.title = 'Always On Top (Enabled)';
            btn.classList.add('bg-blue-500/20', 'text-blue-500');
        } else {
            btn.title = 'Always On Top (Disabled)';
            btn.classList.remove('bg-blue-500/20', 'text-blue-500');
        }
    }
    
    async toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        await window.electronAPI.setStoreValue('theme', this.currentTheme);
        this.applyTheme();
        this.applyOpacity();
    }
    
    applyTheme() {
        const html = document.documentElement;
        const app = document.getElementById('app');
        
        if (this.currentTheme === 'dark') {
            html.classList.add('dark');
            app.classList.remove('glass-light');
            app.classList.add('glass-dark');
        } else {
            html.classList.remove('dark');
            app.classList.remove('glass-dark');
            app.classList.add('glass-light');
        }
    }
    
    applyOpacity() {
        const app = document.getElementById('app');
        const opacity = this.opacity / 100;
        
        if (this.currentTheme === 'light') {
            app.style.background = `rgba(255, 255, 255, ${opacity * 0.9})`;
        } else {
            app.style.background = `rgba(0, 0, 0, ${opacity * 0.9})`;
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }
    
    // Drag and drop sorting functions
    handleDragStart(event, taskId) {
        if (this.editMode) {
            event.preventDefault();
            return;
        }
        
        this.draggedTaskId = taskId;
        event.target.classList.add('opacity-50', 'scale-95');
        event.target.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.2)';
        event.target.style.transform = 'scale(0.98)';
        
        // Set drag image to a transparent image to hide default drag preview
        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        event.dataTransfer.setDragImage(img, 0, 0);
        
        // Add class for drag-over items
        event.dataTransfer.effectAllowed = 'move';
    }
    
    handleDragEnd(event) {
        if (this.draggedTaskId) {
            event.target.classList.remove('opacity-50', 'scale-95');
            event.target.style.boxShadow = '';
            event.target.style.transform = '';
            event.target.style.borderColor = '';
            
            // Remove all drag-over classes
            document.querySelectorAll('.task-item').forEach(item => {
                item.classList.remove('border-blue-500', 'ring-2', 'ring-blue-500');
            });
            
            this.draggedTaskId = null;
            this.dragOverTaskId = null;
        }
    }
    
    handleDragOver(event, taskId) {
        event.preventDefault();
        event.stopPropagation();
        
        if (this.draggedTaskId === taskId) return;
        
        this.dragOverTaskId = taskId;
        const draggedElement = document.querySelector(`[data-task-id="${this.draggedTaskId}"]`);
        const targetElement = event.currentTarget;
        
        // Remove previous drag-over styles
        document.querySelectorAll('.task-item').forEach(item => {
            if (item !== draggedElement) {
                item.classList.remove('border-blue-500', 'ring-2', 'ring-blue-500');
            }
        });
        
        // Add visual indicator for drop position
        targetElement.classList.add('border-blue-500', 'ring-2', 'ring-blue-500');
        
        event.dataTransfer.dropEffect = 'move';
    }
    
    handleDragLeave(event) {
        // Only remove style if we're actually leaving the element, not entering a child element
        if (!event.currentTarget.contains(event.relatedTarget)) {
            const taskId = parseInt(event.currentTarget.getAttribute('data-task-id'));
            if (this.dragOverTaskId === taskId) {
                event.currentTarget.classList.remove('border-blue-500', 'ring-2', 'ring-blue-500');
                this.dragOverTaskId = null;
            }
        }
    }
    
    handleDrop(event, targetTaskId) {
        event.preventDefault();
        event.stopPropagation();
        
        if (!this.draggedTaskId || this.draggedTaskId === targetTaskId) return;
        
        // Find the indices
        const draggedIndex = this.tasks.findIndex(t => t.id === this.draggedTaskId);
        const targetIndex = this.tasks.findIndex(t => t.id === targetTaskId);
        
        if (draggedIndex === -1 || targetIndex === -1) return;
        
        // Remove dragged task
        const [draggedTask] = this.tasks.splice(draggedIndex, 1);
        
        // Insert at new position
        this.tasks.splice(targetIndex, 0, draggedTask);
        
        // Save and update UI
        this.saveTasks();
        this.updateUI();
        
        // Clear drag state
        this.draggedTaskId = null;
        this.dragOverTaskId = null;
    }
    
    // Subtask drag and drop methods
    handleSubtaskDragStart(event, taskId, subtaskIndex) {
        // Store drag state
        this.draggedTaskId = taskId;
        this.draggedSubtaskIndex = subtaskIndex;
        
        // Add visual feedback
        event.target.classList.add('opacity-50', 'scale-95');
        event.target.style.boxShadow = '0 5px 10px rgba(0, 0, 0, 0.2)';
        
        // Set drag image
        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        event.dataTransfer.setDragImage(img, 0, 0);
        
        event.dataTransfer.effectAllowed = 'move';
    }
    
    handleSubtaskDragEnd(event) {
        // Remove drag styles
        event.target.classList.remove('opacity-50', 'scale-95');
        event.target.style.boxShadow = '';
        event.target.style.transform = '';
        event.target.style.borderColor = '';
        
        // Remove all drag-over styles from subtasks
        document.querySelectorAll('.subtask-item').forEach(item => {
            item.classList.remove('border-blue-500', 'ring-2', 'ring-blue-500');
        });
        
        // Clear drag state
        this.draggedTaskId = null;
        this.draggedSubtaskIndex = null;
        this.dragOverTaskId = null;
        this.dragOverSubtaskIndex = null;
    }
    
    handleSubtaskDragOver(event, taskId, subtaskIndex) {
        event.preventDefault();
        event.stopPropagation();
        
        // Only allow dropping on the same task's subtasks
        if (this.draggedTaskId !== taskId) return;
        
        // Don't allow dropping on the same subtask
        if (this.draggedSubtaskIndex === subtaskIndex) return;
        
        // Store drag over state
        this.dragOverTaskId = taskId;
        this.dragOverSubtaskIndex = subtaskIndex;
        
        // Remove previous drag-over styles
        document.querySelectorAll('.subtask-item').forEach(item => {
            item.classList.remove('border-blue-500', 'ring-2', 'ring-blue-500');
        });
        
        // Add visual indicator for drop position
        event.currentTarget.classList.add('border-blue-500', 'ring-2', 'ring-blue-500');
        
        event.dataTransfer.dropEffect = 'move';
    }
    
    handleSubtaskDragLeave(event) {
        // Only remove style if we're actually leaving the element, not entering a child element
        if (!event.currentTarget.contains(event.relatedTarget)) {
            const subtaskIndex = parseInt(event.currentTarget.getAttribute('data-subtask-index'));
            if (this.dragOverSubtaskIndex === subtaskIndex) {
                event.currentTarget.classList.remove('border-blue-500', 'ring-2', 'ring-blue-500');
                this.dragOverSubtaskIndex = null;
            }
        }
    }
    
    handleSubtaskDrop(event, taskId, targetSubtaskIndex) {
        event.preventDefault();
        event.stopPropagation();
        
        // Check if we're dropping on the same task and valid subtask
        if (this.draggedTaskId !== taskId || this.draggedSubtaskIndex === targetSubtaskIndex) return;
        
        // Get the task
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !task.subtasks) return;
        
        // Remove dragged subtask
        const [draggedSubtask] = task.subtasks.splice(this.draggedSubtaskIndex, 1);
        
        // Insert at new position
        task.subtasks.splice(targetSubtaskIndex, 0, draggedSubtask);
        
        // Save and update UI
        this.saveTasks();
        this.updateUI();
        
        // Clear drag state
        this.draggedTaskId = null;
        this.draggedSubtaskIndex = null;
        this.dragOverTaskId = null;
        this.dragOverSubtaskIndex = null;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.todoWidget = new TodoWidget();
});

// Handle app focus for better UX
window.addEventListener('load', () => {
    const taskInput = document.getElementById('taskInput');
    taskInput.focus();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + N: Focus on input
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        document.getElementById('taskInput').focus();
    }
    
    // Escape: Clear input or minimize window
    if (e.key === 'Escape') {
        const taskInput = document.getElementById('taskInput');
        if (taskInput.value) {
            taskInput.value = '';
        } else {
            window.electronAPI.minimizeWindow();
        }
    }
    
    // Ctrl/Cmd + Shift + C: Clear completed tasks
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        window.todoWidget?.clearCompleted();
    }
    
    // Ctrl/Cmd + T: Toggle theme
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        window.todoWidget?.toggleTheme();
    }
});
