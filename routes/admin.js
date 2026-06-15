const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { all, get, run, setSetting } = require('../lib/db');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safe = path.basename(file.originalname, ext).replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
      cb(null, `${Date.now()}-${safe}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpe?g|png|webp|gif|avif)$/.test(file.mimetype)) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  },
});

function requireAuth(req, res, next) {
  if (req.session?.admin) return next();
  if (req.method === 'GET') return res.redirect('/admin/login');
  return res.status(401).json({ ok: false, error: 'Unauthorized' });
}

router.get('/login', (req, res) => {
  if (req.session?.admin) return res.redirect('/admin');
  res.render('admin/login.njk', { title: 'Admin Login', error: req.query.error || null });
});

router.post('/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const admin = get('SELECT * FROM admins WHERE email = ?', email);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.redirect('/admin/login?error=' + encodeURIComponent('Invalid credentials'));
  }
  req.session.admin = { id: admin.id, email: admin.email, name: admin.name };
  res.redirect('/admin');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

router.use(requireAuth);

router.get('/', (req, res) => {
  const totals = {
    enquiries: get('SELECT COUNT(*) AS c FROM enquiries').c,
    new_enquiries: get("SELECT COUNT(*) AS c FROM enquiries WHERE status = 'new'").c,
    products: get('SELECT COUNT(*) AS c FROM products WHERE is_published = 1').c,
    subscribers: get('SELECT COUNT(*) AS c FROM subscribers').c,
  };
  const recent = all(
    `SELECT id, reference, name, email, product_name, status, created_at
     FROM enquiries ORDER BY datetime(created_at) DESC LIMIT 10`
  );
  res.render('admin/dashboard.njk', {
    title: 'Admin — Dashboard',
    layout: 'admin/_layout.njk',
    totals,
    recent,
  });
});

// ENQUIRIES
router.get('/enquiries', (req, res) => {
  const status = req.query.status || 'all';
  const q = String(req.query.q || '').trim();
  const params = [];
  let where = '1=1';
  if (status !== 'all') {
    where += ' AND status = ?';
    params.push(status);
  }
  if (q) {
    where += ' AND (name LIKE ? OR email LIKE ? OR reference LIKE ? OR product_name LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  const enquiries = all(
    `SELECT * FROM enquiries WHERE ${where} ORDER BY datetime(created_at) DESC`,
    ...params
  );
  res.render('admin/enquiries.njk', {
    title: 'Enquiries',
    layout: 'admin/_layout.njk',
    enquiries,
    status,
    q,
  });
});

router.get('/enquiries/:id', (req, res, next) => {
  const enquiry = get('SELECT * FROM enquiries WHERE id = ?', req.params.id);
  if (!enquiry) return next();
  res.render('admin/enquiry-detail.njk', {
    title: `Enquiry ${enquiry.reference}`,
    layout: 'admin/_layout.njk',
    enquiry,
  });
});

router.post('/enquiries/:id', (req, res) => {
  const { status, admin_notes } = req.body;
  run(
    `UPDATE enquiries SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    String(status || 'new'),
    String(admin_notes || ''),
    req.params.id
  );
  req.session.flash = { type: 'success', message: 'Enquiry updated.' };
  res.redirect(`/admin/enquiries/${req.params.id}`);
});

router.post('/enquiries/:id/delete', (req, res) => {
  run('DELETE FROM enquiries WHERE id = ?', req.params.id);
  req.session.flash = { type: 'success', message: 'Enquiry deleted.' };
  res.redirect('/admin/enquiries');
});

// PRODUCTS
router.get('/products', (req, res) => {
  const products = all(
    `SELECT p.*, c.name AS collection_name FROM products p
     LEFT JOIN collections c ON c.id = p.collection_id
     ORDER BY p.sort_order, p.id`
  );
  res.render('admin/products.njk', {
    title: 'Products',
    layout: 'admin/_layout.njk',
    products,
  });
});

router.get('/products/new', (req, res) => {
  const collections = all('SELECT * FROM collections ORDER BY sort_order, id');
  res.render('admin/product-form.njk', {
    title: 'New Product',
    layout: 'admin/_layout.njk',
    product: null,
    collections,
  });
});

router.get('/products/:id', (req, res, next) => {
  const product = get('SELECT * FROM products WHERE id = ?', req.params.id);
  if (!product) return next();
  const collections = all('SELECT * FROM collections ORDER BY sort_order, id');
  res.render('admin/product-form.njk', {
    title: `Edit — ${product.name}`,
    layout: 'admin/_layout.njk',
    product,
    collections,
  });
});

