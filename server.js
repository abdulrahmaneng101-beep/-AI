const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// قراءة ملف .env يدوياً
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split(/\r?\n/).forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        process.env[key] = value;
      }
    });
  }
} catch (e) { }

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TO_EMAIL = "abdulrahman.eng.101@gmail.com";

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET') {
    let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
    let extname = path.extname(filePath);
    let contentType = 'text/html';

    if (extname === '.css') contentType = 'text/css';
    else if (extname === '.js') contentType = 'application/javascript';
    else if (extname === '.png') contentType = 'image/png';
    else if (extname === '.jpg') contentType = 'image/jpeg';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('Not Found');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  }
  else if (req.method === 'POST' && req.url === '/send') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const dataObj = JSON.parse(body);
        const { name, email, phone, country, service, message } = dataObj;

        if (!name || !email) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: "من فضلك املأ الاسم والبريد الإلكتروني" }));
          return;
        }

        const postData = JSON.stringify({
          from: "onboarding@resend.dev",
          to: TO_EMAIL,
          subject: `طلب مشروع جديد من ${name}`,
          html: `
            <h2>طلب مشروع جديد</h2>
            <p><strong>الاسم:</strong> ${name}</p>
            <p><strong>الإيميل:</strong> ${email}</p>
            <p><strong>الهاتف:</strong> ${phone || "-"}</p>
            <p><strong>البلد:</strong> ${country || "-"}</p>
            <p><strong>نوع الخدمة:</strong> ${service || "-"}</p>
            <p><strong>تفاصيل المشروع:</strong></p>
            <p>${message || "-"}</p>
          `,
        });

        const options = {
          hostname: 'api.resend.com',
          path: '/emails',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        };

        const apiReq = https.request(options, apiRes => {
          let responseData = '';
          apiRes.on('data', chunk => { responseData += chunk; });
          apiRes.on('end', () => {
            if (apiRes.statusCode >= 200 && apiRes.statusCode < 300) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, data: JSON.parse(responseData) }));
            } else {
              console.error("خطأ من Resend:", responseData);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: "فشل إرسال الإيميل من الخدمة" }));
            }
          });
        });

        apiReq.on('error', err => {
          console.error("خطأ في اتصال الـ API:", err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: "خطأ في الاتصال بخدمة البريد" }));
        });

        apiReq.write(postData);
        apiReq.end();

      } catch (err) {
        console.error("تفاصيل الخطأ في السيرفر:", err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || "حصل خطأ في السيرفر" }));
      }
    });
  }
});

server.listen(4000, () => {
  console.log('السيرفر شغال على http://localhost:4000');
});