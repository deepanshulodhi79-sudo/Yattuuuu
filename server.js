const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get("/", (req, res) => {
  // पहली बार पेज लोड पर formData खाली रहेगा
  res.render("form", { count: 0 });
});

app.post("/send", async (req, res) => {
  const { senderName, senderEmail, appPassword, subject, body, recipients } = req.body;

  // recipients को साफ करो
  let allRecipients = recipients
    .split(/[\n,]+/)
    .map(r => r.trim())
    .filter(r => r);

  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: senderEmail,
      pass: appPassword
    }
  });

  let sentCount = 0;
  let failedCount = 0;

  for (let r of allRecipients) {
    try {
      await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: r,
        subject,
        text: body
      });
      sentCount++;
    } catch (err) {
      failedCount++;
      // invalid recipients को skip करते हैं
    }
  }

  return res.json({
    message: `✅ ${sentCount} mails sent successfully. ${failedCount} failed.`,
    count: allRecipients.length
  });
});

app.listen(3000, () => console.log("Server running on port 3000"));
