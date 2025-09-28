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
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'bulk-mailer-secret',
  resave: false,
  saveUninitialized: true
}));

// login page
app.get('/', (req, res) => {
  if (req.session.loggedIn) {
    return res.redirect('/form');
  }
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === HARD_USERNAME && password === HARD_PASSWORD) {
    req.session.loggedIn = true;
    return res.redirect('/form');
  }
  res.render('login', { error: 'Invalid username or password' });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// form page
app.get('/form', (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect('/');
  }
  res.render('form', { message: null, count: 0, formData: {}, success: false });
});

// send emails
app.post('/send', async (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect('/');
  }

  const { firstName, sentFrom, appPassword, subject, body, bulkMails } = req.body;

  if (!sentFrom || !appPassword) {
    return res.render('form', {
      message: 'Sender email and app password required',
      count: 0,
      formData: req.body,
      success: false
    });
  }

  const recipients = (bulkMails || '').split(/[\n,;]+/).map(e => e.trim()).filter(Boolean);
  if (!recipients.length) {
    return res.render('form', {
      message: 'No recipients provided',
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

    const invalidRecipients = [];
    const sendPromises = recipients.map(async email => {
      try {
        await transporter.sendMail({
          from: `"${firstName}" <${sentFrom}>`,
          to: email,
          subject: subject || '(No subject)',
          text: body || ''
        });
        return email;
      } catch (err) {
        console.error(`Mail error to ${email}: ${err.message}`);
        invalidRecipients.push(email);
        return null;
      }
    });

    const results = await Promise.all(sendPromises);
    const sentCount = results.filter(r => r !== null).length;

    let msg = `Successfully sent ${sentCount} emails.`;
    if (invalidRecipients.length > 0) {
      msg += ` Skipped ${invalidRecipients.length} invalid addresses.`;
    }

    // ✅ keep all form fields intact after success
    return res.render('form', {
      message: msg,
      count: recipients.length,
      formData: req.body,  // <-- keep the current inputs
      success: true
    });

  } catch (err) {
    console.error('Error sending:', err);
    return res.render('form', {
      message: `Error sending: ${err.message}`,
      count: recipients.length,
      formData: req.body,
      success: false
    });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
