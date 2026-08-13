// We use fetch to grab the fresh token from GitHub
const GITHUB_RAW_TOKEN_URL = 'https://raw.githubusercontent.com/brave290/otp-agent/main/token.txt';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { phone } = req.body;

  let cleanPhone = phone.trim();
  if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);

  try {
    // 1. Fetch the fresh token from GitHub
    const tokenResponse = await fetch(GITHUB_RAW_TOKEN_URL);
    if (!tokenResponse.ok) throw new Error("Could not fetch fresh token");
    const freshToken = (await tokenResponse.text()).trim();

    // 2. Send the request to SportyBet
    const payload = {
      token: freshToken,
      phone: cleanPhone,
      phoneCountryCode: "234",
      channel: "sms"
    };

    const response = await fetch('https://www.sportybet.com/msg/v1/otps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.bizCode === 10000) {
      return res.status(200).json({ success: true, message: `OTP sent to +234 ${cleanPhone}` });
    } else {
      return res.status(400).json({ success: false, message: data.message || "API Error" });
    }

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
