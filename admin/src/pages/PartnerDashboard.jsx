import React, { useState, useEffect } from 'react';
import {
    Package,
    MapPin,
    Phone,
    Truck,
    CheckCircle,
    Clock,
    LogOut,
    RefreshCw,
    Smartphone,
    Banknote
} from 'lucide-react';
import { partnerPortalApi } from '../services/api';

const PartnerDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [partner, setPartner] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ordersRes, partnerRes] = await Promise.all([
                partnerPortalApi.getAssignedOrders(),
                partnerPortalApi.getMe()
            ]);
            setOrders(ordersRes.data);
            setPartner(partnerRes.data);
        } catch (error) {
            console.error('Error fetching partner data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('atz_partner_token');
        window.location.href = '/partner/login';
    };

    const handleUpdateStatus = async (orderId, status, paymentType = null) => {
        setUpdating(true);
        try {
            await partnerPortalApi.updateOrderStatus({ orderId, status, paymentType });
            setShowPaymentModal(false);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to update order');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--gray-100)', padding: '1rem' }}>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                background: 'white',
                padding: '1rem',
                borderRadius: '1rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: 'var(--primary)', color: 'white', padding: '0.5rem', borderRadius: '0.75rem' }}>
                        <Truck size={24} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{partner?.name}</h2>
                        <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Delivery Partner Portal</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-secondary" onClick={fetchData}>
                        <RefreshCw size={18} />
                    </button>
                    <button className="btn btn-danger" onClick={handleLogout}>
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Package size={20} color="var(--primary)" />
                    Assigned Deliveries ({orders.length})
                </h3>

                {orders.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <div style={{ color: 'var(--gray-300)', marginBottom: '1rem' }}>
                            <Truck size={64} style={{ margin: '0 auto' }} />
                        </div>
                        <h4 style={{ color: 'var(--gray-800)' }}>No active deliveries</h4>
                        <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
                            Go online in the Telegram bot to receive new orders!
                        </p>
                    </div>
                ) : (
                    orders.map(order => (
                        <div key={order._id} className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>#{order.orderId}</span>
                                <span className={`badge badge-${order.status === 'out_for_delivery' ? 'info' : 'warning'}`}>
                                    {order.status.replace(/_/g, ' ').toUpperCase()}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <MapPin size={20} color="var(--danger)" style={{ flexShrink: 0 }} />
                                    <div>
                                        <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Delivery Address</p>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>{order.deliveryAddress.address}</p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <Phone size={20} color="var(--success)" style={{ flexShrink: 0 }} />
                                    <div>
                                        <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Customer Contact</p>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                                            {order.user?.firstName} {order.user?.lastName}
                                            <br />
                                            {order.user?.phone}
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <Banknote size={20} color="var(--info)" style={{ flexShrink: 0 }} />
                                    <div>
                                        <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Payment Status</p>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                                            {order.paymentMethod.toUpperCase()} | ₹{order.total.toLocaleString('en-IN')}
                                            <span style={{ marginLeft: '0.5rem' }} className={`badge badge-${order.paymentStatus === 'completed' ? 'success' : 'secondary'}`}>
                                                {order.paymentStatus}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                {order.status !== 'out_for_delivery' ? (
                                    <button
                                        className="btn btn-primary"
                                        style={{ gridColumn: 'span 2' }}
                                        onClick={() => handleUpdateStatus(order._id, 'out_for_delivery')}
                                        disabled={updating}
                                    >
                                        <Truck size={18} /> Start Delivery / Picked Up
                                    </button>
                                ) : (
                                    <button
                                        className="btn btn-success"
                                        style={{ gridColumn: 'span 2' }}
                                        onClick={() => {
                                            if (order.paymentMethod === 'cod') {
                                                setSelectedOrder(order);
                                                setShowPaymentModal(true);
                                            } else {
                                                handleUpdateStatus(order._id, 'delivered');
                                            }
                                        }}
                                        disabled={updating}
                                    >
                                        <CheckCircle size={18} /> Mark as Delivered
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Payment Verification Modal */}
            {showPaymentModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{
                                background: '#fef3c7',
                                color: '#d97706',
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1rem'
                            }}>
                                <Banknote size={32} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Confirm Payment</h3>
                            <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                Collecting ₹{selectedOrder?.total.toLocaleString('en-IN')} for COD order.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            <button
                                className="btn"
                                style={{
                                    background: '#f8fafb',
                                    border: '1px solid var(--gray-200)',
                                    padding: '1rem',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: '0.75rem',
                                    fontWeight: 600
                                }}
                                onClick={() => handleUpdateStatus(selectedOrder._id, 'delivered', 'cash')}
                            >
                                <Banknote size={20} color="var(--success)" /> Paid via Cash
                            </button>
                            <button
                                className="btn"
                                style={{
                                    background: '#f8fafb',
                                    border: '1px solid var(--gray-200)',
                                    padding: '1rem',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: '0.75rem',
                                    fontWeight: 600
                                }}
                                onClick={() => handleUpdateStatus(selectedOrder._id, 'delivered', 'upi')}
                            >
                                <Smartphone size={20} color="var(--info)" /> Paid via UPI / QR
                            </button>
                            <button
                                className="btn btn-secondary"
                                style={{ marginTop: '0.5rem' }}
                                onClick={() => setShowPaymentModal(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PartnerDashboard;
