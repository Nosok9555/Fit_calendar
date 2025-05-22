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
        this.duration = duration;
        this.notificationTime = notificationTime;
        this.completed = false;
        this.moduleDeducted = false;
    }
}

// Менеджер данных
class DataManager {
    constructor() {
        this.clients = this.loadClients();
        this.trainings = this.loadTrainings();
    }

    // Загрузка данных из localStorage
    loadClients() {
        return JSON.parse(localStorage.getItem('clients')) || [];
    }

    loadTrainings() {
        return JSON.parse(localStorage.getItem('trainings')) || [];
    }

    // Сохранение данных в localStorage
    saveClients() {
        localStorage.setItem('clients', JSON.stringify(this.clients));
    }

    saveTrainings() {
        localStorage.setItem('trainings', JSON.stringify(this.trainings));
    }

    // Методы работы с клиентами
    addClient(client) {
        this.clients.push(client);
        this.saveClients();
    }

    getClient(id) {
        return this.clients.find(client => client.id === id);
    }

    updateClient(client) {
        const index = this.clients.findIndex(c => c.id === client.id);
        if (index !== -1) {
            this.clients[index] = client;
            this.saveClients();
        }
    }

    // Методы работы с тренировками
    addTraining(training) {
        this.trainings.push(training);
        this.saveTrainings();
    }

    getTraining(id) {
        return this.trainings.find(training => training.id === id);
    }

    updateTraining(training) {
        const index = this.trainings.findIndex(t => t.id === training.id);
        if (index !== -1) {
            this.trainings[index] = training;
            this.saveTrainings();
        }
    }

    getClientTrainings(clientId) {
        return this.trainings.filter(training => training.clientId === clientId);
    }

