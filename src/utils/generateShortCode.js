// Cache for nanoid import (ES Module)
let nanoidGenerator = null;
let nanoidPromise = null;

// Custom alphabet: A-Z, a-z, 0-9 (alphanumeric only)
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Initialize nanoid generator (lazy loading)
 * @returns {Promise<Function>}
 */
async function getNanoidGenerator() {
  if (nanoidGenerator) {
    return nanoidGenerator;
  }
  if (!nanoidPromise) {
    nanoidPromise = import('nanoid').then(({ customAlphabet }) => {
      nanoidGenerator = customAlphabet(alphabet);
      return nanoidGenerator;
    });
  }
  return nanoidPromise;
}

/**
 * Generate a unique short code for URL shortening
 * Codes follow [A-Za-z0-9]{6,8} pattern as per specification
 * @param {number} length - Length of the short code (6-8, default: 8)
 * @returns {Promise<string>} - Generated short code
 */
async function generateShortCode(length = 8) {
  // Ensure length is between 6 and 8
  const codeLength = Math.max(6, Math.min(8, length));
  const generator = await getNanoidGenerator();
  return generator(codeLength);
}

module.exports = generateShortCode;

