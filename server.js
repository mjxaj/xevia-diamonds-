require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const nunjucks = require('nunjucks');

const { all, get, getAllSettings } = require('./lib/db');

// Auto-seed the DB on first boot (no rows in `collections` means a fresh deploy).
if (get('SELECT COUNT(*) AS c FROM collections').c === 0) {
  console.log('Fresh DB detected — running seed...');
  require('./lib/seed');
}
const publicRoutes = require('./routes/public');
const enquiryRoutes = require('./routes/enquiry');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = Number(process.env.PORT || 3000);

const env = nunjucks.configure(path.join(__dirname, 'views'), {
  autoescape: true,
  express: app,
  noCache: process.env.NODE_ENV === 'development',
});
env.addFilter('currency', (n) => {
  if (n === null || n === undefined || n === '') return '';
  const num = Number(n);
  if (Number.isNaN(num)) return n;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
});
env.addFilter('date', (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
});

app.set('view engine', 'njk');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 7 },
  })
);

// Globals available in every template
app.use((req, res, next) => {
  const settings = getAllSettings();
  const collections = all(
    'SELECT id, slug, name, tagline, image_url FROM collections ORDER BY sort_order, id'
  );
  res.locals.site = {
    name: settings.site_name || 'XEVIA',
    tagline: settings.site_tagline || 'Fine Jewellery Atelier',
    established: settings.site_established || '1924',
    contact_email: settings.contact_email || '',
    contact_phone: settings.contact_phone || '',
    contact_address: settings.contact_address || '',
  };
  res.locals.settings = settings;
  res.locals.nav_collections = collections;
  res.locals.currentPath = req.path;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

app.use('/', publicRoutes);
app.use('/enquiry', enquiryRoutes);
app.use('/admin', adminRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('404.njk', { title: 'Not found' });
});

// Error
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).render('500.njk', { title: 'Something went wrong', error: process.env.NODE_ENV === 'development' ? err.message : null });
});

app.listen(PORT, () => {
  console.log(`Xevia Diamonds listening on http://localhost:${PORT}`);
});
