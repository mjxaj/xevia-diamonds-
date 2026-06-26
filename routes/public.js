const express = require('express');
const crypto = require('node:crypto');
const { all, get, run } = require('../lib/db');
const {
  sendMail,
  subscriberWelcomeEmail,
  adminSubscriberEmail,
} = require('../lib/mailer');

const router = express.Router();

router.get('/', (req, res) => {
  const featured = all(
    `SELECT p.*, c.name AS collection_name, c.slug AS collection_slug
     FROM products p LEFT JOIN collections c ON c.id = p.collection_id
     WHERE p.is_published = 1 AND p.is_featured = 1
     ORDER BY p.sort_order LIMIT 6`
  );
  const collections = all(
    'SELECT * FROM collections ORDER BY sort_order, id LIMIT 4'
  );
  res.render('home.njk', { title: res.locals.site.name, featured, collections });
});

router.get('/collections', (req, res) => {
  const collections = all('SELECT * FROM collections ORDER BY sort_order, id');
  const productsByCol = {};
  for (const c of collections) {
    productsByCol[c.id] = all(
      `SELECT * FROM products WHERE collection_id = ? AND is_published = 1 ORDER BY sort_order LIMIT 4`,
      c.id
    );
  }
  res.render('collections.njk', {
    title: 'The Collections',
    collections,
    productsByCol,
  });
});

router.get('/collections/:slug', (req, res, next) => {
  const collection = get(
    'SELECT * FROM collections WHERE slug = ?',
    req.params.slug
  );
  if (!collection) return next();
  const products = all(
    `SELECT * FROM products WHERE collection_id = ? AND is_published = 1 ORDER BY sort_order`,
    collection.id
  );
  res.render('collection-detail.njk', {
    title: collection.name,
    collection,
    products,
  });
});

router.get('/products/:slug', (req, res, next) => {
  const product = get(
    `SELECT p.*, c.name AS collection_name, c.slug AS collection_slug
     FROM products p LEFT JOIN collections c ON c.id = p.collection_id
     WHERE p.slug = ? AND p.is_published = 1`,
    req.params.slug
  );
  if (!product) return next();
  const related = all(
    `SELECT * FROM products WHERE collection_id = ? AND id != ? AND is_published = 1 ORDER BY sort_order LIMIT 3`,
    product.collection_id,
    product.id
  );
  res.render('product.njk', { title: product.name, product, related });
});

router.get('/portfolio', (req, res) => {
  const designs = [];
  for (let i = 1; i <= 15; i++) {
    designs.push({
      index: i,
      image: `/images/products/design-${i}-1.jpg`,
      lifestyle: `/images/products/design-${i}-3.jpg`,
    });
  }
  res.render('portfolio.njk', {
    title: 'Portfolio',
    designs,
    pdf_url: '/portfolio.pdf',
  });
});

router.get('/imagine', (req, res) => {
  res.render('imagine.njk', { title: 'Xevia Imagine' });
});

router.get('/about', (req, res) => {
  res.render('about.njk', { title: 'About' });
});

router.get('/contact', (req, res) => {
  res.render('contact.njk', { title: 'Contact' });
});

router.get('/privacy-policy', (req, res) => {
  res.render('privacy.njk', { title: 'Privacy Policy', heading: 'Privacy Policy', eyebrow: 'Legal', lastUpdated: 'June 2026' });
});
router.get('/terms-conditions', (req, res) => {
  res.render('terms.njk', { title: 'Terms & Conditions', heading: 'Terms & Conditions', eyebrow: 'Legal', lastUpdated: 'June 2026' });
});
router.get('/refund-policy', (req, res) => {
  res.render('refund.njk', { title: 'Refund & Return Policy', heading: 'Refund & Return Policy', eyebrow: 'Customer Care', lastUpdated: 'June 2026' });
});
router.get('/shipping-policy', (req, res) => {
  res.render('shipping.njk', { title: 'Shipping Policy', heading: 'Shipping Policy', eyebrow: 'Customer Care', lastUpdated: 'June 2026' });
});

router.post('/subscribe', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    req.session.flash = { type: 'error', message: 'Please enter a valid email.' };
    return res.redirect(req.get('referer') || '/');
  }

  let isNew = false;
  try {
    const result = run('INSERT OR IGNORE INTO subscribers (email) VALUES (?)', email);
    isNew = result.changes > 0;
  } catch (e) {
    req.session.flash = { type: 'error', message: 'Something went wrong.' };
    return res.redirect(req.get('referer') || '/');
  }

  req.session.flash = { type: 'success', message: 'Welcome to the private circle.' };
  res.redirect(req.get('referer') || '/');

  // Fire-and-forget emails after responding — only on the FIRST subscription
  if (!isNew) return;
  const siteName = res.locals.site.name;
  const reference = 'XEV-NL-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  (async () => {
    try {
      await sendMail({
        to: email,
        subject: `${siteName} — Welcome to the Private Circle`,
        html: subscriberWelcomeEmail({ siteName, reference }),
      });

      const notifyTo =
        process.env.NOTIFY_EMAIL ||
        res.locals.settings.contact_email ||
        process.env.CONTACT_EMAIL;
      if (notifyTo) {
        await sendMail({
          to: notifyTo,
          replyTo: email,
          subject: `[${siteName}] New Private Circle subscriber — ${email}`,
          html: adminSubscriberEmail({ email, reference, siteName }),
        });
      }
    } catch (e) {
      console.error('Subscribe mail dispatch error:', e.message);
    }
  })();
});

module.exports = router;