    // Автоматическое списание тренировок
    checkAndDeductModuleTrainings() {
        const now = new Date();
        this.trainings.forEach(training => {
            if (!training.moduleDeducted && new Date(training.date) < now) {
                const client = this.getClient(training.clientId);
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

// Менеджер уведомлений
class NotificationManager {
    constructor() {
        this.checkPermission();
    }

    async checkPermission() {
        if ('Notification' in window) {
            if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                await Notification.requestPermission();
            }
        }
    }

    scheduleNotification(training, client) {
        if (Notification.permission === 'granted') {
            const notificationTime = new Date(training.date);
            notificationTime.setMinutes(notificationTime.getMinutes() - training.notificationTime);

            const now = new Date();
            if (notificationTime > now) {
                const timeout = notificationTime.getTime() - now.getTime();
                setTimeout(() => {
                    new Notification('Напоминание о тренировке', {
                        body: `Тренировка с ${client.name} через ${training.notificationTime} минут`,
                        icon: '/assets/icons/dumbbell-icon.png'
                    });
                }, timeout);
            }
        }
    }
}

// UI контроллер
class UIController {
    constructor(dataManager, notificationManager) {
        this.dataManager = dataManager;
        this.notificationManager = notificationManager;
        this.currentDate = new Date();
        this.selectedDate = null;
        this.initializeUI();
    }

    initializeUI() {
        // Инициализация навигации
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchView(btn.dataset.view));
        });

        // Инициализация календаря
        this.updateCalendar();
        document.getElementById('prev-month').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('next-month').addEventListener('click', () => this.changeMonth(1));

        // Инициализация форм
        this.initializeClientForm();
        this.initializeTrainingForm();

        // Обработка модальных окон
        this.initializeModals();

        // Первоначальное отображение данных
        this.renderClientsList();
        
        // Запуск проверки модульных тренировок
        setInterval(() => {
            this.dataManager.checkAndDeductModuleTrainings();
            this.renderClientsList();
        }, 60000); // Проверка каждую минуту
    }

    // Переключение между представлениями
    switchView(viewName) {
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById(`${viewName}-view`).classList.add('active');
        
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });
    }

    // Методы работы с календарем
    updateCalendar() {
        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                          'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        
        document.getElementById('current-month').textContent = 
            `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;

        this.renderCalendarDays();
    }

    renderCalendarDays() {
        const calendarGrid = document.querySelector('.calendar-grid');
        calendarGrid.innerHTML = '';

        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);

        // Добавление дней недели
        const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        weekDays.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day weekday';
            dayElement.textContent = day;
            calendarGrid.appendChild(dayElement);
        });

        // Добавление пустых ячеек в начале месяца
        let firstDayOfWeek = firstDay.getDay() || 7;
        for (let i = 1; i < firstDayOfWeek; i++) {
            calendarGrid.appendChild(document.createElement('div'));
        }

        // Добавление дней месяца
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;

            const currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
            
            // Проверка наличия тренировок в этот день
            const hasTrainings = this.dataManager.trainings.some(training => {
                const trainingDate = new Date(training.date);
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
        const timeSlots = document.querySelector('.time-slots');
        timeSlots.innerHTML = '';

        // Создание временных слотов с 10:00 до 20:00
        for (let hour = 10; hour < 20; hour++) {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            
            const time = `${hour}:00`;
            timeSlot.textContent = time;

            // Проверка занятости слота
            const slotDate = new Date(this.selectedDate);
            slotDate.setHours(hour, 0, 0, 0);

            const existingTraining = this.dataManager.trainings.find(training => {
                const trainingDate = new Date(training.date);
                return trainingDate.getTime() === slotDate.getTime();
            });

            if (existingTraining) {
                const client = this.dataManager.getClient(existingTraining.clientId);
                timeSlot.classList.add('booked');
                timeSlot.textContent = `${time} - ${client.name}`;
            } else {
                timeSlot.addEventListener('click', () => this.openAddTrainingModal(slotDate));
            }

            timeSlots.appendChild(timeSlot);
        }
    }

    changeMonth(delta) {
        this.currentDate = new Date(this.currentDate.getFullYear(), 
                                  this.currentDate.getMonth() + delta, 
                                  1);
        this.updateCalendar();
    }

    // Методы работы с формами
    initializeClientForm() {
        const form = document.getElementById('add-client-form');
        const moduleCountGroup = document.getElementById('module-count-group');

        // Показ/скрытие поля количества тренировок
        document.querySelectorAll('input[name="training-type"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                moduleCountGroup.style.display = e.target.value === 'module' ? 'block' : 'none';
            });
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const client = new Client(
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
        const form = document.getElementById('add-training-form');

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const training = new Training(
                form.querySelector('#training-client').value,
                this.selectedDate,
                parseInt(form.querySelector('#training-duration').value),
                parseInt(form.querySelector('#notification-time').value)
            );

            this.dataManager.addTraining(training);
            const client = this.dataManager.getClient(training.clientId);
            this.notificationManager.scheduleNotification(training, client);
            
            this.renderDailySchedule();
            this.renderCalendarDays();
            this.closeModal('add-training-modal');
            form.reset();
        });
    }

    // Методы работы с модальными окнами
    initializeModals() {
        // Закрытие модальных окон
        document.querySelectorAll('.modal .close-btn, .modal .secondary-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                this.closeModal(modal.id);
            });
        });

        // Открытие модального окна добавления клиента
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
        const modal = document.getElementById('add-training-modal');
        const clientSelect = modal.querySelector('#training-client');
        
        // Заполнение списка клиентов
        clientSelect.innerHTML = '';
        this.dataManager.clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.name;
            clientSelect.appendChild(option);
        });

        this.openModal('add-training-modal');
    }

    // Отображение списка клиентов
    renderClientsList() {
        const clientsList = document.querySelector('.clients-list');
        clientsList.innerHTML = '';

        this.dataManager.clients.forEach(client => {
            const clientCard = document.createElement('div');
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

    // Просмотр информации о клиенте
    openClientView(client) {
        const modal = document.getElementById('view-client-modal');
        
        // Заполнение вкладки информации
        document.getElementById('client-info').innerHTML = `
            <h3>${client.name}</h3>
            <p><strong>Телефон:</strong> ${client.phone}</p>
            <p><strong>Тип тренировок:</strong> ${client.trainingType === 'module' ? 'Модульная' : 'Разовая'}</p>
            ${client.trainingType === 'module' ? `<p><strong>Осталось тренировок:</strong> ${client.moduleCount}</p>` : ''}
            <p><strong>Цели:</strong> ${client.goals}</p>
            <p><strong>Заметки:</strong> ${client.notes}</p>
        `;

        // Заполнение вкладки истории
        const history = this.dataManager.getClientTrainings(client.id)
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

        // Заполнение вкладки всех записей
        const allTrainings = this.dataManager.getClientTrainings(client.id)
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

        // Обработка переключения вкладок
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

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    const dataManager = new DataManager();
    const notificationManager = new NotificationManager();
    const uiController = new UIController(dataManager, notificationManager);
});