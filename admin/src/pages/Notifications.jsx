import React, { useState, useEffect } from 'react';
import {
    Bell,
    Flame,
    Gift,
    Package,
    Truck,
    CreditCard,
    ChevronLeft,
    Trash2,
    Plus,
    X,
    CheckCircle,
    AlertCircle,
    Info,
    Tag
} from 'lucide-react';
import { notificationApi } from '../services/api';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [stats, setStats] = useState({ total: 0, unread: 0, promo: 0, order: 0, system: 0 });
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newNotification, setNewNotification] = useState({
        title: '',
        message: '',
        type: 'all',
        category: 'all',
        icon: 'bell',
        isHighlighted: false
    });

    const tabs = [
        { id: 'all', label: 'All' },
        { id: 'buyer', label: 'Buyer' },
        { id: 'seller', label: 'Seller' },
        { id: 'promo', label: 'Promo' }
    ];

    const iconMap = {
        bell: Bell,
        flame: Flame,
        gift: Gift,
        package: Package,
        truck: Truck,
        'credit-card': CreditCard,
        check: CheckCircle,
        alert: AlertCircle,
        info: Info,
        tag: Tag
    };

    useEffect(() => {
        fetchNotifications();
        fetchStats();
    }, [activeTab]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const params = {};

            // Handle tab filtering
            if (['buyer', 'seller'].includes(activeTab)) {
                params.category = activeTab;
            } else if (activeTab === 'promo') {
                params.type = 'promo';
            }

            const { data } = await notificationApi.getNotifications(params);
            setNotifications(data.data || []);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const { data } = await notificationApi.getStats();
            setStats(data.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await notificationApi.createNotification(newNotification);
            setShowCreateModal(false);
            setNewNotification({
                title: '',
                message: '',
                type: 'all',
                category: 'all',
                icon: 'bell',
                isHighlighted: false
            });
            fetchNotifications();
            fetchStats();
        } catch (error) {
            console.error('Failed to create notification:', error);
            alert('Failed to create notification');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this notification?')) return;
        try {
            await notificationApi.deleteNotification(id);
            fetchNotifications();
            fetchStats();
        } catch (error) {
            console.error('Failed to delete notification:', error);
            alert('Failed to delete notification');
        }
    };

    const handleSeedNotifications = async () => {
        try {
            await notificationApi.seedNotifications();
            fetchNotifications();
            fetchStats();
            alert('Sample notifications created successfully!');
        } catch (error) {
            console.error('Failed to seed notifications:', error);
            alert('Failed to create sample notifications');
        }
    };

    const getIcon = (iconName) => {
        const IconComponent = iconMap[iconName] || Bell;
        return IconComponent;
    };

    return (
        <div className="notifications-page">
            {/* Header */}
            <div className="notifications-header">
                <div className="notifications-header-left">
                    <button className="back-button">
                        <ChevronLeft size={24} />
                    </button>
                    <h1>Notifications</h1>
                </div>
                <div className="notifications-header-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={handleSeedNotifications}
                        title="Create sample notifications"
                    >
                        <Plus size={18} />
                        Seed Demo
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <Plus size={18} />
                        Create
                    </button>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="notification-stats-bar">
                <div className="stat-pill">
                    <span className="stat-label">Total</span>
                    <span className="stat-value">{stats.total}</span>
                </div>
                <div className="stat-pill stat-pill-warning">
                    <span className="stat-label">Unread</span>
                    <span className="stat-value">{stats.unread}</span>
                </div>
                <div className="stat-pill stat-pill-promo">
                    <span className="stat-label">Promos</span>
                    <span className="stat-value">{stats.promo}</span>
                </div>
                <div className="stat-pill stat-pill-order">
                    <span className="stat-label">Orders</span>
                    <span className="stat-value">{stats.order}</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="notifications-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Notification List */}
            <div className="notifications-list">
                {loading ? (
                    <div className="loading">
                        <div className="spinner"></div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="empty-state">
                        <Bell size={64} />
                        <h3>No notifications yet</h3>
                        <p>When you receive notifications, they'll appear here.</p>
                        <button
                            className="btn btn-primary"
                            style={{ marginTop: '1rem' }}
                            onClick={handleSeedNotifications}
                        >
                            Create Sample Notifications
                        </button>
                    </div>
                ) : (
                    notifications.map((notification) => {
                        const IconComponent = getIcon(notification.icon);
                        return (
                            <div
                                key={notification.id || notification._id}
                                className={`notification-card ${notification.isHighlighted ? 'highlighted' : ''}`}
                            >
                                <div className={`notification-icon ${notification.isHighlighted ? 'icon-highlighted' : ''}`}>
                                    <IconComponent size={20} />
                                </div>
                                <div className="notification-content">
                                    <div className="notification-header">
                                        <h3 className="notification-title">{notification.title}</h3>
                                        <span className="notification-time">{notification.timeAgo}</span>
                                    </div>
                                    <p className="notification-message">
                                        {notification.message}
                                    </p>
                                    <div className="notification-meta">
                                        <span className={`notification-type type-${notification.type}`}>
                                            {notification.type}
                                        </span>
                                        <span className={`notification-category category-${notification.category}`}>
                                            {notification.category}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    className="notification-delete"
                                    onClick={() => handleDelete(notification.id || notification._id)}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal notification-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Create Notification</h2>
                            <button
                                className="modal-close"
                                onClick={() => setShowCreateModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Title *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={newNotification.title}
                                    onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                                    placeholder="Enter notification title"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Message *</label>
                                <textarea
                                    className="form-input"
                                    value={newNotification.message}
                                    onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                                    placeholder="Enter notification message"
                                    rows={3}
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Type</label>
                                    <select
                                        className="form-input"
                                        value={newNotification.type}
                                        onChange={(e) => setNewNotification({ ...newNotification, type: e.target.value })}
                                    >
                                        <option value="all">All</option>
                                        <option value="promo">Promo</option>
                                        <option value="order">Order</option>
                                        <option value="payment">Payment</option>
                                        <option value="system">System</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select
                                        className="form-input"
                                        value={newNotification.category}
                                        onChange={(e) => setNewNotification({ ...newNotification, category: e.target.value })}
                                    >
                                        <option value="all">All</option>
                                        <option value="buyer">Buyer</option>
                                        <option value="seller">Seller</option>
                                        <option value="admin">Admin</option>
                                        <option value="partner">Partner</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Icon</label>
                                    <select
                                        className="form-input"
                                        value={newNotification.icon}
                                        onChange={(e) => setNewNotification({ ...newNotification, icon: e.target.value })}
                                    >
                                        <option value="bell">🔔 Bell</option>
                                        <option value="flame">🔥 Flame</option>
                                        <option value="gift">🎁 Gift</option>
                                        <option value="package">📦 Package</option>
                                        <option value="truck">🚚 Truck</option>
                                        <option value="credit-card">💳 Credit Card</option>
                                        <option value="check">✅ Check</option>
                                        <option value="alert">⚠️ Alert</option>
                                        <option value="info">ℹ️ Info</option>
                                        <option value="tag">🏷️ Tag</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Highlighted</label>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={newNotification.isHighlighted}
                                            onChange={(e) => setNewNotification({ ...newNotification, isHighlighted: e.target.checked })}
                                        />
                                        <span className="toggle-slider"></span>
                                        <span className="toggle-label">
                                            {newNotification.isHighlighted ? 'Yes' : 'No'}
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create Notification
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notifications;
