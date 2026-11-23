/**
 * The numbers of a fee bill, worked out in one place.
 *
 *   due = total + late fee − paid − discount
 *
 * where the discount is the bill's OWN discount (a concession or scholarship
 * set on the bill) plus every discount given with a payment on it. Each
 * screen used to work this out itself, and they disagreed:
 *   - recomputing a bill from its payments (void, correct a receipt) counted
 *     only the payments' discounts, so a concession on the bill came back
 *     onto the parent's balance;
 *   - applying a discount ignored what was already paid and the late fee,
 *     and never changed the status;
 *   - editing a bill's amount ignored the discount and the late fee, and let
 *     anyone mark it "paid" with nothing paid.
 *
 * All amounts are paisa. `tx` is a Prisma client or transaction.
 */

/** paid: no balance; partial: something was paid on it; unpaid: nothing yet. */
const billStatus = (due, paid, paymentDiscount = 0) => (due <= 0 ? 'paid' : (paid + paymentDiscount > 0 ? 'partial' : 'unpaid'));

/** What the bill's live (not voided) payments add up to. */
async function paymentTotals(tx, invoiceId) {
  const agg = await tx.feePayment.aggregate({
    where: { invoiceId, voidedAt: null },
    _sum: { amountPaid: true, discount: true },
  });
  return { paid: agg._sum.amountPaid || 0, paymentDiscount: agg._sum.discount || 0 };
}

/**
 * The bill's own discount as it stands now. Read it BEFORE changing the
 * bill's payments: the stored discount still counts the payments as they
 * were.
 */
async function ownDiscount(tx, invoiceId) {
  const inv = await tx.feeInvoice.findUniqueOrThrow({ where: { id: invoiceId }, select: { discount: true } });
  const { paymentDiscount } = await paymentTotals(tx, invoiceId);
  return Math.max(0, (inv.discount || 0) - paymentDiscount);
}

/** The figures a bill should hold (nothing is written). */
function figures(inv, { paid, paymentDiscount }, own) {
  const discount = Math.max(0, own) + paymentDiscount;
  const due = Math.max(0, (inv.totalAmount || 0) + (inv.lateFee || 0) - paid - discount);
  return { paidAmount: paid, discount, dueAmount: due, status: billStatus(due, paid, paymentDiscount) };
}

/**
 * Recompute a bill from its live payments, keeping its own discount (`own`,
 * from ownDiscount() read before the payments changed).
 */
async function recomputeInvoice(tx, invoiceId, own) {
  const inv = await tx.feeInvoice.findUniqueOrThrow({ where: { id: invoiceId } });
  const totals = await paymentTotals(tx, invoiceId);
  const data = figures(inv, totals, own);
  await tx.feeInvoice.update({ where: { id: invoiceId }, data });
  return { paid: data.paidAmount, due: data.dueAmount, status: data.status, discount: data.discount };
}

/**
 * Set a bill's own discount (0 removes it), keeping what has been paid and
 * the discounts given with payments. It can take the balance to 0, never
 * below. Returns the new figures and the discount actually applied.
 */
async function setOwnDiscount(tx, invoiceId, amount, extra = {}) {
  const inv = await tx.feeInvoice.findUniqueOrThrow({ where: { id: invoiceId } });
  const totals = await paymentTotals(tx, invoiceId);
  const room = Math.max(0, (inv.totalAmount || 0) + (inv.lateFee || 0) - totals.paid - totals.paymentDiscount);
  const own = Math.max(0, Math.min(Math.round(Number(amount) || 0), room));
  const data = figures(inv, totals, own);
  await tx.feeInvoice.update({ where: { id: invoiceId }, data: { ...data, ...extra } });
  return { ...data, own };
}

module.exports = { billStatus, paymentTotals, ownDiscount, figures, recomputeInvoice, setOwnDiscount };
