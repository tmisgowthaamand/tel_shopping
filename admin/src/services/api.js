import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use((config) => {
    // Determine which token to use
    const isAdminRoute = !config.url.startsWith('/partner-portal');
    const token = isAdminRoute
        ? localStorage.getItem('atz_admin_token')
        : localStorage.getItem('atz_partner_token');

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle unauthorized responses
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const isPartnerPortal = error.config.url.includes('/partner-portal');
            if (isPartnerPortal) {
                localStorage.removeItem('atz_partner_token');
                window.location.href = '/partner/login';
            } else {
                localStorage.removeItem('atz_admin_token');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export const authApi = {
    login: (credentials) => api.post('/auth/login', credentials),
    getMe: () => api.get('/auth/me'),
};

export const partnerPortalApi = {
    login: (credentials) => api.post('/partner-portal/login', credentials),
    getAssignedOrders: () => api.get('/partner-portal/orders'),
    updateOrderStatus: (data) => api.post('/partner-portal/orders/update', data),
    getMe: () => api.get('/partner-portal/me'),
};

export const productApi = {
    getProducts: (params) => api.get('/products', { params }),
    getProduct: (id) => api.get(`/products/${id}`),
    createProduct: (data) => api.post('/products', data),
    updateProduct: (id, data) => api.put(`/products/${id}`, data),
    deleteProduct: (id) => api.delete(`/products/${id}`),
    getStats: () => api.get('/products/stats'),
    generateAIDescription: (data) => api.post('/products/ai-description', data),
    uploadImage: (formData) => api.post('/products/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    bulkCreate: (data) => api.post('/products/bulk', data),
};

export const categoryApi = {
    getCategories: (params) => api.get('/categories', { params }),
    createCategory: (data) => api.post('/categories', data),
    updateCategory: (id, data) => api.put(`/categories/${id}`, data),
    deleteCategory: (id) => api.delete(`/categories/${id}`),
};

export const orderApi = {
    getOrders: (params) => api.get('/orders', { params }),
    getOrder: (id) => api.get(`/orders/${id}`),
    updateStatus: (id, status, note) => api.patch(`/orders/${id}/status`, { status, note }),
    cancelOrder: (id, reason) => api.post(`/orders/${id}/cancel`, { reason }),
    getStats: (params) => api.get('/orders/stats', { params }),
    getFlagged: () => api.get('/orders/flagged'),
    assignPartner: (id, partnerId) => api.post(`/orders/${id}/assign-partner`, { partnerId }),
};

export const partnerApi = {
    getPartners: (params) => api.get('/partners', { params }),
    getPartner: (id) => api.get(`/partners/${id}`),
    createPartner: (data) => api.post('/partners', data),
    updatePartner: (id, data) => api.put(`/partners/${id}`, data),
    toggleActive: (id) => api.patch(`/partners/${id}/toggle`),
    verify: (id) => api.patch(`/partners/${id}/verify`),
    getStats: () => api.get('/partners/stats'),
};

export const userApi = {
    getUsers: (params) => api.get('/users', { params }),
    getUser: (id) => api.get(`/users/${id}`),
    blacklist: (id, reason) => api.post(`/users/${id}/blacklist`, { reason }),
    unblacklist: (id) => api.post(`/users/${id}/unblacklist`),
    getStats: () => api.get('/users/stats'),
    broadcast: (data) => api.post('/users/broadcast', data),
    sendMessage: (id, data) => api.post(`/users/${id}/message`, data),
};

export const settingsApi = {
    getMaintenance: () => api.get('/settings/maintenance'),
    updateMaintenance: (enabled) => api.post('/settings/maintenance', { enabled }),
};

export const notificationApi = {
    getNotifications: (params) => api.get('/notifications', { params }),
    getStats: () => api.get('/notifications/stats'),
    createNotification: (data) => api.post('/notifications', data),
    deleteNotification: (id) => api.delete(`/notifications/${id}`),
    markAsRead: (id) => api.post(`/notifications/${id}/read`),
    markAllAsRead: () => api.post('/notifications/mark-all-read'),
    seedNotifications: () => api.post('/notifications/seed'),
    bulkDelete: (ids) => api.post('/notifications/bulk-delete', { ids }),
};

export default api;
