app.post('/send', requireLogin, async (req, res) => {
  const { firstName, sentFrom, appPassword, subject, body, bulkMails } = req.body;

  const senderEmail = sentFrom && sentFrom.trim() !== '' ? sentFrom.trim() : (process.env.SENDER_EMAIL || '');
  const senderAppPassword = appPassword && appPassword.trim() !== '' ? appPassword.trim() : (process.env.SENDER_APP_PASSWORD || '');

  if (!senderEmail || !senderAppPassword) {
    return res.render('form', {
      message: 'Sender email and app password required.',
      count: 0,
      formData: req.body
    });
  }

  // Parse recipients and take a copy
  let recipients = (bulkMails || '').split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
  recipients = [...new Set(recipients)];
  const MAX_PER_BATCH = 30;
  const limitedRecipients = recipients.slice(0, MAX_PER_BATCH);

  // ✅ Take a snapshot of all values at this moment
  const currentFirstName = firstName;
  const currentSenderEmail = senderEmail;
  const currentSenderAppPassword = senderAppPassword;
  const currentSubject = subject;
  const currentBody = body;
  const recipientsCopy = [...limitedRecipients];

  try {
    const sendPromises = recipientsCopy.map(to => {
      const mailOptions = {
        from: `"${currentFirstName || currentSenderEmail}" <${currentSenderEmail}>`,
        to,
        subject: currentSubject || '(No subject)',
        text: currentBody || ''
      };

      // Fresh transporter for each mail or batch
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: currentSenderEmail,
          pass: currentSenderAppPassword
        }
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

    return res.render('form', {
      message: `Successfully sent ${sentCount} emails.`,
      count: recipients.length,
      formData: req.body
    });

  } catch (err) {
    console.error('Send error', err);
    return res.render('form', {
      message: `Error sending: ${err.message}`,
      count: recipients.length,
      formData: req.body
    });
  }
});
