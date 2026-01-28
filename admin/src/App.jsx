import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Users from './pages/Users';
import Partners from './pages/Partners';
import PartnerLogin from './pages/PartnerLogin';
import PartnerDashboard from './pages/PartnerDashboard';
import Notifications from './pages/Notifications';

// Auth Guard for Admin
const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('atz_admin_token');
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

// Auth Guard for Delivery Partners
const PartnerProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('atz_partner_token');
    if (!token) {
        return <Navigate to="/partner/login" replace />;
    }
    return children;
};

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/partner/login" element={<PartnerLogin />} />

                <Route
                    path="/partner/dashboard"
                    element={
                        <PartnerProtectedRoute>
                            <PartnerDashboard />
                        </PartnerProtectedRoute>
                    }
                />

                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <Dashboard />
                            </Layout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/orders"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <Orders />
                            </Layout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/products"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <Products />
                            </Layout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/users"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <Users />
                            </Layout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/partners"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <Partners />
                            </Layout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/settings"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <div className="card">
                                    <h3 className="card-title">System Settings</h3>
                                    <p style={{ marginTop: '1rem', color: 'var(--gray-500)' }}>
                                        Advanced configuration for delivery radius, base fees, and tax rates.
                                        This module is currently under development.
                                    </p>
                                </div>
                            </Layout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/notifications"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <Notifications />
                            </Layout>
                        </ProtectedRoute>
                    }
                />

                {/* Redirect unknown routes */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
};

export default App;
