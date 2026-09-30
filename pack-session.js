/**
 * Encrypts .naukri-chrome-profile, .env, and the resume PDF into session.enc
 * using AES-256-GCM.
 *
 * Usage:
 *   node pack-session.js <secret_passphrase>
 */
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const passphrase = process.argv[2] || process.env.SESSION_SECRET;
if (!passphrase) {
  console.error('Error: Please provide a secret passphrase:\n  node pack-session.js <secret_passphrase>');
  process.exit(1);
}

const tarFile = path.join(__dirname, 'temp_session.tar.gz');
const encFile = path.join(__dirname, 'session.enc');

console.log('Archiving profile, .env, and resume PDF...');
try {
  // Archive essentials, excluding heavy browser caches
  const tarCmd = [
    'tar -czf temp_session.tar.gz',
    '--exclude="*Cache*"',
    '--exclude="*BrowserMetrics*"',
    '--exclude="*Crashpad*"',
    '--exclude="*blob_storage*"',
    '--exclude="*Safe Browsing*"',
    '.naukri-chrome-profile',
    '.env',
    'cv_ashish_full_stack.pdf'
  ].join(' ');

  execSync(tarCmd, { cwd: __dirname, stdio: 'inherit' });

  console.log('Encrypting archive with AES-256-GCM...');
  const tarBuffer = fs.readFileSync(tarFile);

  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(passphrase, salt, 32);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(tarBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Format: [16 bytes salt][12 bytes iv][16 bytes auth tag][ciphertext]
  const finalBundle = Buffer.concat([salt, iv, tag, encrypted]);
  fs.writeFileSync(encFile, finalBundle);

  fs.unlinkSync(tarFile);
  console.log(`✅ Success! Created session.enc (${(finalBundle.length / 1024).toFixed(1)} KB)`);
  console.log('\nYou can now commit session.enc to git, and add your passphrase to GitHub Secrets as SESSION_SECRET.');
} catch (err) {
  if (fs.existsSync(tarFile)) fs.unlinkSync(tarFile);
  console.error('Failed to pack session:', err.message);
  process.exit(1);
}
