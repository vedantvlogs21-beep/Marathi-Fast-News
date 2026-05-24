

async function run() {
  const token = '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';
  const owner = 'vedantvlogs21-beep';
  const repo = 'marathi-fast-news-';
  const path = 'uploads/test-' + Date.now() + '.txt';

  console.log("Testing GitHub API Upload directly...");
  try {
    const res = await globalThis.fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Script'
      },
      body: JSON.stringify({
        message: 'Test upload',
        content: Buffer.from('hello world').toString('base64')
      })
    });

    const status = res.status;
    const body = await res.text();
    console.log("Status:", status);
    console.log("Response:", body);
  } catch (err) {
    console.error("Crash:", err);
  }
}
run();
