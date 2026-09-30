/**
 * Decrypts session.enc into .naukri-chrome-profile, .env, and resume PDF
 * using AES-256-GCM.
 *
 * Usage:
 *   node unpack-session.js <secret_passphrase>
 */
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const passphrase = process.argv[2] || process.env.SESSION_SECRET;
if (!passphrase) {
  console.error('Error: Please provide a secret passphrase or set SESSION_SECRET:\n  node unpack-session.js <secret_passphrase>');
  process.exit(1);
}

const encFile = path.join(__dirname, 'session.enc');
const tarFile = path.join(__dirname, 'temp_session.tar.gz');

if (!fs.existsSync(encFile)) {
  console.error(`Error: ${encFile} not found.`);
  process.exit(1);
}

try {
  console.log('Decrypting session.enc...');
  const bundle = fs.readFileSync(encFile);

  if (bundle.length < 44) {
    throw new Error('Encrypted bundle is invalid or truncated.');
  }

  const salt = bundle.subarray(0, 16);
  const iv = bundle.subarray(16, 28);
  const tag = bundle.subarray(28, 44);
  const ciphertext = bundle.subarray(44);

  const key = crypto.scryptSync(passphrase, salt, 32);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  fs.writeFileSync(tarFile, decrypted);

  console.log('Extracting archive...');
  execSync('tar -xzf temp_session.tar.gz', { cwd: __dirname, stdio: 'inherit' });
  fs.unlinkSync(tarFile);

  console.log('✅ Success! Decrypted and restored session files.');
} catch (err) {
  if (fs.existsSync(tarFile)) fs.unlinkSync(tarFile);
  console.error('❌ Decryption failed! Incorrect passphrase or corrupted bundle:', err.message);
  process.exit(1);
}
