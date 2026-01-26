const express = require('express');
const router = express.Router();
const { productController } = require('../controllers');
const { authenticateAdmin, checkPermission } = require('../middleware');

// Public routes (for fetching products)
router.get('/', productController.getProducts);
router.get('/featured', async (req, res) => {
    const { productService } = require('../services');
    const products = await productService.getFeaturedProducts();
    res.json(products);
});
router.get('/low-stock', authenticateAdmin, productController.getLowStock);
router.get('/stats', authenticateAdmin, productController.getStats);
router.get('/:id', productController.getProduct);

// Protected routes
router.post('/', authenticateAdmin, checkPermission('products'), productController.createProduct);
router.put('/:id', authenticateAdmin, checkPermission('products'), productController.updateProduct);
router.delete('/:id', authenticateAdmin, checkPermission('products'), productController.deleteProduct);
router.patch('/:id/stock', authenticateAdmin, checkPermission('products'), productController.updateStock);

module.exports = router;
