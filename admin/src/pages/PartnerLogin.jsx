import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Lock, Loader2, AlertCircle, Truck, Check } from 'lucide-react';
import { partnerPortalApi } from '../services/api';

const PartnerLogin = () => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Check for saved credentials on load
    useEffect(() => {
        const savedPhone = localStorage.getItem('atz_partner_rem_phone');
        const savedPassword = localStorage.getItem('atz_partner_rem_pass');
        if (savedPhone && savedPassword) {
            setPhone(savedPhone);
            setPassword(savedPassword);
            setRememberMe(true);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await partnerPortalApi.login({ phone, password });
            localStorage.setItem('atz_partner_token', response.data.token);

            // Handle Remember Me
            if (rememberMe) {
                localStorage.setItem('atz_partner_rem_phone', phone);
                localStorage.setItem('atz_partner_rem_pass', password);
            } else {
                localStorage.removeItem('atz_partner_rem_phone');
                localStorage.removeItem('atz_partner_rem_pass');
            }

            navigate('/partner/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                    <div style={{ background: 'var(--primary)', padding: '0.75rem', borderRadius: '1rem', color: 'white' }}>
                        <Truck size={32} />
                    </div>
                </div>
                <h1>Partner Portal</h1>
                <p>Delivery Partner Login</p>

                {error && (
                    <div className="badge badge-danger" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Phone Number</label>
                        <div style={{ position: 'relative' }}>
                            <Phone
                                size={18}
                                style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}
                            />
                            <input
                                type="text"
                                className="form-input"
                                style={{ paddingLeft: '3rem' }}
                                placeholder="Enter registered phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock
                                size={18}
                                style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}
                            />
                            <input
                                type="password"
                                className="form-input"
                                style={{ paddingLeft: '3rem' }}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                            <div
                                onClick={() => setRememberMe(!rememberMe)}
                                style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '4px',
                                    border: '2px solid' + (rememberMe ? ' var(--primary)' : ' var(--gray-300)'),
                                    background: rememberMe ? 'var(--primary)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {rememberMe && <Check size={12} color="white" strokeWidth={4} />}
                            </div>
                            Remember me
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '1rem', height: '3rem', fontSize: '1rem' }}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="spinner" size={20} /> : 'Login to Dashboard'}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>
                        Don't have a partner account?
                        <br />
                        Register via our Telegram Bot.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PartnerLogin;
