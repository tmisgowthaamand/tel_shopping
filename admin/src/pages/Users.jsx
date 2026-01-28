import React, { useState, useEffect } from 'react';
import {
    Users as UsersIcon,
    Search,
    UserMinus,
    UserCheck,
    ShoppingBag,
    MapPin,
    ChevronLeft,
    ChevronRight,
    MoreVertical,
    AlertCircle,
    Megaphone,
    XCircle,
    MessageCircle,
    Send,
    Gift,
    Tag,
    Clock
} from 'lucide-react';
import { userApi, productApi } from '../services/api';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [stats, setStats] = useState({ total: 0, blacklisted: 0, active30Days: 0 });
    const [showNotifyModal, setShowNotifyModal] = useState(false);
    const [notification, setNotification] = useState({ message: '', imageUrl: '', productId: '' });
    const [sending, setSending] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    // Individual user messaging state
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userMessage, setUserMessage] = useState({ message: '', imageUrl: '', productId: '' });
    const [sendingUserMessage, setSendingUserMessage] = useState(false);
    const [userProductSearch, setUserProductSearch] = useState('');
    const [userSearchResults, setUserSearchResults] = useState([]);
    const [messageTemplates] = useState([
        { id: 1, name: '🎁 Special Offer', message: '<b>🎁 Exclusive Offer Just For You!</b>\n\nHi {{name}}, we have a special deal waiting for you. Check out our latest products with amazing discounts!\n\n<i>Limited time offer - Don\'t miss out!</i>' },
        { id: 2, name: '🏷️ Discount Code', message: '<b>🏷️ Personal Discount Code</b>\n\nHi {{name}}, use code <b>SPECIAL10</b> to get 10% off on your next purchase!\n\n<i>Valid for the next 48 hours.</i>' },
        { id: 3, name: '📦 Order Update', message: '<b>📦 Quick Update</b>\n\nHi {{name}}, we wanted to let you know about an update regarding your recent activity.\n\n<i>Thank you for being a valued customer!</i>' },
        { id: 4, name: '🔔 Reminder', message: '<b>🔔 Friendly Reminder</b>\n\nHi {{name}}, you left some items in your cart! Complete your purchase now before they\'re gone.\n\n<i>We\'re here to help if you need anything.</i>' },
        { id: 5, name: '⭐ VIP Notice', message: '<b>⭐ VIP Customer Notice</b>\n\nHi {{name}}, as one of our valued VIP customers, you get early access to our upcoming sale!\n\n<i>Stay tuned for more exclusive perks.</i>' }
    ]);

    useEffect(() => {
        fetchUsers();
        fetchStats();
    }, [page]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await userApi.getUsers({ page, limit: 15 });
            setUsers(response.data.users);
            setTotal(response.data.total);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await userApi.getStats();
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching user stats:', error);
        }
    };

    const handleProductSearch = async (val) => {
        setProductSearch(val);
        if (val.length > 2) {
            try {
                const response = await productApi.getProducts({ search: val, limit: 5 });
                setSearchResults(response.data.products);
            } catch (error) {
                console.error('Product search error:', error);
            }
        } else {
            setSearchResults([]);
        }
    };

    const applyProductOffer = (prod) => {
        const hasDiscount = prod.discount > 0;
        const priceText = hasDiscount
            ? `<s>₹${prod.price}</s> <b>₹${prod.finalPrice.toFixed(0)}</b> (${prod.discount}% OFF)`
            : `<b>₹${prod.price}</b>`;

        const offerMessage = `<b>🔥 SPECIAL OFFER: ${prod.name.toUpperCase()} 🔥</b>\n\n💰 ${priceText}\n\n${prod.shortDescription || prod.description.slice(0, 100) + '...'}\n\n🚚 <i>Hurry! Limited stock available.</i>`;

        setNotification({
            message: offerMessage,
            imageUrl: prod.images.find(i => i.isPrimary)?.url || prod.images[0]?.url || '',
            productId: prod._id
        });
        setSearchResults([]);
        setProductSearch('');
    };

    const handleBroadcast = async (e) => {
        e.preventDefault();
        if (!notification.message) return;

        if (window.confirm('Are you sure you want to broadcast this message to ALL users?')) {
            setSending(true);
            try {
                const response = await userApi.broadcast(notification);
                alert(`Broadcast completed!\nSuccess: ${response.data.stats.success}\nFailed: ${response.data.stats.failed}`);
                setShowNotifyModal(false);
                setNotification({ message: '', imageUrl: '', productId: '' });
            } catch (error) {
                alert('Broadcast failed: ' + (error.response?.data?.error || error.message));
            } finally {
                setSending(false);
            }
        }
    };

    const handleBlacklist = async (id, currentStatus) => {
        if (window.confirm(`Are you sure you want to ${currentStatus ? 'unblacklist' : 'blacklist'} this user?`)) {
            try {
                if (currentStatus) {
                    await userApi.unblacklist(id);
                } else {
                    const reason = prompt('Reason for blacklisting?');
                    await userApi.blacklist(id, reason || 'Rule violation');
                }
                fetchUsers();
                fetchStats();
            } catch (error) {
                alert('Action failed: ' + error.message);
            }
        }
    };

    // Open message modal for a specific user
    const openMessageModal = (user) => {
        setSelectedUser(user);
        setUserMessage({ message: '', imageUrl: '', productId: '' });
        setUserProductSearch('');
        setUserSearchResults([]);
        setShowMessageModal(true);
    };

    // Handle product search for user message
    const handleUserProductSearch = async (val) => {
        setUserProductSearch(val);
        if (val.length > 2) {
            try {
                const response = await productApi.getProducts({ search: val, limit: 5 });
                setUserSearchResults(response.data.products);
            } catch (error) {
                console.error('Product search error:', error);
            }
        } else {
            setUserSearchResults([]);
        }
    };

    // Apply product offer for user message
    const applyUserProductOffer = (prod) => {
        const hasDiscount = prod.discount > 0;
        const priceText = hasDiscount
            ? `<s>₹${prod.price}</s> <b>₹${prod.finalPrice.toFixed(0)}</b> (${prod.discount}% OFF)`
            : `<b>₹${prod.price}</b>`;

        const userName = selectedUser?.firstName || 'there';
        const offerMessage = `<b>🎁 Special Offer for You, ${userName}!</b>\n\n<b>${prod.name}</b>\n\n💰 ${priceText}\n\n${prod.shortDescription || prod.description.slice(0, 100) + '...'}\n\n<i>🚚 Tap below to grab this deal!</i>`;

        setUserMessage({
            message: offerMessage,
            imageUrl: prod.images.find(i => i.isPrimary)?.url || prod.images[0]?.url || '',
            productId: prod._id
        });
        setUserSearchResults([]);
        setUserProductSearch('');
    };

    // Apply message template
    const applyTemplate = (template) => {
        const userName = selectedUser?.firstName || 'there';
        const personalizedMessage = template.message.replace(/\{\{name\}\}/g, userName);
        setUserMessage(prev => ({ ...prev, message: personalizedMessage }));
    };

    // Send message to user
    const handleSendUserMessage = async (e) => {
        e.preventDefault();
        if (!userMessage.message || !selectedUser) return;

        setSendingUserMessage(true);
        try {
            const response = await userApi.sendMessage(selectedUser._id, userMessage);
            alert(`✅ Message sent successfully to ${selectedUser.firstName}!`);
            setShowMessageModal(false);
            setSelectedUser(null);
            setUserMessage({ message: '', imageUrl: '', productId: '' });
        } catch (error) {
            alert('Failed to send message: ' + (error.response?.data?.error || error.message));
        } finally {
            setSendingUserMessage(false);
        }
    };

    return (
        <div className="users-page">
            {/* User Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon info" style={{ background: 'var(--info)' }}><UsersIcon size={24} /></div>
                    <div className="stat-content">
                        <p>Total Customers</p>
                        <h3>{stats.total}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon success"><ShoppingBag size={24} /></div>
                    <div className="stat-content">
                        <p>Active (30 Days)</p>
                        <h3>{stats.active30Days}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon danger"><AlertCircle size={24} /></div>
                    <div className="stat-content">
                        <p>Blacklisted</p>
                        <h3>{stats.blacklisted}</h3>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search
                            size={18}
                            style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}
                        />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Search by ID or Username..."
                            style={{ paddingLeft: '3rem' }}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowNotifyModal(true)}>
                        <Megaphone size={18} /> Bulk Notify
                    </button>
                </div>
            </div>

            <div className="card">
                {loading ? (
                    <div className="loading"><div className="spinner"></div></div>
                ) : (
                    <>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Telegram ID</th>
                                        <th>Joined</th>
                                        <th>Orders</th>
                                        <th>Total Spent</th>
                                        <th>Loyalty</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user._id}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{user.firstName} {user.lastName}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>@{user.username || 'n/a'}</div>
                                            </td>
                                            <td style={{ fontSize: '0.875rem' }}>{user.telegramId}</td>
                                            <td style={{ fontSize: '0.875rem' }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                                            <td>{user.orderStats?.totalOrders || 0}</td>
                                            <td style={{ fontWeight: 600 }}>₹{Number(user.orderStats?.totalSpent || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                                            <td>
                                                <span className={`badge ${user.orderStats?.totalOrders > 5 ? 'badge-info' : 'badge-secondary'}`}>
                                                    {user.orderStats?.totalOrders > 10 ? 'VIP' : user.orderStats?.totalOrders > 5 ? 'Silver' : 'New'}
                                                </span>
                                            </td>
                                            <td>
                                                {user.isBlacklisted ? (
                                                    <span className="badge badge-danger">Blacklisted</span>
                                                ) : (
                                                    <span className="badge badge-success">Active</span>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        className="btn btn-primary"
                                                        style={{ padding: '0.4rem', background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
                                                        onClick={() => openMessageModal(user)}
                                                        title="Send Message"
                                                        disabled={user.isBlacklisted}
                                                    >
                                                        <MessageCircle size={16} />
                                                    </button>
                                                    <button
                                                        className={`btn ${user.isBlacklisted ? 'btn-success' : 'btn-secondary'}`}
                                                        style={{ padding: '0.4rem' }}
                                                        onClick={() => handleBlacklist(user._id, user.isBlacklisted)}
                                                        title={user.isBlacklisted ? "Unblacklist User" : "Blacklist User"}
                                                    >
                                                        {user.isBlacklisted ? <UserCheck size={16} /> : <UserMinus size={16} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem', gap: '1rem' }}>
                            <button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>
                                <ChevronLeft size={18} />
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center' }}>Page {page}</div>
                            <button className="btn btn-secondary" disabled={page * 15 >= total} onClick={() => setPage(page + 1)}>
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Broadcast Modal */}
            {showNotifyModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3 className="modal-title">Push Offers & Announcements</h3>
                            <button className="modal-close" onClick={() => setShowNotifyModal(false)} disabled={sending}>
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleBroadcast}>
                            <p style={{ marginBottom: '1.5rem', color: 'var(--gray-500)', fontSize: '0.875rem' }}>
                                This message will be sent instantly to all active users via the Telegram bot. Premium formatting (HTML) is supported.
                            </p>

                            <div className="form-group" style={{ position: 'relative' }}>
                                <label className="form-label">Quick Link a Product (Search)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Type to find a product..."
                                    value={productSearch}
                                    onChange={(e) => handleProductSearch(e.target.value)}
                                />
                                {searchResults.length > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        background: 'white',
                                        border: '1px solid var(--gray-200)',
                                        borderRadius: '0.5rem',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                        zIndex: 10,
                                        marginTop: '0.25rem'
                                    }}>
                                        {searchResults.map(prod => (
                                            <div
                                                key={prod._id}
                                                style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--gray-100)' }}
                                                onClick={() => applyProductOffer(prod)}
                                                className="search-item-hover"
                                            >
                                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{prod.name}</div>
                                                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                                                    <span>₹{prod.finalPrice}</span>
                                                    {prod.discount > 0 && <span style={{ color: 'var(--success)' }}>{prod.discount}% OFF</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Offer/Message Text (HTML supported)</label>
                                <textarea
                                    className="form-input"
                                    rows="5"
                                    required
                                    placeholder="e.g. <b>BIG BAZAAR OFFER!</b> Get 20% off on all items today! 🍎"
                                    value={notification.message}
                                    onChange={(e) => setNotification({ ...notification, message: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Image URL (Optional)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="https://images.unsplash.com/..."
                                    value={notification.imageUrl}
                                    onChange={(e) => setNotification({ ...notification, imageUrl: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ width: '100%', marginTop: '1rem' }}
                                disabled={sending}
                            >
                                {sending ? 'Sending...' : 'Confirm & Broadcast'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Individual User Message Modal */}
            {showMessageModal && selectedUser && (
                <div className="modal-overlay" onClick={() => setShowMessageModal(false)}>
                    <div className="modal user-message-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Send size={20} style={{ color: '#f97316' }} />
                                Send Message to User
                            </h3>
                            <button className="modal-close" onClick={() => setShowMessageModal(false)} disabled={sendingUserMessage}>
                                <XCircle size={24} />
                            </button>
                        </div>

                        {/* User Info Card */}
                        <div style={{
                            background: 'linear-gradient(135deg, #fff7ed, #ffedd5)',
                            borderRadius: '0.75rem',
                            padding: '1rem',
                            marginBottom: '1.5rem',
                            border: '1px solid #fed7aa'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #f97316, #ea580c)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '1.25rem',
                                    fontWeight: 700
                                }}>
                                    {selectedUser.firstName?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, color: '#c2410c' }}>
                                        {selectedUser.firstName} {selectedUser.lastName}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#9a3412' }}>
                                        @{selectedUser.username || 'telegram'} • ID: {selectedUser.telegramId}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span className={`badge ${selectedUser.orderStats?.totalOrders > 5 ? 'badge-info' : 'badge-secondary'}`}>
                                        {selectedUser.orderStats?.totalOrders > 10 ? '⭐ VIP' : selectedUser.orderStats?.totalOrders > 5 ? '🥈 Silver' : '🆕 New'}
                                    </span>
                                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#92400e' }}>
                                        {selectedUser.orderStats?.totalOrders || 0} orders
                                    </div>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSendUserMessage}>
                            {/* Quick Templates */}
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Clock size={16} />
                                    Quick Templates
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {messageTemplates.map(template => (
                                        <button
                                            key={template.id}
                                            type="button"
                                            onClick={() => applyTemplate(template)}
                                            style={{
                                                padding: '0.375rem 0.75rem',
                                                borderRadius: '2rem',
                                                border: '1px solid var(--gray-200)',
                                                background: 'white',
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseOver={e => {
                                                e.currentTarget.style.background = '#fff7ed';
                                                e.currentTarget.style.borderColor = '#fed7aa';
                                            }}
                                            onMouseOut={e => {
                                                e.currentTarget.style.background = 'white';
                                                e.currentTarget.style.borderColor = 'var(--gray-200)';
                                            }}
                                        >
                                            {template.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Product Search */}
                            <div className="form-group" style={{ position: 'relative' }}>
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Gift size={16} />
                                    Link a Product Offer (Search)
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Search products to create an offer..."
                                    value={userProductSearch}
                                    onChange={(e) => handleUserProductSearch(e.target.value)}
                                />
                                {userSearchResults.length > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        background: 'white',
                                        border: '1px solid var(--gray-200)',
                                        borderRadius: '0.5rem',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        zIndex: 10,
                                        marginTop: '0.25rem',
                                        maxHeight: '200px',
                                        overflowY: 'auto'
                                    }}>
                                        {userSearchResults.map(prod => (
                                            <div
                                                key={prod._id}
                                                style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--gray-100)' }}
                                                onClick={() => applyUserProductOffer(prod)}
                                                className="search-item-hover"
                                            >
                                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{prod.name}</div>
                                                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                                                    <span>₹{prod.finalPrice}</span>
                                                    {prod.discount > 0 && <span style={{ color: 'var(--success)' }}>{prod.discount}% OFF</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Message Text */}
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <MessageCircle size={16} />
                                    Message (HTML supported)
                                </label>
                                <textarea
                                    className="form-input"
                                    rows="6"
                                    required
                                    placeholder="Write your personalized message here...

Example:
<b>🎉 Special Just for You!</b>

Hi there! We have an exclusive offer waiting..."
                                    value={userMessage.message}
                                    onChange={(e) => setUserMessage({ ...userMessage, message: e.target.value })}
                                    style={{ resize: 'vertical', minHeight: '120px' }}
                                />
                            </div>

                            {/* Image URL */}
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Tag size={16} />
                                    Image URL (Optional)
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="https://example.com/image.jpg"
                                    value={userMessage.imageUrl}
                                    onChange={(e) => setUserMessage({ ...userMessage, imageUrl: e.target.value })}
                                />
                                {userMessage.imageUrl && (
                                    <div style={{ marginTop: '0.5rem', borderRadius: '0.5rem', overflow: 'hidden', maxHeight: '100px' }}>
                                        <img
                                            src={userMessage.imageUrl}
                                            alt="Preview"
                                            style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '0.5rem' }}
                                            onError={(e) => e.target.style.display = 'none'}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-200)' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ flex: 1 }}
                                    onClick={() => setShowMessageModal(false)}
                                    disabled={sendingUserMessage}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{
                                        flex: 2,
                                        background: 'linear-gradient(135deg, #f97316, #ea580c)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                    }}
                                    disabled={sendingUserMessage || !userMessage.message}
                                >
                                    {sendingUserMessage ? (
                                        <>
                                            <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            Send to {selectedUser.firstName}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
