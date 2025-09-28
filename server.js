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
app.use(bodyParser.json());

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

app.get('/login', (req, res) => res.render('login', { error: null }));

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
  req.session.destroy(() => res.redirect('/login'));
});

app.get('/', requireLogin, (req, res) => {
  res.render('form', { formData: {}, message: null, count: 0 });
});

// ✅ AJAX send route
app.post('/send', requireLogin, async (req, res) => {
  const { firstName, sentFrom, appPassword, subject, body, bulkMails } = req.body;

  const senderEmail = sentFrom?.trim() || process.env.SENDER_EMAIL || '';
  const senderAppPassword = appPassword?.trim() || process.env.SENDER_APP_PASSWORD || '';

  if (!senderEmail || !senderAppPassword) {
    return res.json({ success: false, message: 'Sender email and app password required.' });
  }

  let recipients = (bulkMails || '').split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
  recipients = [...new Set(recipients)];
  const MAX_PER_BATCH = 30;
  const limitedRecipients = recipients.slice(0, MAX_PER_BATCH);

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const validRecipients = limitedRecipients.filter(r => emailRe.test(r));
  const invalidRecipients = limitedRecipients.filter(r => !emailRe.test(r));

  // ✅ Snapshot for safe async sending
  const snapshot = {
    firstName,
    senderEmail,
    senderAppPassword,
    subject,
    body,
    recipients: [...validRecipients]
  };

  try {
    const sendPromises = snapshot.recipients.map(to => {
      const mailOptions = {
        from: `"${snapshot.firstName || snapshot.senderEmail}" <${snapshot.senderEmail}>`,
        to,
        subject: snapshot.subject || '(No subject)',
        text: snapshot.body || ''
      };

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: snapshot.senderEmail, pass: snapshot.senderAppPassword }
      });

      return transporter.sendMail(mailOptions)
        .then(() => to)
        .catch(err => {
          console.error('Send failed for', to, err.message);
          return null;
        });
    });

    const results = await Promise.all(sendPromises);
    const sentCount = results.filter(r => r !== null).length;

    let msg = `Successfully sent ${sentCount} emails.`;
    if (invalidRecipients.length > 0) msg += ` Skipped ${invalidRecipients.length} invalid addresses.`;

    return res.json({ success: true, message: msg });

  } catch (err) {
    console.error('Send error', err);
    return res.json({ success: false, message: `Error sending: ${err.message}` });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
