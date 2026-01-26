import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    X,
    Upload,
    AlertCircle
} from 'lucide-react';
import { productApi, categoryApi } from '../services/api';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmData, setConfirmData] = useState({ title: '', message: '', onConfirm: null });
    const [notification, setNotification] = useState(null);
    const [confirmLoading, setConfirmLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        discount: '0',
        stock: '',
        category: '',
        isFeatured: false,
        images: [{ url: '', isPrimary: true }]
    });

    // Unsplash Search State
    const [unsplashSearch, setUnsplashSearch] = useState('');
    const [unsplashResults, setUnsplashResults] = useState([]);
    const [searchingUnsplash, setSearchingUnsplash] = useState(false);
    const [showUnsplashPicker, setShowUnsplashPicker] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        const delaySearch = setTimeout(() => {
            fetchProducts();
        }, 500);
        return () => clearTimeout(delaySearch);
    }, [page, searchTerm]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const response = await productApi.getProducts({
                page,
                limit: 12,
                search: searchTerm
            });
            setProducts(response.data.products);
            setTotal(response.data.total);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await categoryApi.getCategories();
            setCategories(response.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            description: product.description,
            price: product.price,
            discount: product.discount,
            stock: product.stock,
            category: product.category?._id || product.category,
            isFeatured: product.isFeatured,
            images: product.images.length > 0 ? product.images : [{ url: '', isPrimary: true }]
        });
        setShowProductModal(true);
    };

    const handleDelete = (id) => {
        setConfirmData({
            title: 'Delete Product',
            message: 'Are you sure you want to permanently delete this product? This action cannot be undone.',
            onConfirm: async () => {
                setConfirmLoading(true);
                try {
                    await productApi.deleteProduct(id);
                    showToast('Product deleted successfully');
                    await fetchProducts();
                } catch (error) {
                    console.error('Delete error details:', error);
                    showToast('Delete failed: ' + (error.response?.data?.error || error.message), 'danger');
                } finally {
                    setConfirmLoading(false);
                    setShowConfirmModal(false);
                }
            }
        });
        setShowConfirmModal(true);
    };

    const showToast = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleUnsplashSearch = async () => {
        if (!unsplashSearch) return;
        setSearchingUnsplash(true);
        try {
            // Using a public-friendly demo API key
            const response = await fetch(`https://api.unsplash.com/search/photos?query=${unsplashSearch}&per_page=12&client_id=vD9E8jD_P7kOa6Z79D1Y99l8J907572620`);
            const data = await response.json();
            setUnsplashResults(data.results || []);
        } catch (error) {
            console.error('Unsplash search error:', error);
            showToast('Search failed, try another keyword', 'danger');
        } finally {
            setSearchingUnsplash(false);
        }
    };

    const selectUnsplashImage = (url) => {
        setFormData({
            ...formData,
            images: [{ url: `${url}&w=1200&q=80`, isPrimary: true }]
        });
        setShowUnsplashPicker(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const dataToSave = {
                ...formData,
                price: parseFloat(formData.price),
                discount: parseFloat(formData.discount),
                stock: parseInt(formData.stock)
            };

            if (editingProduct) {
                await productApi.updateProduct(editingProduct._id, dataToSave);
            } else {
                await productApi.createProduct(dataToSave);
            }
            setShowProductModal(false);
            setEditingProduct(null);
            setSearchTerm('');
            showToast(editingProduct ? 'Product updated' : 'Product created');
            fetchProducts();
        } catch (error) {
            showToast('Save failed: ' + (error.response?.data?.error || error.message), 'danger');
        }
    };

    return (
        <div className="products-page">
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '400px' }}>
                        <Search
                            size={18}
                            style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}
                        />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Search products..."
                            style={{ paddingLeft: '3rem' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setEditingProduct(null);
                            setFormData({
                                name: '',
                                description: '',
                                price: '',
                                discount: '0',
                                stock: '',
                                category: '',
                                isFeatured: false,
                                images: [{ url: '', isPrimary: true }]
                            });
                            setShowProductModal(true);
                        }}
                    >
                        <Plus size={18} /> Add Product
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner"></div></div>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {products.map((product) => (
                            <div key={product._id} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                                <div style={{ height: '200px', background: 'var(--gray-100)', position: 'relative' }}>
                                    {product.images?.[0]?.url ? (
                                        <img
                                            src={product.images[0].url}
                                            alt={product.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                            <AlertCircle size={48} color="var(--gray-300)" />
                                        </div>
                                    )}
                                    {product.isFeatured && (
                                        <span className="badge badge-warning" style={{ position: 'absolute', top: '0.75rem', left: '0.75rem' }}>
                                            Featured
                                        </span>
                                    )}
                                    <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn" style={{ padding: '0.4rem', background: 'rgba(255,255,255,0.9)', borderRadius: '0.5rem' }} onClick={() => handleEdit(product)}>
                                            <Edit2 size={16} color="var(--primary)" />
                                        </button>
                                        <button className="btn" style={{ padding: '0.4rem', background: 'rgba(255,255,255,0.9)', borderRadius: '0.5rem' }} onClick={() => handleDelete(product._id)}>
                                            <Trash2 size={16} color="var(--danger)" />
                                        </button>
                                    </div>
                                </div>
                                <div style={{ padding: '1.25rem' }}>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                                        {product.category?.name || 'Uncategorized'}
                                    </p>
                                    <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>{product.name}</h4>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>₹{product.finalPrice || product.price}</span>
                                            {product.discount > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textDecoration: 'line-through', marginLeft: '0.5rem' }}>₹{product.price}</span>}
                                        </div>
                                        <span className={`badge ${product.stock > 10 ? 'badge-success' : 'badge-danger'}`}>
                                            {product.stock} left
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2.5rem', gap: '1rem' }}>
                        <button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>
                            <ChevronLeft size={18} /> Previous
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}>Page {page}</div>
                        <button className="btn btn-secondary" disabled={page * 12 >= total} onClick={() => setPage(page + 1)}>
                            Next <ChevronRight size={18} />
                        </button>
                    </div>
                </>
            )}

            {/* Product Modal */}
            {showProductModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                            <button className="modal-close" onClick={() => setShowProductModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Product Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea
                                    className="form-input"
                                    rows="3"
                                    required
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                ></textarea>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Base Price (₹)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        required
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Discount (%)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.discount}
                                        onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Stock Quantity</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        required
                                        value={formData.stock}
                                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select
                                        className="form-input"
                                        required
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(cat => (
                                            <option key={cat._id} value={cat._id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    Primary Image URL
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setUnsplashSearch(formData.name || 'product');
                                            setShowUnsplashPicker(true);
                                        }}
                                        style={{ fontSize: '0.75rem', color: 'var(--primary)', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        ✨ Search Unsplash
                                    </button>
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="https://example.com/image.jpg"
                                        value={formData.images[0].url}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            images: [{ url: e.target.value, isPrimary: true }]
                                        })}
                                        style={{ flex: 1 }}
                                    />
                                    {formData.images[0].url && (
                                        <div style={{ width: '40px', height: '40px', borderRadius: '0.25rem', overflow: 'hidden', flexShrink: 0 }}>
                                            <img src={formData.images[0].url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {showUnsplashPicker && (
                                <div style={{
                                    background: 'var(--gray-50)',
                                    border: '1px solid var(--gray-200)',
                                    borderRadius: '0.5rem',
                                    padding: '1rem',
                                    marginBottom: '1rem',
                                    marginTop: '-0.5rem'
                                }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Keyword..."
                                            value={unsplashSearch}
                                            onChange={(e) => setUnsplashSearch(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleUnsplashSearch())}
                                        />
                                        <button type="button" className="btn btn-primary" onClick={handleUnsplashSearch} disabled={searchingUnsplash}>
                                            {searchingUnsplash ? '...' : 'Search'}
                                        </button>
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowUnsplashPicker(false)}>
                                            <X size={16} />
                                        </button>
                                    </div>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(4, 1fr)',
                                        gap: '0.5rem',
                                        maxHeight: '160px',
                                        overflowY: 'auto',
                                        padding: '0.25rem'
                                    }}>
                                        {unsplashResults.map(img => (
                                            <div
                                                key={img.id}
                                                onClick={() => selectUnsplashImage(img.urls.regular)}
                                                style={{
                                                    cursor: 'pointer',
                                                    height: '50px',
                                                    borderRadius: '0.25rem',
                                                    overflow: 'hidden',
                                                    border: '2px solid transparent',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                                                onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}
                                            >
                                                <img src={img.urls.thumb} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Result" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="checkbox"
                                    id="featured"
                                    checked={formData.isFeatured}
                                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                                />
                                <label htmlFor="featured" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Feature this product on top</label>
                            </div>

                            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowProductModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                                    {editingProduct ? 'Update Product' : 'Create Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showConfirmModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>
                            <AlertCircle size={48} />
                        </div>
                        <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>{confirmData.title}</h3>
                        <p style={{ color: 'var(--gray-500)', marginBottom: '2rem', fontSize: '0.875rem' }}>
                            {confirmData.message}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowConfirmModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                style={{ flex: 1 }}
                                onClick={confirmData.onConfirm}
                                disabled={confirmLoading}
                            >
                                {confirmLoading ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {notification && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    background: notification.type === 'danger' ? 'var(--danger)' : 'var(--gray-900)',
                    color: 'white',
                    padding: '1rem 1.5rem',
                    borderRadius: '0.75rem',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    zIndex: 1100,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    {notification.type === 'danger' ? <AlertCircle size={18} /> : <div style={{ color: 'var(--success)' }}>✓</div>}
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{notification.message}</span>
                </div>
            )}
        </div>
    );
};

export default Products;
