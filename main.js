'use strict';

// Основные классы для работы с данными
class Client {
    constructor(name, phone, goals, notes, trainingType, moduleCount = 0) {
        this.id = Date.now().toString();
        this.name = name;
        this.phone = phone;
        this.goals = goals;
        this.notes = notes;
        this.trainingType = trainingType;
        this.moduleCount = moduleCount;
        this.trainingHistory = [];
    }
}

class Training {
    constructor(clientId, date, duration, notificationTime) {
        this.id = Date.now().toString();
        this.clientId = clientId;
        this.date = date;
        this.duration = duration; // в минутах (60, 90 или 120)
        this.notificationTime = notificationTime;
        this.completed = false;
        this.moduleDeducted = false;
        this.notificationSent = false;
        this.endTime = new Date(new Date(date).getTime() + duration * 60000); // Время окончания тренировки
    }

    intersectsWith(other) {
        let thisStart = new Date(this.date).getTime();
        let thisEnd = new Date(this.endTime).getTime();
        let otherStart = new Date(other.date).getTime();
        let otherEnd = new Date(other.endTime).getTime();
        return !(thisEnd <= otherStart || thisStart >= otherEnd);
    }

    includesTime(time) {
        let timeMs = time.getTime();
        return timeMs >= new Date(this.date).getTime() && timeMs < new Date(this.endTime).getTime();
    }
}

class DataManager {
    constructor() {
        this.clients = this.loadClients();
        this.trainings = this.loadTrainings();
    }

    loadClients() {
        return JSON.parse(localStorage.getItem('clients')) || [];
    }

    loadTrainings() {
        return JSON.parse(localStorage.getItem('trainings')) || [];
    }

    saveClients() {
        localStorage.setItem('clients', JSON.stringify(this.clients));
    }

    saveTrainings() {
        localStorage.setItem('trainings', JSON.stringify(this.trainings));
    }

    addClient(client) {
        this.clients.push(client);
        this.saveClients();
    }

    getClient(id) {
        return this.clients.find(client => client.id === id);
    }

    updateClient(client) {
        let index = this.clients.findIndex(c => c.id === client.id);
        if (index !== -1) {
            this.clients[index] = client;
            this.saveClients();
        }
    }

    addTraining(training) {
        this.trainings.push(training);
        this.saveTrainings();
    }

    getTraining(id) {
        return this.trainings.find(training => training.id === id);
    }

    updateTraining(training) {
        let index = this.trainings.findIndex(t => t.id === training.id);
        if (index !== -1) {
            this.trainings[index] = training;
            this.saveTrainings();
        }
    }

    getClientTrainings(clientId) {
        return this.trainings.filter(training => training.clientId === clientId);
    }

    checkAndDeductModuleTrainings() {
        let now = new Date();
        this.trainings.forEach(training => {
            if (!training.moduleDeducted && new Date(training.date) < now) {
                let client = this.getClient(training.clientId);
                if (client && client.trainingType === 'module' && client.moduleCount > 0) {
                    client.moduleCount--;
                    training.moduleDeducted = true;
                    this.updateClient(client);
                    this.updateTraining(training);
                }
            }
        });
    }
}

class NotificationManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.checkPermission();
        this.initializeNotifications();
        this.checkMissedNotifications();
        setInterval(() => this.checkUpcomingNotifications(), 60000);
    }

    async checkPermission() {
        if ('Notification' in window) {
            if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                await Notification.requestPermission();
            }
        }
    }

    initializeNotifications() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                this.swRegistration = registration;
            });
        }
    }

    checkMissedNotifications() {
        let now = new Date();
        this.dataManager.trainings.forEach(training => {
            if (!training.notificationSent) {
                let client = this.dataManager.getClient(training.clientId);
                let trainingTime = new Date(training.date);
                let notificationTime = new Date(trainingTime.getTime() - training.notificationTime * 60000);

                if (notificationTime <= now && now < trainingTime) {
                    this.showNotification(training, client);
                }
            }
        });
    }

    checkUpcomingNotifications() {
        let now = new Date();
        this.dataManager.trainings.forEach(training => {
            if (!training.notificationSent) {
                let client = this.dataManager.getClient(training.clientId);
                let trainingTime = new Date(training.date);
                let notificationTime = new Date(trainingTime.getTime() - training.notificationTime * 60000);

                if (Math.abs(now.getTime() - notificationTime.getTime()) < 60000) {
                    this.showNotification(training, client);
                }
            }
        });
    }

    scheduleNotification(training, client) {
        if (Notification.permission === 'granted') {
            let trainingTime = new Date(training.date);
            let notificationTime = new Date(trainingTime.getTime() - training.notificationTime * 60000);
            let now = new Date();

            if (notificationTime > now) {
                let notification = {
                    id: training.id,
                    time: notificationTime.getTime(),
                    training: training,
                    client: client
                };

                let scheduledNotifications = JSON.parse(localStorage.getItem('scheduledNotifications') || '[]');
                scheduledNotifications.push(notification);
                localStorage.setItem('scheduledNotifications', JSON.stringify(scheduledNotifications));
            }
        }
    }

    showNotification(training, client) {
        if (Notification.permission === 'granted') {
            let notification = new Notification('Напоминание о тренировке', {
                body: `Тренировка с ${client.name} через ${training.notificationTime} минут`,
                icon: '/assets/icons/dumbbell-icon.png',
                badge: '/assets/icons/dumbbell-icon.png',
                tag: training.id,
                renotify: true
            });

            training.notificationSent = true;
            this.dataManager.updateTraining(training);

            notification.onclick = () => {
                window.focus();
            };
        }
    }
}

class UIController {
    constructor(dataManager, notificationManager) {
        this.dataManager = dataManager;
        this.notificationManager = notificationManager;
        this.currentDate = new Date();
        this.selectedDate = null;
        this.initializeUI();
    }

