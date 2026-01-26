import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Users,
    Bike,
    Settings,
    LogOut,
    Bell,
    Menu,
    X
} from 'lucide-react';

const Layout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Orders', path: '/orders', icon: ShoppingCart },
        { name: 'Products', path: '/products', icon: Package },
        { name: 'Users', path: '/users', icon: Users },
        { name: 'Delivery Partners', path: '/partners', icon: Bike },
        { name: 'Settings', path: '/settings', icon: Settings },
    ];

    const handleLogout = () => {
        localStorage.removeItem('atz_admin_token');
        navigate('/login');
    };

    return (
        <div className="app-container">
            {/* Sidebar */}
            <aside className={`sidebar ${isMobileMenuOpen ? 'active' : ''}`}>
                <div className="sidebar-logo">
                    <div className="stat-icon primary" style={{ width: '32px', height: '32px' }}>
                        <ShoppingCart size={18} />
                    </div>
                    <h1>ATZ Admin</h1>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <item.icon size={20} />
                            <span>{item.name}</span>
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-footer" style={{ marginTop: 'auto', borderTop: '1px solid var(--gray-700)', paddingTop: '1rem' }}>
                    <button onClick={handleLogout} className="nav-item" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <header className="page-header" style={{ marginBottom: '2rem' }}>
                    <div className="header-left">
                        <button
                            className="btn btn-secondary mobile-menu-toggle"
                            style={{ display: 'none' }}
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                        <h2 className="page-title">
                            {navItems.find(item => item.path === location.pathname)?.name || 'Dashboard'}
                        </h2>
                    </div>
                    <div className="header-right" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }}>
                            <Bell size={20} />
                        </button>
                        <div className="admin-profile" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Super Admin</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>admin@atzstore.com</p>
                            </div>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--gray-300)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Users size={20} />
                            </div>
                        </div>
                    </div>
                </header>

                {children}
            </main>
        </div>
    );
};

export default Layout;
