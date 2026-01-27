import React, { useState, useEffect } from 'react';
import {
    Bike,
    CheckCircle,
    XCircle,
    MapPin,
    Phone,
    Star,
    DollarSign,
    MoreVertical,
    Plus,
    ShieldCheck,
    AlertCircle
} from 'lucide-react';
import { partnerApi } from '../services/api';

const Partners = () => {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, active: 0, online: 0 });
    const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
    const [newPartnerData, setNewPartnerData] = useState({
        telegramId: '',
        name: '',
        phone: '',
        password: '',
        vehicleType: 'bike'
    });

    useEffect(() => {
        fetchPartners();
    }, []);

    const fetchPartners = async () => {
        setLoading(true);
        try {
            const [response, statResponse] = await Promise.all([
                partnerApi.getPartners(),
                partnerApi.getStats()
            ]);
            setPartners(response.data.partners);
            setStats(statResponse.data);
        } catch (error) {
            console.error('Error fetching partners:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (id) => {
        try {
            await partnerApi.toggleActive(id);
            fetchPartners();
        } catch (error) {
            alert('Action failed: ' + error.message);
        }
    };

    const handleVerify = async (id) => {
        try {
            await partnerApi.verify(id);
            fetchPartners();
        } catch (error) {
            alert('Verification failed: ' + error.message);
        }
    };

    const handleAddPartner = async (e) => {
        e.preventDefault();
        try {
            await partnerApi.createPartner({
                ...newPartnerData,
                isActive: true,
                isOnline: true,
                isAvailable: true,
                documents: { verified: true }
            });
            setShowAddPartnerModal(false);
            setNewPartnerData({ telegramId: '', name: '', phone: '', password: '', vehicleType: 'bike' });
            fetchPartners();
        } catch (error) {
            alert('Failed to add partner: ' + error.message);
        }
    };

    return (
        <div className="partners-page">
            {/* Stats Summary */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon primary"><Bike size={24} /></div>
                    <div className="stat-content">
                        <p>Total Partners</p>
                        <h3>{stats.total}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon success"><CheckCircle size={24} /></div>
                    <div className="stat-content">
                        <p>Active (Verified)</p>
                        <h3>{stats.active}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon info" style={{ background: 'var(--info)' }}><MapPin size={24} /></div>
                    <div className="stat-content">
                        <p>Duty (Online)</p>
                        <h3>{stats.online}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon warning"><AlertCircle size={24} /></div>
                    <div className="stat-content">
                        <p>Pending Approval</p>
                        <h3>{stats.total - stats.active}</h3>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                <button className="btn btn-primary" onClick={() => setShowAddPartnerModal(true)}>
                    <Plus size={18} /> New Partner
                </button>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner"></div></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {partners.map((partner) => (
                        <div key={partner._id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Bike size={28} color="var(--primary)" />
                                    </div>
                                    <div>
                                        <h4 style={{ fontWeight: 600, fontSize: '1.125rem' }}>{partner.name}</h4>
                                        <span className={`badge ${partner.isOnline ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: '0.65rem' }}>
                                            {partner.isOnline ? 'Online' : 'Offline'}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#f59e0b', fontWeight: 600 }}>
                                        <Star size={14} fill="#f59e0b" /> {partner.stats?.averageRating ? partner.stats.averageRating.toFixed(1) : '5.0'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{partner.stats?.totalDeliveries || 0} trips</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
                                    <Phone size={16} color="var(--gray-400)" /> {partner.phone}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
                                    <Bike size={16} color="var(--gray-400)" /> {partner.vehicleType?.toUpperCase()} - {partner.vehicleNumber || 'No Number'}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderTop: '1px solid var(--gray-100)', marginBottom: '1rem' }}>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Total Earnings</p>
                                    <p style={{ fontWeight: 700 }}>₹{partner.stats?.totalEarnings || 0}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Completed Steps</p>
                                    <p style={{ fontWeight: 700, color: 'var(--success)' }}>{partner.stats?.completedDeliveries || 0} / {partner.stats?.totalDeliveries || 0}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Pending</p>
                                    <p style={{ fontWeight: 700, color: 'var(--warning)' }}>₹{partner.stats?.pendingEarnings || 0}</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {!partner.documents?.verified ? (
                                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleVerify(partner._id)}>
                                        <ShieldCheck size={16} /> Verify Docs
                                    </button>
                                ) : (
                                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => handleToggleActive(partner._id)}>
                                        {partner.isActive ? <XCircle size={16} color="var(--danger)" /> : <CheckCircle size={16} color="var(--success)" />}
                                        {partner.isActive ? 'Suspend' : 'Activate'}
                                    </button>
                                )}
                                <button className="btn btn-secondary" style={{ padding: '0.5rem' }}>
                                    <MoreVertical size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Manual Partner Enrollment Modal */}
            {showAddPartnerModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3 className="modal-title">Manual Partner Enrollment</h3>
                            <button className="modal-close" onClick={() => setShowAddPartnerModal(false)}>
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddPartner}>
                            <p style={{ marginBottom: '1.5rem', color: 'var(--gray-500)', fontSize: '0.875rem' }}>
                                Partners usually register via the Telegram bot. Use this only for corporate accounts.
                            </p>
                            <div className="form-group">
                                <label className="form-label">Telegram ID</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. 123456789"
                                    required
                                    value={newPartnerData.telegramId}
                                    onChange={(e) => setNewPartnerData({ ...newPartnerData, telegramId: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    required
                                    value={newPartnerData.name}
                                    onChange={(e) => setNewPartnerData({ ...newPartnerData, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone Number</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="+91 0000000000"
                                    required
                                    value={newPartnerData.phone}
                                    onChange={(e) => setNewPartnerData({ ...newPartnerData, phone: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Portal Password</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="Set login password"
                                    required
                                    value={newPartnerData.password}
                                    onChange={(e) => setNewPartnerData({ ...newPartnerData, password: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Vehicle Type</label>
                                <select
                                    className="form-input"
                                    value={newPartnerData.vehicleType}
                                    onChange={(e) => setNewPartnerData({ ...newPartnerData, vehicleType: e.target.value })}
                                >
                                    <option value="bike">Bike</option>
                                    <option value="scooter">Scooter</option>
                                    <option value="bicycle">Bicycle</option>
                                    <option value="car">Car</option>
                                </select>
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                                Create Partner
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Partners;
