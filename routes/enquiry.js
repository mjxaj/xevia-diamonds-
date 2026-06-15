const express = require('express');
const crypto = require('node:crypto');
const { get, run } = require('../lib/db');
const {
  sendMail,
  customerEnquiryEmail,
  adminEnquiryEmail,
} = require('../lib/mailer');

const router = express.Router();

function generateReference() {
  return 'XEV-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

router.post('/', async (req, res) => {
  const {
    name = '',
    email = '',
    phone = '',
    message = '',
    budget = '',
    enquiry_type = 'product',
    product_id = '',
    product_slug = '',
  } = req.body;

  const cleanName = String(name).trim();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPhone = String(phone).trim();
  const cleanMessage = String(message).trim();

  if (!cleanName || !cleanEmail || !/^[^@]+@[^@]+\.[^@]+$/.test(cleanEmail)) {
    return res.status(400).json({
      ok: false,
      error: 'Please enter a valid name and email.',
    });
  }

  let product = null;
  if (product_id) {
    product = get('SELECT id, name FROM products WHERE id = ?', Number(product_id));
  } else if (product_slug) {
    product = get('SELECT id, name FROM products WHERE slug = ?', String(product_slug));
  }

  const reference = generateReference();
  const result = run(
    `INSERT INTO enquiries (reference, name, email, phone, product_id, product_name, enquiry_type, budget, message)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    reference,
    cleanName,
    cleanEmail,
    cleanPhone,
    product ? product.id : null,
    product ? product.name : null,
    String(enquiry_type || 'product'),
    String(budget || ''),
    cleanMessage
  );

  const enquiry = get('SELECT * FROM enquiries WHERE id = ?', result.lastInsertRowid);
  const siteName = res.locals.site.name;

  // Fire-and-forget emails (don't block the response)
  (async () => {
    try {
      const customerResult = await sendMail({
        to: enquiry.email,
        subject: `${siteName} — your enquiry (${enquiry.reference})`,
        html: customerEnquiryEmail({
          siteName,
          customerName: enquiry.name,
          reference: enquiry.reference,
          productName: enquiry.product_name,
        }),
      });
      if (customerResult.sent) {
        run('UPDATE enquiries SET customer_emailed = 1 WHERE id = ?', enquiry.id);
      }

      const notifyTo =
        process.env.NOTIFY_EMAIL ||
        res.locals.settings.contact_email ||
        process.env.CONTACT_EMAIL;
      if (notifyTo) {
        const adminResult = await sendMail({
          to: notifyTo,
          replyTo: enquiry.email,
          subject: `[${siteName}] New enquiry — ${enquiry.name} (${enquiry.reference})`,
          html: adminEnquiryEmail({ enquiry, siteName }),
        });
        if (adminResult.sent) {
          run('UPDATE enquiries SET admin_emailed = 1 WHERE id = ?', enquiry.id);
        }
      }
    } catch (e) {
      console.error('Enquiry mail dispatch error:', e.message);
    }
  })();

  if (req.get('accept')?.includes('application/json') || req.xhr) {
    return res.json({
      ok: true,
      reference: enquiry.reference,
      message:
        res.locals.settings.enquiry_thank_you ||
        'Thank you. Your enquiry has been received.',
    });
  }
  req.session.flash = {
    type: 'success',
    message: `Thank you, ${enquiry.name}. Your enquiry ${enquiry.reference} is with our atelier.`,
  };
  res.redirect(
    product_slug
      ? `/products/${product_slug}?enquired=1`
      : '/?enquired=1'
  );
});

module.exports = router;
