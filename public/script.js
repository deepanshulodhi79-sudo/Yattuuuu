// public/script.js

document.getElementById('sendBtn').addEventListener('click', async () => {
    const senderName = document.getElementById('senderName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('pass').value; // HTML me id="pass" hai
    const subject = document.getElementById('subject').value;
    const recipients = document.getElementById('recipients').value;
    const statusMessage = document.getElementById('statusMessage');

    // 🟢 1. Rich text box se bold/formatted HTML uthayein
    const rawMessage = document.getElementById('message').innerHTML;

    // 🔒 2. Safety Check (XSS Prevention): 
    // Sirf safe text formatting tags (bold, italic, underlines, breaks) ko allow karega.
    const cleanMessage = DOMPurify.sanitize(rawMessage, {
        ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'br', 'span', 'p', 'div']
    });

    // Basic Validation check
    if (!email || !password || !recipients) {
        statusMessage.innerText = "❌ Email, Password and Recipients are required!";
        statusMessage.style.color = "red";
        return;
    }

    statusMessage.innerText = "⏳ Sending emails, please wait...";
    statusMessage.style.color = "blue";

    try {
        const response = await fetch('/send', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                senderName,
                email,
                password,
                recipients,
                subject,
                message: cleanMessage // 🚀 Formatted message backend ko gaya
            })
        });

        const data = await response.json();
        
        if (data.success) {
            statusMessage.innerText = data.message;
            statusMessage.style.color = "green";
            // Mail send hone ke baad fields clear karne ke liye
            document.getElementById('message').innerHTML = '';
            document.getElementById('recipients').value = '';
        } else {
            statusMessage.innerText = "❌ Error: " + data.message;
            statusMessage.style.color = "red";
        }
    } catch (err) {
        statusMessage.innerText = "❌ Client Error: " + err.message;
        statusMessage.style.color = "red";
    }
});

// Logout function
function logout() {
    fetch('/logout', { method: 'POST' })
    .then(res => res.json())
    .then(data => { 
        if(data.success) {
            window.location.href = '/'; 
        }
    })
    .catch(err => console.error("Logout error:", err));
}
