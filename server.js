app.post('/send', requireLogin, async (req, res) => {
  const { firstName, sentFrom, appPassword, subject, body, bulkMails } = req.body;

  if (!sentFrom || !appPassword) {
    return res.render('form', {
      message: 'Sender email and app password required.',
      count: 0,
      formData: req.body,  // keep what user typed
      success: false
    });
  }

  let recipients = (bulkMails || '').split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
  recipients = [...new Set(recipients)];

  const validRecipients = recipients.filter(r => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r));
  const invalidRecipients = recipients.filter(r => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r));

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: sentFrom,       // always use exactly the input
        pass: appPassword     // always use exactly the input
      }
    });

    const sendPromises = validRecipients.map(to =>
      transporter.sendMail({
        from: `"${firstName}" <${sentFrom}>`, // always use exactly the input
        to,
        subject: subject || '(No subject)',
        text: body || ''
      }).catch(err => {
        console.error(`Send failed for ${to}: ${err.message}`);
        return null;
      })
    );

    const results = await Promise.all(sendPromises);
    const sentCount = results.filter(r => r !== null).length;

    let msg = `Successfully sent ${sentCount} emails.`;
    if (invalidRecipients.length) msg += ` Skipped ${invalidRecipients.length} invalid addresses.`;

    // ✅ key: keep formData exactly what user typed
    return res.render('form', {
      message: msg,
      count: recipients.length,
      formData: req.body,
      success: true
    });

  } catch (err) {
    return res.render('form', {
      message: `Error sending: ${err.message}`,
      count: recipients.length,
      formData: req.body,
      success: false
    });
  }
});
