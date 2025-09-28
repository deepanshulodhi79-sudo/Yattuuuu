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
  secret: 'bulk-mailer-secret-please-change',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

function requireLogin(req, res, next) {
  if (req.session && req.session.user === HARD_USERNAME) return next();
  return res.redirect('/login');
}

// Login routes
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === HARD_USERNAME && password === HARD_PASSWORD) {
    req.session.user = username;
    return res.redirect('/');
  }
  return res.render('login', { error: 'Invalid credentials' });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Form route
app.get('/', requireLogin, (req, res) => {
  res.render('form', {
    message: null,
    count: 0,
    formData: {},
    success: false
  });
});

// Send emails (Sequential + 0.1s delay)
app.post('/send', requireLogin, async (req, res) => {
  const { firstName, sentFrom, appPassword, subject, body, bulkMails } = req.body;

  if (!sentFrom || !appPassword) {
    return res.render('form', {
      message: 'Sender email and app password required.',
      count: 0,
      formData: req.body,
      success: false
    });
  }

  let recipients = (bulkMails || '').split(/[\n,;]+/)
    .map(s => s.trim())
    .filter(s => s !== '');

  // Remove duplicates and limit to 30
  recipients = [...new Set(recipients)].slice(0, 30);

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
        user: sentFrom,
        pass: appPassword
      }
    });

    let sentCount = 0;

    for (const to of recipients) {
      try {
        await transporter.sendMail({
          from: `"${firstName}" <${sentFrom}>`,
          to,
          subject: subject || '(No subject)',
          text: body || ''
        });
        sentCount++;
        console.log(`Sent to ${to}`);
        // Delay 0.1 second
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`Failed to send to ${to}: ${err.message}`);
      }
    }

    return res.render('form', {
      message: `Successfully sent ${sentCount} emails.`,
      count: recipients.length,
      formData: req.body,
      success: true
    });

  } catch (err) {
    console.error('Send error', err);
    return res.render('form', {
      message: `Error sending: ${err.message}`,
      count: recipients.length,
      formData: req.body,
      success: false
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
