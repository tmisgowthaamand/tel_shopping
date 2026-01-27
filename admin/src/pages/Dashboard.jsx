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
import { useNavigate, Link } from 'react-router-dom';
import { orderApi, productApi, userApi } from '../services/api';

const Dashboard = () => {
    const [stats, setStats] = useState({
        orders: { totalOrders: 0, pendingOrders: 0, totalRevenue: 0, todayRevenue: 0 },
        products: { totalProducts: 0, lowStock: 0 },
        users: { total: 0 },
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

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
        { label: 'Total Revenue', value: `₹${Number(stats.orders.totalRevenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, color: 'success', sub: 'Gross earnings' },
        { label: "Today's Revenue", value: `₹${Number(stats.orders.todayRevenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUp, color: 'info', sub: 'Last 24 hours' },
        { label: 'Total Orders', value: stats.orders.totalOrders, icon: ShoppingCart, color: 'primary', sub: 'Orders placed' },
        { label: 'Total Users', value: stats.users.total, icon: Users, color: 'info', sub: 'Registered customers' },
        { label: 'Unique SKUs', value: stats.products.totalProducts, icon: Package, color: 'warning', sub: 'Product variety' },
    ];

    return (
        <div className="dashboard">
            {/* Revenue Highlights */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="card" style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ fontSize: '0.875rem', opacity: 0.9, fontWeight: 600 }}>TOTAL REVENUE</p>
                            <h2 style={{ fontSize: '2.5rem', margin: '0.5rem 0', fontWeight: 800 }}>
                                ₹{Number(stats.orders.totalRevenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </h2>
                            <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Lifetime completed sales</p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '1rem', borderRadius: '1rem' }}>
                            <DollarSign size={40} />
                        </div>
                    </div>
                </div>

                <div className="card" style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: 'white',
                    border: 'none'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ fontSize: '0.875rem', opacity: 0.9, fontWeight: 600 }}>TODAY'S REVENUE</p>
                            <h2 style={{ fontSize: '2.5rem', margin: '0.5rem 0', fontWeight: 800 }}>
                                ₹{Number(stats.orders.todayRevenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </h2>
                            <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Sales since midnight</p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '1rem', borderRadius: '1rem' }}>
                            <TrendingUp size={40} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
                {statCards
                    .filter(s => s.label !== 'Total Revenue' && s.label !== "Today's Revenue")
                    .map((stat, index) => (
                        <div key={index} className="stat-card" style={{
                            border: '1px solid var(--gray-200)',
                            transition: 'transform 0.2s',
                            cursor: 'default'
                        }}>
                            <div className={`stat-icon ${stat.color}`} style={{ borderRadius: '1rem' }}>
                                <stat.icon size={20} />
                            </div>
                            <div className="stat-content">
                                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
                                <h3 style={{ fontSize: '1.5rem', margin: '0.25rem 0' }}>{stat.value}</h3>
                                <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>{stat.sub}</span>
                            </div>
                        </div>
                    ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                {/* Recent Orders */}
                <div className="card" style={{ border: '1px solid var(--gray-200)' }}>
                    <div className="card-header">
                        <h3 className="card-title">Recent Orders</h3>
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate('/orders')}
                            style={{ gap: '0.5rem', padding: '0.4rem 0.8rem' }}
                        >
                            View All <ArrowRight size={14} />
                        </button>
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
                                        <td>₹{Number(order.total).toFixed(2)}</td>
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
