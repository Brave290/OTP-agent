// 1. PASTE YOUR TWILIO CREDENTIALS HERE
const accountSid = 'ACd18106b15f7081f32b4066d04c3a3d6d';
const authToken = '45d2614'; // (You have this in your 2nd screenshot)
const twilioPhone = '+17372508034'; // (Your Twilio number from the 1st screenshot)

const twilio = require('twilio');
const client = twilio(accountSid, authToken);

export default async function handler(req, res) {
  // Allow your website to call this API
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone } = req.body;

  // Clean the number: Remove 0 at the start and ensure it's 11 digits
  let cleanPhone = phone.trim();
  if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
  
  // Add the Nigeria country code (+234)
  const fullNumber = `+234${cleanPhone}`;

  // Generate a real random 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    // Send the SMS via Twilio
    const message = await client.messages.create({
      body: `Your OTP verification code is: ${otpCode}`,
      from: twilioPhone,
      to: fullNumber
    });

    if (message.sid) {
      return res.status(200).json({ 
        success: true, 
        message: `OTP sent to +234 ${cleanPhone}`,
        // Note: In production, you would save this OTP in a database to verify it later.
        // For now, we send it back so you can test it works!
        testCode: otpCode 
      });
    } else {
      return res.status(500).json({ success: false, message: 'Failed to send SMS' });
    }

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
