import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

(async () => {
  const form = new FormData();
  form.append('photo', fs.createReadStream('test-photo.jpg'));
  form.append('email', 'admin@example.com');

  try {
    const res = await fetch('http://localhost:9000/api/auth/upload-photo', { method: 'POST', body: form });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', data);
  } catch (err) {
    console.error('Error:', err);
  }
})();