    initializeUI() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchView(btn.dataset.view));
        });

        this.updateCalendar();
        document.getElementById('prev-month').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('next-month').addEventListener('click', () => this.changeMonth(1));

        this.initializeClientForm();
        this.initializeTrainingForm();
        this.initializeModals();
        this.renderClientsList();
    }

    switchView(viewName) {
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById(`${viewName}-view`).classList.add('active');
        
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });
    }

    updateCalendar() {
        let monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                         'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        
        document.getElementById('current-month').textContent = 
            `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;

        this.renderCalendarDays();
    }

    renderCalendarDays() {
        let calendarGrid = document.querySelector('.calendar-grid');
        calendarGrid.innerHTML = '';

        let firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        let lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);

        let weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        weekDays.forEach(day => {
            let dayElement = document.createElement('div');
            dayElement.className = 'calendar-day weekday';
            dayElement.textContent = day;
            calendarGrid.appendChild(dayElement);
        });

        let firstDayOfWeek = firstDay.getDay() || 7;
        for (let i = 1; i < firstDayOfWeek; i++) {
            calendarGrid.appendChild(document.createElement('div'));
        }

        for (let day = 1; day <= lastDay.getDate(); day++) {
            let dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;

            let currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
            
            let hasTrainings = this.dataManager.trainings.some(training => {
                let trainingDate = new Date(training.date);
                return trainingDate.toDateString() === currentDate.toDateString();
            });

            if (hasTrainings) {
                dayElement.classList.add('has-events');
            }

            if (currentDate.toDateString() === new Date().toDateString()) {
                dayElement.classList.add('today');
            }

            dayElement.addEventListener('click', () => this.selectDate(currentDate));
            calendarGrid.appendChild(dayElement);
        }
    }

    selectDate(date) {
        this.selectedDate = date;
        document.getElementById('selected-date').textContent = date.toLocaleDateString();
        this.renderDailySchedule();
        document.querySelector('.daily-schedule').style.display = 'block';
    }

    renderDailySchedule() {
        let timeSlots = document.querySelector('.time-slots');
        timeSlots.innerHTML = '';

        for (let hour = 10; hour < 20; hour++) {
            for (let minutes = 0; minutes < 60; minutes += 30) {
                let timeSlot = document.createElement('div');
                timeSlot.className = 'time-slot';
                
                let time = `${hour}:${minutes.toString().padStart(2, '0')}`;
                timeSlot.textContent = time;

                let slotDate = new Date(this.selectedDate);
                slotDate.setHours(hour, minutes, 0, 0);

                let existingTraining = this.dataManager.trainings.find(training => {
                    return training.includesTime(slotDate);
                });

                if (existingTraining) {
                    let client = this.dataManager.getClient(existingTraining.clientId);
                    let trainingDate = new Date(existingTraining.date);
                    
                    if (trainingDate.getHours() === hour && trainingDate.getMinutes() === minutes) {
                        timeSlot.classList.add('booked', 'training-start');
                        let duration = existingTraining.duration / 60;
                        timeSlot.textContent = `${time} - ${client.name} (${duration} ч)`;
                        
                        let slots = existingTraining.duration / 30;
                        timeSlot.style.height = `${slots * 100}%`;
                    } else {
                        timeSlot.classList.add('booked', 'training-continuation');
                        timeSlot.style.display = 'none';
                    }
                } else {
                    let canStartTraining = this.checkAvailableSlot(slotDate);
                    if (canStartTraining) {
                        timeSlot.addEventListener('click', () => this.openAddTrainingModal(slotDate));
                    } else {
                        timeSlot.classList.add('unavailable');
                    }
                }

                timeSlots.appendChild(timeSlot);
            }
        }
    }

    checkAvailableSlot(startTime) {
        let possibleDurations = [60, 90, 120];
        return possibleDurations.some(duration => {
            let endTime = new Date(startTime.getTime() + duration * 60000);
            
            let maxTime = new Date(startTime);
            maxTime.setHours(20, 0, 0, 0);
            if (endTime > maxTime) return false;

            return !this.dataManager.trainings.some(training => {
                let testTraining = new Training('test', startTime, duration, 0);
                return training.intersectsWith(testTraining);
            });
        });
    }

    changeMonth(delta) {
        this.currentDate = new Date(this.currentDate.getFullYear(), 
                                  this.currentDate.getMonth() + delta, 
                                  1);
        this.updateCalendar();
    }

    initializeClientForm() {
        let form = document.getElementById('add-client-form');
        let moduleCountGroup = document.getElementById('module-count-group');

        document.querySelectorAll('input[name="training-type"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                moduleCountGroup.style.display = e.target.value === 'module' ? 'block' : 'none';
            });
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            let client = new Client(
                form.querySelector('#client-name').value,
                form.querySelector('#client-phone').value,
                form.querySelector('#client-goals').value,
                form.querySelector('#client-notes').value,
                form.querySelector('input[name="training-type"]:checked').value,
                parseInt(form.querySelector('#module-count').value) || 0
            );

            this.dataManager.addClient(client);
            this.renderClientsList();
            this.closeModal('add-client-modal');
            form.reset();
        });
    }

    initializeTrainingForm() {
        let form = document.getElementById('add-training-form');

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            let selectedDate = new Date(this.selectedDate);
            let [hours, minutes] = form.querySelector('#training-time').value.split(':').map(Number);
            selectedDate.setHours(hours, minutes, 0, 0);

            let training = new Training(
                form.querySelector('#training-client').value,
                selectedDate,
                parseInt(form.querySelector('#training-duration').value),
                parseInt(form.querySelector('#notification-time').value)
            );

            this.dataManager.addTraining(training);
            let client = this.dataManager.getClient(training.clientId);
            this.notificationManager.scheduleNotification(training, client);
            
            this.renderDailySchedule();
            this.renderCalendarDays();
            this.closeModal('add-training-modal');
            form.reset();
        });
    }

    initializeModals() {
        document.querySelectorAll('.modal .close-btn, .modal .secondary-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                let modal = btn.closest('.modal');
                this.closeModal(modal.id);
            });
        });

        document.getElementById('add-client-btn').addEventListener('click', () => {
            this.openModal('add-client-modal');
        });
    }

    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    openAddTrainingModal(date) {
        let modal = document.getElementById('add-training-modal');
        let clientSelect = modal.querySelector('#training-client');
        
        clientSelect.innerHTML = '';
        this.dataManager.clients.forEach(client => {
            let option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.name;
            clientSelect.appendChild(option);
        });

        let timeInput = document.createElement('input');
        timeInput.type = 'time';
        timeInput.id = 'training-time';
        timeInput.required = true;
        timeInput.value = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        
        let timeGroup = document.createElement('div');
        timeGroup.className = 'form-group';
        timeGroup.innerHTML = '<label for="training-time">Время</label>';
        timeGroup.appendChild(timeInput);
        
        let durationSelect = modal.querySelector('#training-duration').parentElement;
        durationSelect.parentElement.insertBefore(timeGroup, durationSelect);

        this.openModal('add-training-modal');
    }

    renderClientsList() {
        let clientsList = document.querySelector('.clients-list');
        clientsList.innerHTML = '';

        this.dataManager.clients.forEach(client => {
            let clientCard = document.createElement('div');
            clientCard.className = 'client-card';
            clientCard.innerHTML = `
                <h3>${client.name}</h3>
                <p>${client.phone}</p>
                ${client.trainingType === 'module' ? 
                    `<p>Осталось тренировок: ${client.moduleCount}</p>` : ''}
            `;

            clientCard.addEventListener('click', () => this.openClientView(client));
            clientsList.appendChild(clientCard);
        });
    }

    openClientView(client) {
        let modal = document.getElementById('view-client-modal');
        
        document.getElementById('client-info').innerHTML = `
            <h3>${client.name}</h3>
            <p><strong>Телефон:</strong> ${client.phone}</p>
            <p><strong>Тип тренировок:</strong> ${client.trainingType === 'module' ? 'Модульная' : 'Разовая'}</p>
            ${client.trainingType === 'module' ? `<p><strong>Осталось тренировок:</strong> ${client.moduleCount}</p>` : ''}
            <p><strong>Цели:</strong> ${client.goals}</p>
            <p><strong>Заметки:</strong> ${client.notes}</p>
        `;

        let history = this.dataManager.getClientTrainings(client.id)
            .filter(training => new Date(training.date) < new Date())
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        document.getElementById('client-history').innerHTML = history.length ? 
            history.map(training => `
                <div class="training-record">
                    <p><strong>Дата:</strong> ${new Date(training.date).toLocaleDateString()}</p>
                    <p><strong>Время:</strong> ${new Date(training.date).toLocaleTimeString()}</p>
                    <p><strong>Длительность:</strong> ${training.duration} минут</p>
                </div>
            `).join('') : '<p>История тренировок пуста</p>';

        let allTrainings = this.dataManager.getClientTrainings(client.id)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        document.getElementById('client-schedule').innerHTML = allTrainings.length ?
            allTrainings.map(training => `
                <div class="training-record ${new Date(training.date) < new Date() ? 'past' : 'future'}">
                    <p><strong>Дата:</strong> ${new Date(training.date).toLocaleDateString()}</p>
                    <p><strong>Время:</strong> ${new Date(training.date).toLocaleTimeString()}</p>
                    <p><strong>Длительность:</strong> ${training.duration} минут</p>
                    <p><strong>Статус:</strong> ${new Date(training.date) < new Date() ? 'Завершена' : 'Предстоит'}</p>
                </div>
            `).join('') : '<p>Нет запланированных тренировок</p>';

        this.openModal('view-client-modal');

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    let dataManager = new DataManager();
    let notificationManager = new NotificationManager(dataManager);
    let uiController = new UIController(dataManager, notificationManager);

    setInterval(() => {
        dataManager.checkAndDeductModuleTrainings();
        uiController.renderClientsList();
        uiController.renderCalendarDays();
        if (uiController.selectedDate) {
            uiController.renderDailySchedule();
        }
    }, 60000);
});