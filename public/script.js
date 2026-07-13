// public/script.js

document.getElementById('sendBtn').addEventListener('click', async () => {
    const senderName = document.getElementById('senderName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('pass').value;
    const subject = document.getElementById('subject').value;
    const recipients = document.getElementById('recipients').value; // Recipients data safely captured
    const statusMessage = document.getElementById('statusMessage');

    // 1. Rich text box se bold/formatted text fetch kiya
    const rawMessage = document.getElementById('message').innerHTML;

    // 🔒 Security Check: Kisi bhi script ya un-wanted HTML tag ko clean karna
    const cleanMessage = DOMPurify.sanitize(rawMessage, {
        ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'br', 'span', 'p', 'div']
    });

    // Basic Validation Check
    if (!email || !password || !recipients.trim()) {
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
                message: cleanMessage // Format maintained safe html backend ko gaya
            })
        });

        const data = await response.json();
        
        if (data.success) {
            statusMessage.innerText = data.message;
            statusMessage.style.color = "green";
            
            // Mail send hone ke baad clear inputs
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
