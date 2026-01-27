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
    XCircle
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
        </div>
    );
};

export default Users;
