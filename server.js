// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

const HARD_USERNAME = 'Yatendra Rajput';
const HARD_PASSWORD = 'Yattu@882';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'bulk-mailer-secret',
  resave: false,
  saveUninitialized: true
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
  }
  res.render('login', { error: 'Invalid credentials' });
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
    formData: {},
    success: false
  });
});

app.post('/send', requireLogin, async (req, res) => {
  const { firstName, sentFrom, appPassword, subject, body, bulkMails } = req.body;

  // Must use exactly the values typed in the form
  if (!sentFrom || !appPassword) {
    return res.render('form', {
      message: 'Sender email and app password required.',
      count: 0,
      formData: req.body,
      success: false
    });
  }

  // Parse recipients
  let recipients = (bulkMails || '').split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
  recipients = [...new Set(recipients)];

  if (recipients.length === 0) {
    return res.render('form', {
      message: 'No recipients provided.',
      count: 0,
      formData: req.body,
      success: false
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: sentFrom,      // always use current input
        pass: appPassword    // always use current input
      }
    });

    const invalidRecipients = [];
    const sendPromises = recipients.map(to =>
      transporter.sendMail({
        from: `"${firstName}" <${sentFrom}>`, // always current input
        to,
        subject: subject || '(No subject)',
        text: body || ''
      }).catch(err => {
        console.error(`Failed to send to ${to}: ${err.message}`);
        invalidRecipients.push(to);
        return null;
      })
    );

    const results = await Promise.all(sendPromises);
    const sentCount = results.filter(r => r !== null).length;

    let msg = `Successfully sent ${sentCount} emails.`;
    if (invalidRecipients.length > 0) {
      msg += ` Skipped ${invalidRecipients.length} invalid addresses.`;
    }

    // ✅ Keep all current form inputs exactly
    return res.render('form', {
      message: msg,
      count: recipients.length,
      formData: req.body, // <--- exactly what user typed
      success: true
    });

  } catch (err) {
    console.error('Send error', err);
    return res.render('form', {
      message: `Error sending: ${err.message}`,
      count: recipients.length,
      formData: req.body, // keep exactly what user typed
      success: false
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
