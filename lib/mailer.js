const nodemailer = require('nodemailer');
const { getSetting } = require('./db');

let cachedTransport = null;
let cachedKey = '';

function buildTransport() {
  const host = process.env.SMTP_HOST || getSetting('smtp_host', '');
  const port = Number(process.env.SMTP_PORT || getSetting('smtp_port', '587'));
  const secure = String(process.env.SMTP_SECURE || getSetting('smtp_secure', 'false')) === 'true';
  const user = process.env.SMTP_USER || getSetting('smtp_user', '');
  const pass = process.env.SMTP_PASS || getSetting('smtp_pass', '');

  if (!host || !user || !pass) return null;
  const key = `${host}:${port}:${secure}:${user}`;
  if (cachedTransport && cachedKey === key) return cachedTransport;

  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  cachedKey = key;
  return cachedTransport;
}

function fromAddress() {
  const name =
    process.env.MAIL_FROM_NAME || getSetting('mail_from_name', 'Xevia Diamonds');
  const addr =
    process.env.MAIL_FROM ||
    getSetting('mail_from', '') ||
    process.env.SMTP_USER ||
    getSetting('smtp_user', '');
  return addr ? `"${name}" <${addr}>` : '';
}

async function sendMail({ to, subject, html, text, replyTo }) {
  const transport = buildTransport();
  const from = fromAddress();
  if (!transport || !from || !to) {
    console.log(
      `[mail:skipped] to=${to || '?'} subject="${subject}" — SMTP not configured`
    );
    return { skipped: true };
  }
  try {
    const info = await transport.sendMail({
      from,
      to,
      subject,
      html,
      text,
      replyTo,
    });
    console.log(`[mail:sent] to=${to} subject="${subject}" id=${info.messageId}`);
    return { sent: true, id: info.messageId };
  } catch (err) {
    console.error(`[mail:error] to=${to} subject="${subject}"`, err.message);
    return { error: err.message };
  }
}

function customerEnquiryEmail({ siteName, customerName, reference, productName }) {
  const product = productName ? `for <strong>${escape(productName)}</strong>` : '';
  return `
    <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 32px; color: #101010; background: #FFF8F0;">
      <div style="text-align:center; padding: 24px 0; letter-spacing: 0.3em; font-size: 22px;">${escape(siteName).toUpperCase()}</div>
      <hr style="border:none; border-top:1px solid #E0D9CF; margin: 8px 0 32px;" />
      <h2 style="font-weight: 300; font-style: italic; font-size: 28px; margin: 0 0 16px;">Thank you, ${escape(customerName)}.</h2>
      <p style="line-height:1.7; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 15px;">
        Your enquiry ${product} has been received by our atelier.
        One of our consultants will be in touch within 24 hours to walk you through the piece, options, and next steps.
      </p>
      <p style="line-height:1.7; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 15px;">
        Your reference number is <strong>${escape(reference)}</strong> — quote this in any reply.
      </p>
      <p style="margin-top: 32px; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #444;">
        With warm regards,<br/>
        The ${escape(siteName)} Atelier
      </p>
    </div>
  `;
}

function adminEnquiryEmail({ enquiry, siteName }) {
  const row = (label, val) =>
    val
      ? `<tr><td style="padding:6px 12px;color:#666;width:140px">${label}</td><td style="padding:6px 12px"><strong>${escape(String(val))}</strong></td></tr>`
      : '';
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #101010;">
      <h2 style="margin: 0 0 4px;">New enquiry — ${escape(siteName)}</h2>
      <p style="color:#666; margin: 0 0 16px;">Reference <strong>${escape(enquiry.reference)}</strong></p>
      <table style="border-collapse: collapse; width: 100%; background:#faf4ed; border-radius:4px;">
        ${row('Name', enquiry.name)}
        ${row('Email', enquiry.email)}
        ${row('Phone', enquiry.phone)}
        ${row('Product', enquiry.product_name)}
        ${row('Type', enquiry.enquiry_type)}
        ${row('Budget', enquiry.budget)}
      </table>
      <h3 style="margin: 24px 0 8px;">Message</h3>
      <div style="background:#faf4ed; padding:16px; border-radius:4px; white-space:pre-wrap;">${escape(enquiry.message || '(no message)')}</div>
      <p style="margin-top:24px; color:#666; font-size:13px;">Reply directly to this email to respond to the customer.</p>
    </div>
  `;
}

function subscriberWelcomeEmail({ siteName, reference }) {
  return `
    <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 32px; color: #101010; background: #FFF8F0;">
      <div style="text-align:center; padding: 24px 0; letter-spacing: 0.3em; font-size: 22px;">${escape(siteName).toUpperCase()}</div>
      <hr style="border:none; border-top:1px solid #E0D9CF; margin: 8px 0 32px;" />
      <h2 style="font-weight: 300; font-style: italic; font-size: 28px; margin: 0 0 16px;">Welcome to the Private Circle.</h2>
      <p style="line-height:1.7; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 15px;">
        You'll now receive private invitations to viewings, first looks at our High Jewellery collections,
        and the occasional letter from the atelier.
      </p>
      <p style="line-height:1.7; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 15px;">
        Your subscription reference is <strong>${escape(reference)}</strong>.
      </p>
      <p style="margin-top: 32px; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #444;">
        With warm regards,<br/>
        The ${escape(siteName)} Atelier
      </p>
    </div>
  `;
}

function adminSubscriberEmail({ email, reference, siteName }) {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #101010;">
      <h2 style="margin: 0 0 4px;">New Private Circle subscriber — ${escape(siteName)}</h2>
      <p style="color:#666; margin: 0 0 16px;">Reference <strong>${escape(reference)}</strong></p>
      <table style="border-collapse: collapse; width: 100%; background:#faf4ed; border-radius:4px;">
        <tr><td style="padding:6px 12px;color:#666;width:140px">Email</td><td style="padding:6px 12px"><strong>${escape(email)}</strong></td></tr>
      </table>
    </div>
  `;
}

function escape(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { sendMail, customerEnquiryEmail, adminEnquiryEmail, subscriberWelcomeEmail, adminSubscriberEmail };
