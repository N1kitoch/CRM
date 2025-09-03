// CRM System JavaScript
class CRMSystem {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.backendUrl = 'https://server-iyp2.onrender.com';
        this.dataCache = {};
        this.currentChatOrder = null;
        this.currentMessage = null;
        this.currentSupport = null;
        
        this.init();
    }
    
    init() {
        this.checkAuth();
        this.bindEvents();
        this.loadInitialData();
        this.initSSE();
    }
    
    // Authentication
    checkAuth() {
        const token = localStorage.getItem('crm_token');
        if (token) {
            // В реальной системе здесь должна быть проверка токена
            this.isAuthenticated = true;
            this.currentUser = JSON.parse(localStorage.getItem('crm_user') || '{"name": "Администратор"}');
            this.showDashboard();
        } else {
            this.showLogin();
        }
    }
    
    async login(username, password) {
        // В реальной системе здесь должна быть проверка через API
        if (username === 'admin' && password === 'admin123') {
            this.isAuthenticated = true;
            this.currentUser = { name: username };
            
            localStorage.setItem('crm_token', 'demo_token_' + Date.now());
            localStorage.setItem('crm_user', JSON.stringify(this.currentUser));
            
            this.showDashboard();
            return true;
        } else {
            throw new Error('Неверные учетные данные');
        }
    }
    
    logout() {
        this.isAuthenticated = false;
        this.currentUser = null;
        localStorage.removeItem('crm_token');
        localStorage.removeItem('crm_user');
        this.showLogin();
    }
    
    // Navigation
    showLogin() {
        document.getElementById('loginPage').classList.add('active');
        document.getElementById('crmDashboard').classList.remove('active');
    }
    
    showDashboard() {
        document.getElementById('loginPage').classList.remove('active');
        document.getElementById('crmDashboard').classList.add('active');
        this.updateUserInfo();
        this.loadDashboardData();
    }
    
    showPage(pageName) {
        // Hide all pages
        document.querySelectorAll('.crm-page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show selected page
        document.getElementById(pageName + 'Page').classList.add('active');
        
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageName}"]`).classList.add('active');
        
        // Load page data
        this.loadPageData(pageName);
    }
    
    // Event Binding
    bindEvents() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.showPage(page);
            });
        });
        
        // Filters
        document.getElementById('statusFilter')?.addEventListener('change', () => {
            this.filterOrders();
        });
        
        document.getElementById('dateFilter')?.addEventListener('change', () => {
            this.filterOrders();
        });
    }
    
    // Login Handler
    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            this.showLoading();
            await this.login(username, password);
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            alert('Ошибка входа: ' + error.message);
        }
    }
    
    // Data Loading
    async loadInitialData() {
        if (!this.isAuthenticated) return;
        
        try {
            await this.loadDashboardData();
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }
    
    async loadPageData(pageName) {
        switch (pageName) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'orders':
                await this.loadOrders();
                break;
            case 'messages':
                await this.loadMessages();
                break;
            case 'chat':
                await this.loadChatOrders();
                break;
            case 'support':
                await this.loadSupportRequests();
                break;
            case 'reviews':
                await this.loadReviews();
                break;
        }
    }
    
    // Dashboard
    async loadDashboardData() {
        try {
            this.showLoading();
            
            // Load statistics
            const stats = await this.getStatistics();
            this.updateDashboardStats(stats);
            
            // Load recent activity
            const activity = await this.getRecentActivity();
            this.updateRecentActivity(activity);
            
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            console.error('Error loading dashboard data:', error);
        }
    }
    
    async getStatistics() {
        try {
            const response = await fetch(`${this.backendUrl}/api/frontend/stats`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    return {
                        totalOrders: data.stats.requests,
                        pendingOrders: data.stats.requests, // В реальной системе нужно фильтровать по статусу
                        unreadMessages: data.stats.messages,
                        averageRating: parseFloat(data.stats.average_rating || 0).toFixed(1)
                    };
                }
            }
        } catch (error) {
            console.error('Error fetching statistics:', error);
        }
        
        // Fallback to cached data
        return this.getCachedStatistics();
    }
    
    processStatistics(data) {
        // Process backend data to get statistics
        const stats = {
            totalOrders: 0,
            pendingOrders: 0,
            unreadMessages: 0,
            averageRating: 0.0
        };
        
        if (data.requests) {
            stats.totalOrders = data.requests.length;
            stats.pendingOrders = data.requests.filter(r => r.status === 'pending').length;
        }
        
        if (data.messages) {
            stats.unreadMessages = data.messages.filter(m => !m.processed).length;
        }
        
        if (data.average_rating) {
            stats.averageRating = parseFloat(data.average_rating.average_rating || 0).toFixed(1);
        }
        
        return stats;
    }
    
    getCachedStatistics() {
        return {
            totalOrders: 25,
            pendingOrders: 8,
            unreadMessages: 12,
            averageRating: 4.7
        };
    }
    
    updateDashboardStats(stats) {
        document.getElementById('totalOrders').textContent = stats.totalOrders;
        document.getElementById('pendingOrders').textContent = stats.pendingOrders;
        document.getElementById('unreadMessages').textContent = stats.unreadMessages;
        document.getElementById('averageRating').textContent = stats.averageRating;
    }
    
    async getRecentActivity() {
        // Get recent activity from various sources
        const activities = [];
        
        try {
            // Get recent orders
            const orders = await this.getOrders(5);
            orders.forEach(order => {
                activities.push({
                    type: 'order',
                    title: `Новый заказ #${order.id}`,
                    description: `${order.service_name} - ${order.username || order.first_name}`,
                    timestamp: order.timestamp,
                    status: order.status
                });
            });
            
            // Get recent messages
            const messages = await this.getMessages(5);
            messages.forEach(message => {
                activities.push({
                    type: 'message',
                    title: `Новое сообщение`,
                    description: `${message.username || message.first_name}: ${message.message.substring(0, 50)}...`,
                    timestamp: message.timestamp,
                    status: message.processed ? 'processed' : 'new'
                });
            });
            
            // Sort by timestamp
            activities.sort((a, b) => this.getSortableTimestamp(b.timestamp) - this.getSortableTimestamp(a.timestamp));
            
        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
        
        return activities.slice(0, 10);
    }
    
    updateRecentActivity(activities) {
        const container = document.getElementById('recentActivityList');
        if (!container) return;
        
        if (activities.length === 0) {
            container.innerHTML = '<div class="activity-item"><p>Нет активности</p></div>';
            return;
        }
        
        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <h4>${activity.title}</h4>
                    <p>${activity.description}</p>
                    <span class="activity-time">${this.formatTimestamp(activity.timestamp)}</span>
                </div>
                <div class="activity-status ${activity.status}">
                    <span class="status-badge status-${activity.status}">
                        ${this.getStatusText(activity.status)}
                    </span>
                </div>
            </div>
        `).join('');
    }
    
    getActivityIcon(type) {
        const icons = {
            order: 'shopping-cart',
            message: 'comment',
            review: 'star',
            support: 'headset'
        };
        return icons[type] || 'info-circle';
    }
    
    // Orders Management
    async loadOrders() {
        try {
            this.showLoading();
            const orders = await this.getOrders();
            this.renderOrdersTable(orders);
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            console.error('Error loading orders:', error);
        }
    }
    
    async getOrders(limit = 100) {
        try {
            const response = await fetch(`${this.backendUrl}/api/frontend/data/requests`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    return data.data;
                }
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
        
        // Fallback to demo data
        return this.getDemoOrders();
    }
    
    getDemoOrders() {
        return [
            {
                id: 1,
                username: 'john_doe',
                first_name: 'John',
                last_name: 'Doe',
                service_name: 'AI Telegram Bot',
                message: 'Нужен бот для автоматизации продаж',
                status: 'pending',
                timestamp: '2024-12-19 10:30:00'
            },
            {
                id: 2,
                username: 'jane_smith',
                first_name: 'Jane',
                last_name: 'Smith',
                service_name: 'Channel Automation',
                message: 'Хочу автоматизировать ведение канала',
                status: 'processing',
                timestamp: '2024-12-18 15:45:00'
            }
        ];
    }
    
    renderOrdersTable(orders) {
        const tbody = document.getElementById('ordersTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>#${order.id}</td>
                <td>${order.username || order.first_name || 'Неизвестно'}</td>
                <td>${order.service_name}</td>
                <td>${order.message.substring(0, 50)}${order.message.length > 50 ? '...' : ''}</td>
                <td>
                    <span class="status-badge status-${order.status}">
                        ${this.getStatusText(order.status)}
                    </span>
                </td>
                <td>${this.formatTimestamp(order.timestamp)}</td>
                <td>
                    ${order.admin_comment ? `<div class="admin-comment" title="Комментарий администратора">💬 ${order.admin_comment.substring(0, 30)}${order.admin_comment.length > 30 ? '...' : ''}</div>` : ''}
                </td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="crm.changeOrderStatus(${order.id})">
                        <i class="fas fa-edit"></i>
                        Изменить статус
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    // Messages Management
    async loadMessages() {
        try {
            this.showLoading();
            const messages = await this.getMessages();
            this.renderMessagesList(messages);
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            console.error('Error loading messages:', error);
        }
    }
    
    async getMessages(limit = 100) {
        try {
            const response = await fetch(`${this.backendUrl}/api/frontend/data/messages`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    return data.data;
                }
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
        
        // Fallback to demo data
        return this.getDemoMessages();
    }
    
    getDemoMessages() {
        return [
            {
                id: 1,
                username: 'user1',
                first_name: 'User',
                message: 'Здравствуйте! Интересует разработка бота',
                timestamp: '2024-12-19 11:00:00',
                processed: false
            },
            {
                id: 2,
                username: 'user2',
                first_name: 'Client',
                message: 'Спасибо за качественную работу!',
                timestamp: '2024-12-18 16:30:00',
                processed: true
            }
        ];
    }
    
    renderMessagesList(messages) {
        const container = document.getElementById('messagesList');
        if (!container) return;
        
        container.innerHTML = messages.map(message => `
            <div class="message-item ${message.processed ? 'processed' : 'new'}" 
                 onclick="crm.selectMessage(${message.id})">
                <div class="message-header">
                    <strong>👤 ${message.username || message.first_name || 'Пользователь'}</strong>
                    <span class="message-time">${this.formatTimestamp(message.timestamp)}</span>
                </div>
                <div class="message-preview">
                    ${message.message.substring(0, 100)}${message.message.length > 100 ? '...' : ''}
                </div>
                <div class="message-status">
                    <span class="status-badge ${message.processed ? 'status-completed' : 'status-pending'}">
                        ${message.processed ? '✅ Обработано' : '🆕 Новое'}
                    </span>
                </div>
            </div>
        `).join('');
    }
    
    selectMessage(messageId) {
        // Remove active class from all messages
        document.querySelectorAll('.message-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to selected message
        const selectedItem = document.querySelector(`[onclick*="${messageId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
        }
        
        // Load message details
        this.loadMessageDetails(messageId);
    }
    
    async loadMessageDetails(messageId) {
        try {
            const messages = await this.getMessages();
            const message = messages.find(m => m.id === messageId);
            
            if (message) {
                this.renderMessageDetails(message);
            }
        } catch (error) {
            console.error('Error loading message details:', error);
        }
    }
    
    renderMessageDetails(message) {
        const container = document.getElementById('messageDetail');
        if (!container) return;
        
        container.innerHTML = `
            <div class="message-detail-content">
                <div class="message-detail-header">
                    <h3>💬 Сообщение от пользователя</h3>
                    <div class="message-info">
                        <span class="user-info">👤 ${message.username || message.first_name || 'Пользователь'}</span>
                        <span class="message-time">${this.formatTimestamp(message.timestamp)}</span>
                    </div>
                </div>
                <div class="message-content">
                    <p>${message.message}</p>
                </div>
                <div class="message-actions">
                    <button class="btn btn-primary" onclick="crm.markMessageProcessed(${message.id})">
                        <i class="fas fa-check"></i>
                        Отметить как обработанное
                    </button>
                    <button class="btn btn-outline" onclick="crm.replyToMessage(${message.id})">
                        <i class="fas fa-reply"></i>
                        Ответить
                    </button>
                </div>
            </div>
        `;
    }
    
    // Chat Management
    async loadChatOrders() {
        try {
            this.showLoading();
            const orders = await this.getChatOrders();
            this.renderChatOrders(orders);
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            console.error('Error loading chat orders:', error);
        }
    }
    
    async getChatOrders() {
        try {
            const response = await fetch(`${this.backendUrl}/api/frontend/data/chat_orders`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    return data.data;
                }
            }
        } catch (error) {
            console.error('Error fetching chat orders:', error);
        }
        
        // Fallback to demo data
        return this.getDemoChatOrders();
    }
    
    getDemoChatOrders() {
        return [
            {
                id: 1,
                username: 'john_doe',
                first_name: 'John',
                service_name: 'AI Telegram Bot',
                status: 'active',
                last_message: 'Когда будет готов бот?',
                timestamp: '2024-12-19 10:30:00'
            },
            {
                id: 2,
                username: 'jane_smith',
                first_name: 'Jane',
                service_name: 'Channel Automation',
                status: 'completed',
                last_message: 'Спасибо за работу!',
                timestamp: '2024-12-18 15:45:00'
            }
        ];
    }
    
    renderChatOrders(orders) {
        const container = document.getElementById('chatOrders');
        if (!container) return;
        
        container.innerHTML = orders.map(order => `
            <div class="chat-order-item" onclick="crm.selectChatOrder(${order.id})">
                <div class="chat-order-header">
                    <strong>📋 Заказ #${order.id}</strong>
                    <span class="chat-order-status ${order.status}">
                        ${this.getStatusText(order.status)}
                    </span>
                </div>
                <div class="chat-order-service">
                    🎯 ${order.service_name}
                </div>
                <div class="chat-order-client">
                    👤 ${order.username || order.first_name || 'Пользователь'}
                </div>
                <div class="chat-order-message">
                    💬 ${order.message ? (order.message.substring(0, 50) + (order.message.length > 50 ? '...' : '')) : 'Нет сообщения'}
                </div>
                <div class="chat-order-time">
                    🕐 ${this.formatTimestamp(order.timestamp)}
                </div>
            </div>
        `).join('');
    }
    
    selectChatOrder(orderId) {
        // Remove active class from all chat orders
        document.querySelectorAll('.chat-order-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to selected order
        const selectedItem = document.querySelector(`[onclick*="${orderId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
        }
        
        this.currentChatOrder = orderId;
        this.loadChatMessages(orderId);
        this.showChatInput();
    }
    
    async loadChatMessages(orderId) {
        try {
            const messages = await this.getChatMessages(orderId);
            this.renderChatMessages(messages);
            this.updateChatHeader(orderId);
        } catch (error) {
            console.error('Error loading chat messages:', error);
        }
    }
    
    async getChatMessages(orderId) {
        try {
            const response = await fetch(`${this.backendUrl}/api/frontend/data/chat_messages`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    // Фильтруем сообщения по orderId и сортируем по времени
                    const filteredMessages = data.data.filter(msg => msg.order_id == orderId);
                    
                    // Сортируем сообщения по времени (старые сверху, новые снизу)
                    const sortedMessages = filteredMessages.sort((a, b) => {
                        const timeA = this.getSortableTimestamp(a.timestamp);
                        const timeB = this.getSortableTimestamp(b.timestamp);
                        return timeA - timeB; // По возрастанию времени
                    });
                    
                    // Отладочная информация для проверки сортировки
                    console.log('📊 Сообщения отсортированы:', sortedMessages.map(msg => ({
                        id: msg.id,
                        time: msg.timestamp,
                        parsed_time: this.parseTimestamp(msg.timestamp),
                        formatted_time: this.formatLocalTime(msg.timestamp),
                        message: msg.message.substring(0, 30) + '...',
                        is_admin: msg.is_admin
                    })));
                    
                    // Детальная отладка временных меток
                    this.debugTimestamps(sortedMessages);
                    
                    return sortedMessages;
                }
            }
        } catch (error) {
            console.error('Error fetching chat messages:', error);
        }
        
        // Fallback to demo data
        return this.getDemoChatMessages(orderId);
    }
    
    getDemoChatMessages(orderId) {
        return [
            {
                id: 1,
                message: 'Здравствуйте! У меня есть вопрос по заказу',
                is_admin: false,
                timestamp: '2024-12-19 10:30:00',
                username: 'user123',
                first_name: 'User'
            },
            {
                id: 2,
                message: 'Здравствуйте! Конечно, готов помочь. Какой у вас вопрос?',
                is_admin: true,
                timestamp: '2024-12-19 10:32:00',
                username: 'Администратор',
                first_name: 'Администратор'
            }
        ];
    }
    
    renderChatMessages(messages) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        container.innerHTML = messages.map(message => `
            <div class="chat-message ${message.is_admin ? 'admin' : 'user'}" data-message-id="${message.id || 'temp-' + Date.now()}">
                <div class="message-header">
                    <span class="message-author">${message.is_admin ? '👨‍💼 Администратор' : '👤 ' + (message.username || message.first_name || 'Пользователь')}</span>
                    <span class="message-time">${this.formatTimestamp(message.timestamp)}</span>
                    ${message.is_admin ? '<span class="message-status synced">✅ Синхронизировано</span>' : ''}
                </div>
                <div class="message-content">
                    ${message.message}
                </div>
            </div>
        `).join('');
        
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }
    
    updateChatHeader(orderId) {
        const header = document.getElementById('chatHeader');
        if (!header) return;
        
        // Get order details
        const orders = this.getDemoChatOrders(); // In real app, get from cache or API
        const order = orders.find(o => o.id === orderId);
        
        if (order) {
            header.innerHTML = `
                <div class="chat-header-content">
                    <h3>Чат по заказу #${order.id}</h3>
                    <p>${order.service_name} - ${order.username || order.first_name}</p>
                    <span class="chat-order-status ${order.status}">
                        ${this.getStatusText(order.status)}
                    </span>
                </div>
            `;
        }
    }
    
    showChatInput() {
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.style.display = 'flex';
        }
    }
    
    async sendAdminMessage() {
        const input = document.getElementById('adminMessageInput');
        const message = input.value.trim();
        
        if (!message || !this.currentChatOrder) return;
        
        try {
            this.showLoading();
            
            // Отправляем сообщение на бэкенд
            const response = await fetch(`${this.backendUrl}/api/frontend/chat/admin-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: this.currentChatOrder,
                    message: message
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    // Создаем объект нового сообщения для правильной сортировки
                    const newMessage = {
                        id: result.adminMessage.id,
                        message: message,
                        is_admin: true,
                        timestamp: result.adminMessage.timestamp,
                        username: 'Администратор',
                        first_name: 'Администратор',
                        order_id: this.currentChatOrder
                    };
                    
                    // Получаем текущие сообщения и добавляем новое
                    const currentMessages = await this.getChatMessages(this.currentChatOrder);
                    currentMessages.push(newMessage);
                    
                    // Сортируем все сообщения по времени
                    const sortedMessages = currentMessages.sort((a, b) => {
                        const timeA = this.getSortableTimestamp(a.timestamp);
                        const timeB = this.getSortableTimestamp(b.timestamp);
                        return timeA - timeB; // По возрастанию времени
                    });
                    
                    // Перерисовываем чат с правильным порядком
                    this.renderChatMessages(sortedMessages);
                    
                    // Очищаем поле ввода
                    input.value = '';
                    
                    // Через 5 секунд обновляем статус (если сообщение еще в DOM)
                    setTimeout(() => {
                        const messageElement = document.querySelector(`[data-message-id="${newMessage.id}"]`);
                        if (messageElement) {
                            const statusElement = messageElement.querySelector('.message-status');
                            if (statusElement) {
                                statusElement.className = 'message-status synced';
                                statusElement.textContent = '✅ Синхронизировано';
                            }
                        }
                    }, 5000);
                    
                    console.log('Admin message sent successfully:', result.adminMessage);
                    
                    console.log('Admin message sent successfully:', result.adminMessage);
                } else {
                    alert('Ошибка: ' + result.error);
                }
            } else {
                alert('Ошибка сервера при отправке сообщения');
            }
            
            this.hideLoading();
            
        } catch (error) {
            this.hideLoading();
            console.error('Error sending admin message:', error);
            alert('Ошибка отправки сообщения');
        }
    }
    
    // Support Management
    async loadSupportRequests() {
        try {
            this.showLoading();
            const requests = await this.getSupportRequests();
            this.renderSupportList(requests);
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            console.error('Error loading support requests:', error);
        }
    }
    
    async getSupportRequests(limit = 100) {
        try {
            const response = await fetch(`${this.backendUrl}/api/frontend/data/support_requests`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    return data.data;
                }
            }
        } catch (error) {
            console.error('Error fetching support requests:', error);
        }
        
        // Fallback to demo data
        return this.getDemoSupportRequests();
    }
    
    getDemoSupportRequests() {
        return [
            {
                id: 1,
                username: 'user1',
                first_name: 'User',
                name: 'Иван Иванов',
                subject: 'Техническая поддержка',
                message: 'Не могу войти в систему',
                timestamp: '2024-12-19 12:00:00',
                processed: false
            },
            {
                id: 2,
                username: 'user2',
                first_name: 'Client',
                name: 'Петр Петров',
                subject: 'Вопрос по функционалу',
                message: 'Как использовать новую функцию?',
                timestamp: '2024-12-18 17:00:00',
                processed: true
            }
        ];
    }
    
    renderSupportList(requests) {
        const container = document.getElementById('supportList');
        if (!container) return;
        
        container.innerHTML = requests.map(request => `
            <div class="support-item ${request.processed ? 'processed' : 'new'}" 
                 onclick="crm.selectSupport(${request.id})">
                <div class="support-header">
                    <strong>🆘 ${request.name || request.username || request.first_name}</strong>
                    <span class="support-time">${this.formatTimestamp(request.timestamp)}</span>
                </div>
                <div class="support-subject">
                    📝 ${request.subject}
                </div>
                <div class="support-preview">
                    ${request.message.substring(0, 100)}${request.message.length > 100 ? '...' : ''}
                </div>
                <div class="support-status">
                    <span class="status-badge ${request.processed ? 'status-completed' : 'status-pending'}">
                        ${request.processed ? '✅ Обработано' : '🆕 Новое'}
                    </span>
                </div>
            </div>
        `).join('');
    }
    
    selectSupport(supportId) {
        // Remove active class from all support items
        document.querySelectorAll('.support-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to selected item
        const selectedItem = document.querySelector(`[onclick*="${supportId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
        }
        
        // Load support details
        this.loadSupportDetails(supportId);
    }
    
    async loadSupportDetails(supportId) {
        try {
            const requests = await this.getSupportRequests();
            const request = requests.find(r => r.id === supportId);
            
            if (request) {
                this.renderSupportDetails(request);
            }
        } catch (error) {
            console.error('Error loading support details:', error);
        }
    }
    
    renderSupportDetails(request) {
        const container = document.getElementById('supportDetail');
        if (!container) return;
        
        container.innerHTML = `
            <div class="support-detail-content">
                <div class="support-detail-header">
                    <h3>🆘 Запрос поддержки</h3>
                    <div class="support-info-header">
                        <span class="support-time">${this.formatTimestamp(request.timestamp)}</span>
                    </div>
                </div>
                <div class="support-info">
                    <p><strong>👤 От:</strong> ${request.name || request.username || request.first_name}</p>
                    <p><strong>📝 Тема:</strong> ${request.subject}</p>
                </div>
                <div class="support-content">
                    <p>${request.message}</p>
                </div>
                <div class="support-actions">
                    <button class="btn btn-primary" onclick="crm.markSupportProcessed(${request.id})">
                        <i class="fas fa-check"></i>
                        Отметить как обработанное
                    </button>
                    <button class="btn btn-outline" onclick="crm.replyToSupport(${request.id})">
                        <i class="fas fa-reply"></i>
                        Ответить
                    </button>
                </div>
            </div>
        `;
    }
    
    // Reviews Management
    async loadReviews() {
        try {
            this.showLoading();
            const reviews = await this.getReviews();
            const averageRating = await this.getAverageRating();
            
            this.updateReviewsOverview(averageRating);
            this.renderReviewsList(reviews);
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            console.error('Error loading reviews:', error);
        }
    }
    
    async getReviews(limit = 100) {
        try {
            const response = await fetch(`${this.backendUrl}/api/frontend/data/reviews`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    return data.data;
                }
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
        }
        
        // Fallback to demo data
        return this.getDemoReviews();
    }
    
    getDemoReviews() {
        return [
            {
                id: 1,
                username: 'user1',
                first_name: 'User',
                rating: 5,
                comment: 'Отличная работа! Все сделано качественно и в срок.',
                timestamp: '2024-12-19 13:00:00'
            },
            {
                id: 2,
                username: 'user2',
                first_name: 'Client',
                rating: 4,
                comment: 'Хороший результат, но можно было сделать быстрее.',
                timestamp: '2024-12-18 18:00:00'
            }
        ];
    }
    
    async getAverageRating() {
        try {
            const response = await fetch(`${this.backendUrl}/api/frontend/data/average_rating`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    return data.data;
                }
            }
        } catch (error) {
            console.error('Error fetching average rating:', error);
        }
        
        // Fallback to demo data
        return { average_rating: 4.7, total_reviews: 15 };
    }
    
    updateReviewsOverview(averageRating) {
        const overallRating = document.getElementById('overallRating');
        const overallStars = document.getElementById('overallStars');
        
        if (overallRating) {
            overallRating.textContent = averageRating.average_rating.toFixed(1);
        }
        
        if (overallStars) {
            const rating = Math.round(averageRating.average_rating);
            overallStars.innerHTML = Array(5).fill(0).map((_, i) => 
                `<i class="fas fa-star${i < rating ? '' : '-o'}"></i>`
            ).join('');
        }
    }
    
    renderReviewsList(reviews) {
        const container = document.getElementById('reviewsList');
        if (!container) return;
        
        container.innerHTML = reviews.map(review => `
            <div class="review-item">
                <div class="review-header">
                    <div class="review-user">
                        <strong>${review.username || review.first_name || 'Неизвестно'}</strong>
                    </div>
                    <div class="review-rating">
                        ${Array(5).fill(0).map((_, i) => 
                            `<i class="fas fa-star${i < review.rating ? '' : '-o'}"></i>`
                        ).join('')}
                    </div>
                    <div class="review-time">
                        ${this.formatTimestamp(review.timestamp)}
                    </div>
                </div>
                <div class="review-content">
                    <p>${review.comment}</p>
                </div>
            </div>
        `).join('');
    }
    
    // SSE для real-time обновлений
    initSSE() {
        try {
            const eventSource = new EventSource(`${this.backendUrl}/api/sse`);
            
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleSSEMessage(data);
                } catch (error) {
                    console.error('Error parsing SSE message:', error);
                }
            };
            
            eventSource.onerror = (error) => {
                console.error('SSE connection error:', error);
                // Переподключение через 5 секунд
                setTimeout(() => this.initSSE(), 5000);
            };
            
            console.log('SSE connection established');
            
        } catch (error) {
            console.error('Error initializing SSE:', error);
        }
    }
    
    handleSSEMessage(data) {
        switch (data.type) {
            case 'order_status_changed':
                console.log('Order status changed:', data);
                this.refreshCurrentPage();
                break;
            case 'message_processed':
                console.log('Message processed:', data);
                this.refreshCurrentPage();
                break;
            case 'support_processed':
                console.log('Support processed:', data);
                this.refreshCurrentPage();
                break;
            case 'admin_message_sent':
                console.log('Admin message sent:', data);
                // Обновляем чат если он открыт
                if (this.currentChatOrder == data.orderId) {
                    this.loadChatMessages(data.orderId);
                }
                break;
            case 'data_update':
                console.log('Data update received:', data);
                this.refreshCurrentPage();
                break;
            case 'full_sync_complete':
                console.log('Full sync complete:', data);
                this.refreshCurrentPage();
                break;
        }
    }
    
    refreshCurrentPage() {
        // Определяем текущую страницу и обновляем её
        const activePage = document.querySelector('.crm-page.active');
        if (activePage) {
            const pageId = activePage.id;
            if (pageId === 'dashboardPage') {
                this.loadDashboardData();
            } else if (pageId === 'ordersPage') {
                this.loadOrders();
            } else if (pageId === 'messagesPage') {
                this.loadMessages();
            } else if (pageId === 'chatPage') {
                this.loadChatOrders();
            } else if (pageId === 'supportPage') {
                this.loadSupportRequests();
            } else if (pageId === 'reviewsPage') {
                this.loadReviews();
            }
        }
    }
    
    // Utility Functions
    getStatusText(status) {
        const statusMap = {
            'pending': 'Ожидает',
            'processing': 'В обработке',
            'completed': 'Завершен',
            'cancelled': 'Отменен',
            'active': 'Активен'
        };
        return statusMap[status] || status;
    }
    
    formatTimestamp(timestamp) {
        if (!timestamp) return 'Неизвестно';
        
        // Используем простую логику как в мини-приложении
        const t = this.parseTimestamp(timestamp);
        if (t === 0) return 'Неизвестно';
        
        const date = new Date(t);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) { // Less than 1 minute
            return 'Только что';
        } else if (diff < 3600000) { // Less than 1 hour
            const minutes = Math.floor(diff / 60000);
            return `${minutes} мин. назад`;
        } else if (diff < 86400000) { // Less than 1 day
            const hours = Math.floor(diff / 3600000);
            return `${hours} ч. назад`;
        } else {
            return date.toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }
    
    // Простая функция парсинга времени (как в мини-приложении)
    parseTimestamp(timestamp) {
        if (timestamp == null) return 0;
        if (typeof timestamp === 'number') {
            // Если секунды (<= 10^10), переведём в миллисекунды
            return timestamp < 1e12 ? Math.floor(timestamp * 1000) : timestamp;
        }
        if (typeof timestamp === 'string') {
            // Если строка без TZ, считаем UTC и добавляем 'Z'
            const hasTZ = /Z|[+\-]\d{2}:?\d{2}$/.test(timestamp);
            const iso = hasTZ ? timestamp : (timestamp.endsWith('Z') ? timestamp : timestamp + 'Z');
            const t = Date.parse(iso);
            return isNaN(t) ? 0 : t;
        }
        const t = Date.parse(timestamp);
        return isNaN(t) ? 0 : t;
    }
    
    // Функция для получения унифицированного времени для сортировки
    getSortableTimestamp(timestamp) {
        return this.parseTimestamp(timestamp);
    }
    
    // Функция для форматирования времени (как в мини-приложении)
    formatLocalTime(timestamp) {
        const t = this.parseTimestamp(timestamp);
        if (t === 0) return 'Неизвестно';
        return new Date(t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    
    // Функция для отладки временных меток (упрощенная как в мини-приложении)
    debugTimestamps(messages) {
        console.log('🔍 Отладка временных меток (как в мини-приложении):');
        console.log(`🌍 Текущий часовой пояс: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
        console.log(`⏰ Текущее локальное время: ${new Date().toLocaleString('ru-RU')}`);
        console.log(`🌐 Текущее UTC время: ${new Date().toISOString()}`);
        console.log('---');
        
        messages.forEach((msg, index) => {
            const original = msg.timestamp;
            const parsed = this.parseTimestamp(msg.timestamp);
            const formatted = this.formatLocalTime(msg.timestamp);
            const date = new Date(parsed);
            
            console.log(`   ${index + 1}. ID: ${msg.id}`);
            console.log(`      Оригинал: ${original}`);
            console.log(`      Парсинг (мс): ${parsed}`);
            console.log(`      Дата: ${date.toISOString()}`);
            console.log(`      Локальное время: ${date.toLocaleString('ru-RU')}`);
            console.log(`      Форматированное время: ${formatted}`);
            console.log('   ---');
        });
    }
    
    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'block';
        }
    }
    
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    updateUserInfo() {
        const userSpan = document.getElementById('currentUser');
        if (userSpan && this.currentUser) {
            userSpan.textContent = this.currentUser.name;
        }
    }
    
    // Order Status Management
    changeOrderStatus(orderId) {
        this.currentOrderId = orderId;
        const modal = document.getElementById('statusModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }
    
    closeStatusModal() {
        const modal = document.getElementById('statusModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    async confirmStatusChange() {
        const newStatus = document.getElementById('newStatus').value;
        const comment = document.getElementById('statusComment').value;
        
        if (!newStatus || !this.currentOrderId) return;
        
        try {
            this.showLoading();
            
            // Отправляем запрос на изменение статуса
            const response = await fetch(`${this.backendUrl}/api/frontend/order/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: this.currentOrderId,
                    newStatus: newStatus,
                    comment: comment
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    // Закрываем модал и обновляем заказы
                    this.closeStatusModal();
                    await this.loadOrders();
                    
                    // Показываем сообщение об успехе
                    alert(`Статус заказа #${this.currentOrderId} успешно изменен на "${newStatus}"`);
                } else {
                    alert('Ошибка: ' + result.error);
                }
            } else {
                alert('Ошибка сервера при изменении статуса');
            }
            
            this.hideLoading();
            
        } catch (error) {
            this.hideLoading();
            console.error('Error changing order status:', error);
            alert('Ошибка изменения статуса заказа');
        }
    }
    
    // Filter Functions
    filterOrders() {
        const statusFilter = document.getElementById('statusFilter').value;
        const dateFilter = document.getElementById('dateFilter').value;
        
        // In real app, apply filters to API call
        console.log('Filters applied:', { status: statusFilter, date: dateFilter });
        
        // For demo, just reload orders
        this.loadOrders();
    }
    
    // Refresh Functions
    refreshOrders() {
        this.loadOrders();
    }
    
    // Placeholder functions for future implementation
    async markMessageProcessed(messageId) {
        try {
            this.showLoading();
            
            // Отправляем запрос на отметку сообщения как обработанного
            const response = await fetch(`${this.backendUrl}/api/frontend/message/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId: messageId })
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    alert('Сообщение отмечено как обработанное');
                    await this.loadMessages();
                } else {
                    alert('Ошибка: ' + result.error);
                }
            } else {
                alert('Ошибка сервера при обработке сообщения');
            }
            
            this.hideLoading();
            
        } catch (error) {
            this.hideLoading();
            console.error('Error marking message as processed:', error);
            alert('Ошибка при обработке сообщения');
        }
    }
    
    replyToMessage(messageId) {
        console.log('Reply to message:', messageId);
        alert('Функция ответа на сообщение будет реализована позже');
    }
    
    async markSupportProcessed(supportId) {
        try {
            this.showLoading();
            
            // Отправляем запрос на отметку запроса поддержки как обработанного
            const response = await fetch(`${this.backendUrl}/api/frontend/support/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ supportId: supportId })
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    alert('Запрос поддержки отмечен как обработанный');
                    await this.loadSupportRequests();
                } else {
                    alert('Ошибка: ' + result.error);
                }
            } else {
                alert('Ошибка сервера при обработке запроса поддержки');
            }
            
            this.hideLoading();
            
        } catch (error) {
            this.hideLoading();
            console.error('Error marking support as processed:', error);
            alert('Ошибка при обработке запроса поддержки');
        }
    }
    
    replyToSupport(supportId) {
        console.log('Reply to support:', supportId);
        alert('Функция ответа на запрос поддержки будет реализована позже');
    }
}

// Global functions for onclick handlers
function logout() {
    crm.logout();
}

function refreshOrders() {
    crm.refreshOrders();
}

function changeOrderStatus(orderId) {
    crm.changeOrderStatus(orderId);
}

function closeStatusModal() {
    crm.closeStatusModal();
}

function confirmStatusChange() {
    crm.confirmStatusChange();
}

function sendAdminMessage() {
    crm.sendAdminMessage();
}

// Initialize CRM system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.crm = new CRMSystem();
});
