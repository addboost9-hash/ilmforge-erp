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

/* ── PUT /products/:id — edit an inventory item ──
   Inventory was create-and-sell only: a typo in a name or a price change
   meant living with it forever, with no way to correct stock counts either. */
router.put('/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.product.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Product not found.' });

  const { name, barcode, category, purchasePrice, sellPrice, quantity, reorderLevel } = req.body;
  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(barcode !== undefined && { barcode: barcode || null }),
      ...(category !== undefined && { category: category || null }),
      ...(purchasePrice !== undefined && { purchasePrice: parseInt(purchasePrice) || 0 }),
      ...(sellPrice !== undefined && { sellPrice: parseInt(sellPrice) || 0 }),
      ...(quantity !== undefined && { quantity: parseInt(quantity) || 0 }),
      ...(reorderLevel !== undefined && { reorderLevel: parseInt(reorderLevel) || 0 }),
    },
  });
  res.json({ success: true, data: product });
}));

/* ── DELETE /products/:id — remove a discontinued item ──
   StockTransaction.productId is a hard FK with no cascade, so an item that
   has already been sold can't be deleted without destroying sales history —
   refuse those and explain, rather than failing with a raw FK error. */
router.delete('/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.product.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Product not found.' });

  const txCount = await prisma.stockTransaction.count({ where: { productId: id } });
  if (txCount > 0) {
    return res.status(400).json({
      success: false,
      message: `"${existing.name}" has ${txCount} sale/stock record(s) and cannot be deleted without losing that history. Set its quantity to 0 to take it out of circulation instead.`,
    });
  }

  await prisma.product.delete({ where: { id } });
  res.json({ success: true, message: `"${existing.name}" deleted.` });
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

// POST /products/sale — POS cart checkout (multiple items in one transaction)
// FIX: POSPage.jsx's checkout button called this with { items: [...], total }
// but no such route existed (only single-item /products/sell) — every sale 404'd.
router.post('/sale', wrap(async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'items[] is required.' });
  }

  const productIds = items.map(i => parseInt(i.productId));
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, schoolId: req.schoolId } });
  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  for (const item of items) {
    const product = productMap[parseInt(item.productId)];
    if (!product) return res.status(404).json({ success: false, message: `Product ${item.productId} not found.` });
    if (product.quantity < parseInt(item.quantity)) {
      return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}.` });
    }
  }

  const ops = [];
  let total = 0;
  for (const item of items) {
    const product = productMap[parseInt(item.productId)];
    const quantity = parseInt(item.quantity);
    const unitPrice = item.price !== undefined ? parseInt(item.price) : product.sellPrice;
    const amount = unitPrice * quantity;
    total += amount;
    ops.push(prisma.stockTransaction.create({
      data: {
        productId: product.id, schoolId: req.schoolId, quantity, type: 'sale',
        unitPrice, totalAmount: amount, processedBy: req.user.id,
      },
    }));
    ops.push(prisma.product.update({ where: { id: product.id }, data: { quantity: { decrement: quantity } } }));
  }

  const results = await prisma.$transaction(ops);
  const transactions = results.filter((_, idx) => idx % 2 === 0);
  res.json({ success: true, data: transactions, totalAmount: total });
}));

module.exports = router;
