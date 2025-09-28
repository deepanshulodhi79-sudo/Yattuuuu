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
const HARD_USERNAME = 'Yatendre Rajput';
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

// middleware to require login
function requireLogin(req, res, next) {
  if (req.session && req.session.user === HARD_USERNAME) return next();
  return res.redirect('/login');
}

// login pages
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

// main form
app.get('/', requireLogin, (req, res) => {
  res.render('form', { message: null, count: 0 });
});

app.post('/send', requireLogin, async (req, res) => {
  try {
    const { firstName, sentFrom, appPassword, subject, body, bulkMails } = req.body;

    // Sender email and app password: prefer env fallback
    const senderEmail = sentFrom && sentFrom.trim() !== '' ? sentFrom.trim() : (process.env.SENDER_EMAIL || '');
    const senderAppPassword = appPassword && appPassword.trim() !== '' ? appPassword.trim() : (process.env.SENDER_APP_PASSWORD || '');

    if (!senderEmail || !senderAppPassword) {
      return res.render('form', { message: 'Sender email and app password required (either in form or set env variables).', count: 0 });
    }

    // Parse recipients
    // Accept newline or comma separated
    let recipients = (bulkMails || '').split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    // Deduplicate
    recipients = [...new Set(recipients)];
    if (recipients.length === 0) {
      return res.render('form', { message: 'No recipient addresses provided.', count: 0 });
    }

    // Limit to 30 per send (as requested)
    const MAX_PER_BATCH = 30;
    if (recipients.length > MAX_PER_BATCH) {
      return res.render('form', { message: `You provided ${recipients.length} addresses. Max ${MAX_PER_BATCH} allowed per send.`, count: recipients.length });
    }

    // Basic email validation regex (simple)
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalid = recipients.filter(r => !emailRe.test(r));
    if (invalid.length) {
      return res.render('form', { message: `Invalid email addresses found: ${invalid.join(', ')}`, count: recipients.length });
    }

    // create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: senderEmail,
        pass: senderAppPassword
      },
      // increase timeout if needed
      pool: true,
      maxConnections: 1,
      maxMessages: recipients.length
    });

    // send one email per recipient (personalized "To" each)
    let sentCount = 0;
    for (const to of recipients) {
      const mailOptions = {
        from: senderEmail,
        to,
        subject: subject || '(No subject)',
        text: body || '',
        // html: '<b>HTML body</b>' // if want
      };
      // await send
      await transporter.sendMail(mailOptions);
      sentCount++;
    }

    return res.render('form', { message: `Successfully sent ${sentCount} emails.`, count: recipients.length });

  } catch (err) {
    console.error('Send error', err);
    return res.render('form', { message: `Error sending: ${err.message}`, count: 0 });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
