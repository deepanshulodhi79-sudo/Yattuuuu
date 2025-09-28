// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// ---------- HARD-CODED LOGIN ----------
const HARD_USERNAME = 'Yatendra Rajput';
const HARD_PASSWORD = 'Yattu@882';
// --------------------------------------

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'bulk-mailer-secret-please-change',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

function requireLogin(req, res, next) {
  if (req.session && req.session.user === HARD_USERNAME) return next();
  return res.redirect('/login');
}

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === HARD_USERNAME && password === HARD_PASSWORD) {
    req.session.user = username;
    return res.redirect('/');
  } else {
    return res.render('login', { error: 'Invalid credentials' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.get('/', requireLogin, (req, res) => {
  res.render('form', {
    message: null,
    count: 0,
    formData: {} // empty by default
  });
});

app.post('/send', requireLogin, async (req, res) => {
  try {
    const { firstName, sentFrom, appPassword, subject, body, bulkMails } = req.body;

    // Sender email + app password
    const senderEmail = sentFrom && sentFrom.trim() !== '' ? sentFrom.trim() : (process.env.SENDER_EMAIL || '');
    const senderAppPassword = appPassword && appPassword.trim() !== '' ? appPassword.trim() : (process.env.SENDER_APP_PASSWORD || '');

    if (!senderEmail || !senderAppPassword) {
      return res.render('form', { message: 'Sender email and app password required.', count: 0, formData: req.body });
    }

    // Parse recipients
    let recipients = (bulkMails || '').split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    recipients = [...new Set(recipients)];
    const MAX_PER_BATCH = 30;

    if (recipients.length > MAX_PER_BATCH) {
      return res.render('form', { message: `You provided ${recipients.length} addresses. Max ${MAX_PER_BATCH} allowed per send.`, count: recipients.length, formData: req.body });
    }

    // Email validation
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalid = recipients.filter(r => !emailRe.test(r));
    if (invalid.length) {
      return res.render('form', { message: `Invalid emails: ${invalid.join(', ')}`, count: recipients.length, formData: req.body });
    }

    // transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: senderEmail,
        pass: senderAppPassword
      },
      pool: true,
      maxConnections: 1,
      maxMessages: recipients.length
    });

    let sentCount = 0;
    for (const to of recipients) {
      await transporter.sendMail({
        from: senderEmail,
        to,
        subject: subject || '(No subject)',
        text: body || ''
      });
      sentCount++;
    }

    return res.render('form', {
      message: `Successfully sent ${sentCount} emails.`,
      count: recipients.length,
      formData: req.body // keep form values
    });

  } catch (err) {
    console.error('Send error', err);
    return res.render('form', { message: `Error sending: ${err.message}`, count: 0, formData: req.body });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
