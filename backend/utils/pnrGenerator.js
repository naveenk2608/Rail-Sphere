const crypto = require("crypto");

// 12 random digits. Not derived from the clock: PNR lookup is a public
// endpoint, so a timestamp-based value would let anyone walk the keyspace
// and read other passengers' details. Callers retry on a UNIQUE collision.
function generatePNR() {
  let pnr = "";
  for (let i = 0; i < 12; i++) pnr += crypto.randomInt(0, 10);
  return pnr;
}

module.exports = { generatePNR };
