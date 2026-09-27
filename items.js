const express = require('express');
const router = express.Router();
const multer = require('multer');
const { addItem, getItems, getItemById, deleteItem, getMatches } = require('../controllers/itemController');
const auth = require('../middleware/auth');

router.post('/add', auth, multer({ dest: 'uploads/' }).single('image'), addItem);
router.get('/', auth, getItems);
router.get('/potential-matches', auth, getMatches);
router.get('/:id', auth, getItemById);
router.delete('/:id', auth, deleteItem);

module.exports = router;
