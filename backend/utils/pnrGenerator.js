// Generates a unique 12-digit numeric PNR
function generatePNR() {
  const ts   = Date.now().toString().slice(-8);   // last 8 digits of timestamp
  const rand = Math.floor(Math.random() * 9000 + 1000).toString(); // 4 digits
  return (ts + rand).slice(0, 12);
}

module.exports = { generatePNR };