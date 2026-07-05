const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => {
  const products = await prisma.product.findMany({ where: { schoolId: req.schoolId }, orderBy: { name: 'asc' } });
  res.json({ success: true, data: products });
}));

router.post('/', wrap(async (req, res) => {
  const { name, barcode, category, purchasePrice, sellPrice, quantity } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Name required.' });
  const product = await prisma.product.create({ data: { schoolId: req.schoolId, campusId: req.campusId, name, barcode, category, purchasePrice: parseInt(purchasePrice)||0, sellPrice: parseInt(sellPrice)||0, quantity: parseInt(quantity)||0 } });
  res.status(201).json({ success: true, data: product });
}));

router.post('/sell', wrap(async (req, res) => {
  const { productId, studentId, quantity } = req.body;
  const product = await prisma.product.findFirst({ where: { id: parseInt(productId), schoolId: req.schoolId } });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
  if (product.quantity < parseInt(quantity)) return res.status(400).json({ success: false, message: 'Insufficient stock.' });
  const total = product.sellPrice * parseInt(quantity);
  const [tx] = await prisma.$transaction([
    prisma.stockTransaction.create({ data: { productId: parseInt(productId), schoolId: req.schoolId, studentId: studentId ? parseInt(studentId) : null, quantity: parseInt(quantity), type: 'sale', unitPrice: product.sellPrice, totalAmount: total, processedBy: req.user.id } }),
    prisma.product.update({ where: { id: parseInt(productId) }, data: { quantity: { decrement: parseInt(quantity) } } }),
  ]);
  res.json({ success: true, data: tx, totalAmount: total });
}));

module.exports = router;
