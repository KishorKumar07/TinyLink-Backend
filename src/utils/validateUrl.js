/**
 * Validate if a string is a valid URL
 * @param {string} url - URL string to validate
 * @returns {boolean} - True if valid URL, false otherwise
 */
function validateUrl(url) {
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

module.exports = validateUrl;

