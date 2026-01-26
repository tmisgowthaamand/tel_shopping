import React, { useState, useEffect } from 'react';
import {
    TrendingUp,
    ShoppingCart,
    Users,
    Package,
    DollarSign,
    Clock,
    AlertTriangle,
    CheckCircle,
    ArrowRight
} from 'lucide-react';
import { orderApi, productApi, userApi } from '../services/api';

const Dashboard = () => {
    const [stats, setStats] = useState({
        orders: { totalOrders: 0, pendingOrders: 0, totalRevenue: 0 },
        products: { totalProducts: 0, lowStock: 0 },
        users: { total: 0 },
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [orderStats, productStats, userStats, latestOrders] = await Promise.all([
                    orderApi.getStats(),
                    productApi.getStats(),
                    userApi.getStats(),
                    orderApi.getOrders({ limit: 5 })
                ]);

                setStats({
                    orders: orderStats.data,
                    products: productStats.data,
                    users: userStats.data,
                });
                setRecentOrders(latestOrders.data.orders);
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    const statCards = [
        { label: 'Total Revenue', value: `₹${stats.orders.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'success' },
        { label: 'Total Orders', value: stats.orders.totalOrders, icon: ShoppingCart, color: 'primary' },
        { label: 'Total Users', value: stats.users.total, icon: Users, color: 'info' },
        { label: 'Active Products', value: stats.products.activeProducts, icon: Package, color: 'warning' },
    ];

    return (
        <div className="dashboard">
            {/* Stats Grid */}
            <div className="stats-grid">
                {statCards.map((stat, index) => (
                    <div key={index} className="stat-card">
                        <div className={`stat-icon ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div className="stat-content">
                            <p>{stat.label}</p>
                            <h3>{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                {/* Recent Orders */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Recent Orders</h3>
                        <button className="btn btn-secondary">View All <ArrowRight size={16} /></button>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Customer</th>
                                    <th>Partner</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.map((order) => (
                                    <tr key={order._id}>
                                        <td style={{ fontWeight: 600 }}>{order.orderId}</td>
                                        <td>{order.user?.firstName} {order.user?.lastName}</td>
                                        <td>
                                            {order.deliveryPartner ? (
                                                <span style={{ fontSize: '0.875rem' }}>{order.deliveryPartner.name}</span>
                                            ) : (
                                                <span style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>None</span>
                                            )}
                                        </td>
                                        <td>₹{order.total}</td>
                                        <td>
                                            <span className={`badge badge-${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Operational Alerts */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Operational Alerts</h3>
                    </div>
                    <div className="alerts-list">
                        {stats.orders.pendingOrders > 0 && (
                            <div style={{ display: 'flex', gap: '1rem', padding: '1rem', background: '#fffbeb', borderRadius: '0.75rem', marginBottom: '1rem' }}>
                                <Clock className="text-warning" size={24} />
                                <div>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>{stats.orders.pendingOrders} Pending Orders</h4>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>Action required for payment confirmation</p>
                                </div>
                            </div>
                        )}

                        {stats.products.lowStock > 0 && (
                            <div style={{ display: 'flex', gap: '1rem', padding: '1rem', background: '#fef2f2', borderRadius: '0.75rem', marginBottom: '1rem' }}>
                                <AlertTriangle className="text-danger" size={24} />
                                <div>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>{stats.products.lowStock} Low Stock Products</h4>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>Items are below the threshold level</p>
                                </div>
                            </div>
                        )}

                        {stats.orders.confirmedOrders > 0 && (
                            <div style={{ display: 'flex', gap: '1rem', padding: '1rem', background: '#f0fdf4', borderRadius: '0.75rem' }}>
                                <CheckCircle className="text-success" size={24} />
                                <div>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>{stats.orders.confirmedOrders} Ready for Prep</h4>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>Orders confirmed and ready to be fulfilled</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const getStatusColor = (status) => {
    switch (status) {
        case 'delivered': return 'success';
        case 'pending': return 'warning';
        case 'cancelled': return 'danger';
        case 'confirmed': return 'info';
        case 'out_for_delivery': return 'info';
        default: return 'secondary';
    }
};

export default Dashboard;
