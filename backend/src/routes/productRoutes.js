const express = require('express');
const router = express.Router();
const { productController } = require('../controllers');
const { authenticateAdmin, checkPermission, upload } = require('../middleware');

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
router.post('/bulk', authenticateAdmin, checkPermission('products'), productController.bulkCreateProducts);
router.post('/upload-image', authenticateAdmin, checkPermission('products'), upload.single('image'), productController.uploadImage);
router.put('/:id', authenticateAdmin, checkPermission('products'), productController.updateProduct);
router.delete('/:id', authenticateAdmin, checkPermission('products'), productController.deleteProduct);
router.patch('/:id/stock', authenticateAdmin, checkPermission('products'), productController.updateStock);
router.post('/ai-description', authenticateAdmin, checkPermission('products'), productController.generateAIDescription);

module.exports = router;
