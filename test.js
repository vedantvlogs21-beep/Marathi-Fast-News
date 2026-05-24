async function run() {
  console.log("Testing Login...");
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alex@example.com', password: 'password123' })
  });
  if (!loginRes.ok) {
    console.error("Login failed", await loginRes.text()); return;
  }
  const { token } = await loginRes.json();
  console.log("Testing Upload to GitHub...");
  const base64Data = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
  const uploadRes = await fetch('http://localhost:3000/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ filename: "test-pixel.gif", base64Data })
  });
  if (!uploadRes.ok) {
    console.error("Upload failed", await uploadRes.text()); return;
  }
  const result = await uploadRes.json();
  console.log("SUCCESS! Uploaded to GitHub:");
  console.log(result.url);
}
run();
