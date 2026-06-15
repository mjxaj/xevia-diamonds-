# Xevia Diamonds — Atelier Site & Backend

Luxury fine-jewellery atelier site for **Xevia Diamonds**, with a full backend, enquiry pipeline, and admin panel.

## What's inside

- **Public site** — home, collections (5), product details (15 seeded from the design portfolio), portfolio gallery (with downloadable PDF dossier), Xevia Imagine, about, contact.
- **Enquire Now** button replaces every "Buy Now" CTA. Opens a modal that captures name, email, phone, budget, product, and message.
- **Enquiry DB** — every enquiry is saved with a `XEV-XXXXXX` reference number.
- **Emails** — on every enquiry, a confirmation goes to the customer and a notification to the business email. Wired but **inactive until SMTP credentials are added** (enquiries still save to the DB).
- **Admin panel** at `/admin` — dashboard, enquiries (filter/search/notes/status), product CRUD (with image upload), collection CRUD, site-settings editor (every text on the site is editable from here — **nothing is hard-coded**).
- **Portfolio PDF** is served at `/portfolio.pdf`; the 15 pages are also extracted to `/public/images/products/`.

## Stack

- Node.js 22.5+ (uses built-in `node:sqlite`, no native compile)
- Express + Nunjucks templates + Tailwind (CDN)
- bcryptjs · multer · nodemailer · express-session · dotenv

## Run it locally

```bash
cd /Users/anujmahajan/xevia-diamonds
npm install            # already done
cp .env.example .env   # edit if needed
npm run seed           # seeds DB with portfolio designs + admin user
npm start              # → http://localhost:3000
```

**Public site:** http://localhost:3000
**Admin login:** http://localhost:3000/admin/login
- email: `admin@xeviadiamonds.com`
- password: `ChangeMe123!`  → **change this immediately from `/admin/settings`**

## Email setup (do this when ready)

Edit `.env` and fill in:

```
SMTP_HOST=smtp.gmail.com           # or smtp.zoho.in, smtp.sendgrid.net, etc.
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-sender@xeviadiamonds.com
SMTP_PASS=<app-password>
MAIL_FROM=hello@xeviadiamonds.com
MAIL_FROM_NAME=Xevia Diamonds
NOTIFY_EMAIL=enquiries@xeviadiamonds.com   # where new-enquiry alerts go
```

Restart the server. From the next enquiry onward:
- Customer gets a confirmation email with reference number.
- The `NOTIFY_EMAIL` mailbox gets a new-enquiry notification (reply-to set to customer).

You can also edit any of those values from `/admin/settings` without touching `.env`.

## Folder layout

```
xevia-diamonds/
├─ server.js                   # Express bootstrap
├─ routes/
│   ├─ public.js               # public pages
│   ├─ enquiry.js              # POST /enquiry → DB + emails
│   └─ admin.js                # /admin/*
├─ lib/
│   ├─ db.js                   # node:sqlite + helpers
│   ├─ mailer.js               # nodemailer + email templates
│   └─ seed.js                 # seeds collections, 15 products, admin
├─ views/                      # nunjucks templates
│   ├─ _base.njk
│   ├─ partials/
│   ├─ admin/
│   └─ <page>.njk
├─ public/                     # static assets (images, /portfolio.pdf, /uploads)
├─ data/xevia.db               # SQLite database file
└─ .env
```

## Hosting (when ready to deploy)

- Anywhere that runs Node 22.5+ (Render, Railway, Fly.io, a VPS).
- Persist the `data/` and `public/uploads/` folders.
- Set the same env vars from `.env`. Make `SESSION_SECRET` long & random.