router.post('/products', upload.single('image'), (req, res) => {
  const body = req.body;
  const slug = String(body.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
  if (!slug || !body.name) {
    req.session.flash = { type: 'error', message: 'Slug and name are required.' };
    return res.redirect('/admin/products/new');
  }
  const primary_image = req.file ? '/uploads/' + req.file.filename : (body.primary_image || '');
  run(
    `INSERT INTO products (slug, name, collection_id, short_description, description, metal, stones, carat_weight, dimensions, price_range, primary_image, is_featured, is_published, sort_order)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    slug,
    body.name,
    body.collection_id || null,
    body.short_description || '',
    body.description || '',
    body.metal || '',
    body.stones || '',
    body.carat_weight || '',
    body.dimensions || '',
    body.price_range || '',
    primary_image,
    body.is_featured ? 1 : 0,
    body.is_published ? 1 : 0,
    Number(body.sort_order || 99)
  );
  req.session.flash = { type: 'success', message: 'Product created.' };
  res.redirect('/admin/products');
});

router.post('/products/:id', upload.single('image'), (req, res) => {
  const body = req.body;
  const existing = get('SELECT primary_image FROM products WHERE id = ?', req.params.id);
  const primary_image = req.file ? '/uploads/' + req.file.filename : (body.primary_image || (existing ? existing.primary_image : ''));
  run(
    `UPDATE products SET name=?, collection_id=?, short_description=?, description=?, metal=?, stones=?, carat_weight=?, dimensions=?, price_range=?, primary_image=?, is_featured=?, is_published=?, sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    body.name,
    body.collection_id || null,
    body.short_description || '',
    body.description || '',
    body.metal || '',
    body.stones || '',
    body.carat_weight || '',
    body.dimensions || '',
    body.price_range || '',
    primary_image,
    body.is_featured ? 1 : 0,
    body.is_published ? 1 : 0,
    Number(body.sort_order || 99),
    req.params.id
  );
  req.session.flash = { type: 'success', message: 'Product updated.' };
  res.redirect('/admin/products/' + req.params.id);
});

router.post('/products/:id/delete', (req, res) => {
  run('DELETE FROM products WHERE id = ?', req.params.id);
  req.session.flash = { type: 'success', message: 'Product deleted.' };
  res.redirect('/admin/products');
});

// COLLECTIONS
router.get('/collections', (req, res) => {
  const collections = all('SELECT * FROM collections ORDER BY sort_order, id');
  res.render('admin/collections.njk', {
    title: 'Collections',
    layout: 'admin/_layout.njk',
    collections,
  });
});

router.post('/collections', upload.single('image'), (req, res) => {
  const body = req.body;
  const slug = String(body.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
  if (!slug || !body.name) {
    req.session.flash = { type: 'error', message: 'Slug and name are required.' };
    return res.redirect('/admin/collections');
  }
  const image_url = req.file ? '/uploads/' + req.file.filename : (body.image_url || '');
  run(
    `INSERT INTO collections (slug, name, tagline, description, image_url, sort_order) VALUES (?,?,?,?,?,?)`,
    slug, body.name, body.tagline || '', body.description || '', image_url, Number(body.sort_order || 99)
  );
  req.session.flash = { type: 'success', message: 'Collection created.' };
  res.redirect('/admin/collections');
});

router.post('/collections/:id', upload.single('image'), (req, res) => {
  const body = req.body;
  const existing = get('SELECT image_url FROM collections WHERE id = ?', req.params.id);
  const image_url = req.file ? '/uploads/' + req.file.filename : (body.image_url || (existing ? existing.image_url : ''));
  run(
    `UPDATE collections SET name=?, tagline=?, description=?, image_url=?, sort_order=? WHERE id=?`,
    body.name, body.tagline || '', body.description || '', image_url, Number(body.sort_order || 99), req.params.id
  );
  req.session.flash = { type: 'success', message: 'Collection updated.' };
  res.redirect('/admin/collections');
});

router.post('/collections/:id/delete', (req, res) => {
  run('DELETE FROM collections WHERE id = ?', req.params.id);
  req.session.flash = { type: 'success', message: 'Collection deleted.' };
  res.redirect('/admin/collections');
});

// SITE SETTINGS
router.get('/settings', (req, res) => {
  const rows = all('SELECT key, value FROM settings ORDER BY key');
  res.render('admin/settings.njk', {
    title: 'Site Settings',
    layout: 'admin/_layout.njk',
    rows,
  });
});

router.post('/settings', (req, res) => {
  const body = req.body || {};
  for (const [k, v] of Object.entries(body)) {
    if (typeof k === 'string' && k.length <= 64) setSetting(k, String(v));
  }
  req.session.flash = { type: 'success', message: 'Settings saved.' };
  res.redirect('/admin/settings');
});

// PASSWORD CHANGE
router.post('/account/password', (req, res) => {
  const { current_password, new_password } = req.body;
  const admin = get('SELECT * FROM admins WHERE id = ?', req.session.admin.id);
  if (!admin || !bcrypt.compareSync(String(current_password || ''), admin.password_hash)) {
    req.session.flash = { type: 'error', message: 'Current password is incorrect.' };
    return res.redirect('/admin/settings');
  }
  if (!new_password || String(new_password).length < 8) {
    req.session.flash = { type: 'error', message: 'New password must be at least 8 characters.' };
    return res.redirect('/admin/settings');
  }
  run(
    'UPDATE admins SET password_hash = ? WHERE id = ?',
    bcrypt.hashSync(String(new_password), 10),
    admin.id
  );
  req.session.flash = { type: 'success', message: 'Password updated.' };
  res.redirect('/admin/settings');
});

module.exports = router;
