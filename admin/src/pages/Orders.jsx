import React, { useState, useEffect } from 'react';
import {
    Search,
    Filter,
    Eye,
    MoreVertical,
    Check,
    X,
    Truck,
    Clock,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    AlertTriangle
} from 'lucide-react';
import { orderApi, partnerApi } from '../services/api';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [partners, setPartners] = useState([]);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancellingOrderId, setCancellingOrderId] = useState(null);

    useEffect(() => {
        fetchOrders();
        fetchPartners();
    }, [page, statusFilter]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const response = await orderApi.getOrders({
                page,
                limit: 10,
                status: statusFilter || undefined
            });
            setOrders(response.data.orders);
            setTotal(response.data.total);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPartners = async () => {
        try {
            const response = await partnerApi.getPartners({ online: true, active: true });
            setPartners(response.data.partners);
        } catch (error) {
            console.error('Error fetching partners:', error);
        }
    };

    const handleUpdateStatus = async (orderId, status) => {
        try {
            await orderApi.updateStatus(orderId, status, `Updated by Admin`);
            fetchOrders();
            if (selectedOrder && selectedOrder._id === orderId) {
                const updated = await orderApi.getOrder(orderId);
                setSelectedOrder(updated.data);
            }
        } catch (error) {
            alert('Failed to update status: ' + error.message);
        }
    };

    const handleCancelOrder = async () => {
        if (!cancelReason.trim()) return;
        try {
            await orderApi.cancelOrder(cancellingOrderId, cancelReason);
            setShowCancelModal(false);
            setCancelReason('');
            fetchOrders();
            if (selectedOrder && selectedOrder._id === cancellingOrderId) {
                const updated = await orderApi.getOrder(cancellingOrderId);
                setSelectedOrder(updated.data);
            }
        } catch (error) {
            alert('Failed to cancel order: ' + error.message);
        }
    };

    const handleAssignPartner = async (orderId, partnerId) => {
        try {
            await orderApi.assignPartner(orderId, partnerId);
            alert('Partner assigned successfully');
            fetchOrders();
            if (selectedOrder && selectedOrder._id === orderId) {
                const updated = await orderApi.getOrder(orderId);
                setSelectedOrder(updated.data);
            }
        } catch (error) {
            alert('Assignment failed: ' + error.message);
        }
    };

    return (
        <div className="orders-page">
            {/* Filters */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', flex: 1 }}>
                        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                            <Search
                                size={18}
                                style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}
                            />
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Search Order ID or Customer..."
                                style={{ paddingLeft: '3rem' }}
                            />
                        </div>
                        <select
                            className="form-input"
                            style={{ width: '200px' }}
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="preparing">Preparing</option>
                            <option value="out_for_delivery">Out for Delivery</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <button className="btn btn-secondary">
                        <Filter size={18} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Orders Table */}
            <div className="card">
                {loading ? (
                    <div className="loading"><div className="spinner"></div></div>
                ) : (
                    <>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Customer</th>
                                        <th>Items</th>
                                        <th>Total</th>
                                        <th>Status</th>
                                        <th>Partner</th>
                                        <th>Payment</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order) => (
                                        <tr key={order._id}>
                                            <td style={{ fontWeight: 600 }}>{order.orderId}</td>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{order.user?.firstName} {order.user?.lastName}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{order.user?.phone}</div>
                                            </td>
                                            <td>{order.items.length} items</td>
                                            <td style={{ fontWeight: 600 }}>₹{Number(order.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            <td>
                                                <span className={`badge badge-${getStatusColor(order.status)}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td>
                                                {order.deliveryPartner ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <Truck size={14} color="var(--primary)" />
                                                        <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{order.deliveryPartner.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="badge badge-secondary" style={{ opacity: 0.6 }}>Unassigned</span>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                                        {order.verifiedPaymentType
                                                            ? `${order.paymentMethod.toUpperCase()} (${order.verifiedPaymentType.toUpperCase()})`
                                                            : order.paymentMethod.toUpperCase()}
                                                    </span>
                                                    <span className={`badge badge-${order.paymentStatus === 'completed' ? 'success' : 'warning'}`} style={{ fontSize: '0.7rem', width: 'fit-content' }}>
                                                        {order.paymentStatus.toUpperCase()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '0.875rem' }}>{new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.4rem' }}
                                                        onClick={() => {
                                                            setSelectedOrder(order);
                                                            setShowDetailModal(true);
                                                        }}
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    {order.status === 'confirmed' && (
                                                        <button
                                                            className="btn btn-primary"
                                                            style={{ padding: '0.4rem' }}
                                                            onClick={() => handleUpdateStatus(order._id, 'preparing')}
                                                            title="Prepare Order"
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '0 1rem' }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>
                                Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, total)} of {total} results
                            </p>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    className="btn btn-secondary"
                                    disabled={page === 1}
                                    onClick={() => setPage(page - 1)}
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    disabled={page * 10 >= total}
                                    onClick={() => setPage(page + 1)}
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedOrder && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '800px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Order Details: {selectedOrder.orderId}</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowDetailModal(false)}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div>
                                <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--gray-200)', paddingBottom: '0.5rem', fontWeight: 700 }}>Items Summary</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {selectedOrder.items.map((item, idx) => (
                                        <div key={idx} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.75rem',
                                            background: '#f8fafc',
                                            borderRadius: '0.75rem',
                                            border: '1px solid #e2e8f0'
                                        }}>
                                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1 }}>
                                                <div style={{
                                                    width: '50px',
                                                    height: '50px',
                                                    background: 'white',
                                                    borderRadius: '0.5rem',
                                                    border: '1px solid #edf2f7',
                                                    backgroundImage: item.productImage ? `url(${item.productImage})` : 'none',
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    {!item.productImage && <ShoppingBag size={20} style={{ margin: '15px', color: '#cbd5e0' }} />}
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1a202c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {item.productName}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: '0.25rem' }}>
                                                        {item.quantity} × <span style={{ textDecoration: 'line-through', marginRight: '4px' }}>₹{item.price.toFixed(0)}</span>
                                                        <b style={{ color: 'var(--primary)' }}>₹{item.finalPrice.toFixed(2)}</b>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ fontWeight: 800, color: '#2d3748', marginLeft: '1rem' }}>
                                                ₹{Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{
                                    marginTop: '1.5rem',
                                    padding: '1.25rem',
                                    background: 'var(--gray-50)',
                                    borderRadius: '1rem',
                                    border: '1px solid var(--gray-200)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                        <span style={{ color: 'var(--gray-600)' }}>Subtotal (Original)</span>
                                        <span style={{ textDecoration: 'line-through', color: 'var(--gray-400)' }}>₹{Number(selectedOrder.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#059669', fontWeight: 600 }}>
                                        <span>Discount Savings</span>
                                        <span>-₹{Number(selectedOrder.discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                                        <span>Delivery Fee</span>
                                        <span>₹{Number(selectedOrder.deliveryFee).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontWeight: 900,
                                        fontSize: '1.25rem',
                                        color: 'var(--primary)',
                                        marginTop: '0.75rem',
                                        paddingTop: '0.75rem',
                                        borderTop: '2px solid #e2e8f0'
                                    }}>
                                        <span>Grand Total</span>
                                        <span>₹{Number(selectedOrder.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    {selectedOrder.verifiedPaymentType && (
                                        <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                                            <span style={{
                                                background: '#dcfce7',
                                                color: '#166534',
                                                padding: '0.4rem 1rem',
                                                borderRadius: '2rem',
                                                fontSize: '0.75rem',
                                                fontWeight: 800,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                border: '1px solid #bbf7d0'
                                            }}>
                                                <Check size={14} /> VERIFIED BY PARTNER: {selectedOrder.verifiedPaymentType.toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--gray-200)', paddingBottom: '0.5rem' }}>Service Info</h4>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <p className="form-label" style={{ fontWeight: 700 }}>Delivery Information</p>
                                    <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'flex-start',
                                        background: '#f1f5f9', 
                                        padding: '1rem', 
                                        borderRadius: '1rem',
                                        border: '1px solid #e2e8f0'
                                    }}>
                                        <div style={{ fontSize: '0.875rem', color: '#334155', flex: 1, marginRight: '1rem', lineHeight: '1.5' }}>
                                            {selectedOrder.deliveryAddress.address}
                                        </div>
                                        <a 
                                            href={selectedOrder.deliveryAddress.address.startsWith('http') ? selectedOrder.deliveryAddress.address : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrder.deliveryAddress.address)}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            title="Open Maps"
                                            style={{ 
                                                color: 'var(--primary)', 
                                                padding: '0.6rem', 
                                                borderRadius: '0.75rem', 
                                                background: 'white', 
                                                border: '1px solid #e2e8f0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                            }}
                                        >
                                            <ExternalLink size={18} />
                                        </a>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Assign Delivery Partner</label>
                                    <select
                                        className="form-input"
                                        onChange={(e) => handleAssignPartner(selectedOrder._id, e.target.value)}
                                        value={selectedOrder.deliveryPartner?._id || ""}
                                        disabled={['delivered', 'cancelled'].includes(selectedOrder.status)}
                                    >
                                        <option value="">{selectedOrder.deliveryPartner ? selectedOrder.deliveryPartner.name : "Select Partner"}</option>
                                        {partners
                                            .filter(p => !selectedOrder.deliveryPartner || p._id !== selectedOrder.deliveryPartner._id)
                                            .map(p => (
                                                <option key={p._id} value={p._id}>{p.name} ({p.vehicleType})</option>
                                            ))
                                        }
                                    </select>
                                </div>

                                <div style={{
                                    padding: '1.25rem',
                                    background: '#fff',
                                    borderRadius: '1rem',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                }}>
                                    <label className="form-label" style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Management Actions</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        {['pending', 'confirmed'].includes(selectedOrder.status) && (
                                            <button
                                                className="btn btn-success"
                                                onClick={() => handleUpdateStatus(selectedOrder._id, 'preparing')}
                                            >
                                                <Check size={18} /> Mark Preparing
                                            </button>
                                        )}
                                        {selectedOrder.status === 'preparing' && (
                                            <button
                                                className="btn btn-info"
                                                onClick={() => handleUpdateStatus(selectedOrder._id, 'out_for_delivery')}
                                            >
                                                <Truck size={18} /> Out for Delivery
                                            </button>
                                        )}
                                        {selectedOrder.status === 'out_for_delivery' && (
                                            <button
                                                className="btn btn-success"
                                                onClick={() => handleUpdateStatus(selectedOrder._id, 'delivered')}
                                            >
                                                <Check size={18} /> Complete Order
                                            </button>
                                        )}
                                        <button
                                            className="btn btn-danger"
                                            style={{ gridColumn: (['delivered', 'cancelled'].includes(selectedOrder.status)) ? 'span 2' : 'auto' }}
                                            onClick={() => {
                                                setCancellingOrderId(selectedOrder._id);
                                                setShowCancelModal(true);
                                            }}
                                            disabled={['delivered', 'cancelled'].includes(selectedOrder.status)}
                                        >
                                            <X size={18} /> Cancel Order
                                        </button>
                                    </div>

                                    {['delivered', 'cancelled'].includes(selectedOrder.status) && (
                                        <p style={{
                                            marginTop: '0.75rem',
                                            fontSize: '0.75rem',
                                            textAlign: 'center',
                                            color: 'var(--gray-500)',
                                            background: 'var(--gray-50)',
                                            padding: '0.5rem',
                                            borderRadius: '0.5rem'
                                        }}>
                                            Order is {selectedOrder.status}. Further actions are disabled.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modern Cancellation Modal */}
            {showCancelModal && (
                <div className="modal-overlay" style={{ zIndex: 1100 }}>
                    <div className="modal" style={{ maxWidth: '400px', animation: 'slideIn 0.3s ease-out' }}>
                        <div className="modal-header">
                            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
                                <AlertTriangle size={20} /> Cancel Order
                            </h3>
                            <button className="modal-close" onClick={() => setShowCancelModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ padding: '0.5rem 0' }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '1rem' }}>
                                Please provide a reason for cancelling this order. This will be sent to the customer.
                            </p>

                            <div className="form-group">
                                <label className="form-label">Cancellation Reason</label>
                                <textarea
                                    className="form-input"
                                    placeholder="e.g., Item out of stock, Store closed, etc."
                                    rows="3"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    autoFocus
                                    style={{ borderColor: cancelReason.trim() ? 'var(--gray-300)' : 'rgba(239, 68, 68, 0.3)' }}
                                ></textarea>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button
                                className="btn btn-secondary"
                                style={{ flex: 1 }}
                                onClick={() => setShowCancelModal(false)}
                            >
                                Not Now
                            </button>
                            <button
                                className="btn btn-danger"
                                style={{ flex: 2 }}
                                disabled={!cancelReason.trim()}
                                onClick={handleCancelOrder}
                            >
                                Confirm Cancellation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const getStatusColor = (status) => {
    switch (status) {
        case 'delivered': return 'success';
        case 'pending': return 'warning';
        case 'cancelled': return 'danger';
        case 'confirmed': return 'info';
        case 'preparing': return 'info';
        case 'out_for_delivery': return 'info';
        default: return 'secondary';
    }
};

export default Orders;
