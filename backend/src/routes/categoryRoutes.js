const express = require('express');
const router = express.Router();
const { productController } = require('../controllers');
const { authenticateAdmin, checkPermission } = require('../middleware');

// Public routes
router.get('/', productController.getCategories);
router.get('/:id', productController.getCategory);

// Protected routes
router.post('/', authenticateAdmin, checkPermission('products'), productController.createCategory);
router.put('/:id', authenticateAdmin, checkPermission('products'), productController.updateCategory);
router.delete('/:id', authenticateAdmin, checkPermission('products'), productController.deleteCategory);

module.exports = router;
