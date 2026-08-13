const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({ 
        headless: 'new', 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    
    // Set a real-looking user agent
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36');

    let capturedToken = null;

    try {
        console.log("Loading SportyBet page...");
        await page.goto('https://www.sportybet.com/ng/m/', { waitUntil: 'networkidle2' });

        // Intercept the network request to capture the token
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            // Look for the specific OTP API endpoint
            if (request.url().includes('/msg/v1/otps') && request.method() === 'POST') {
                const postData = request.postData();
                if (postData) {
                    try {
                        const jsonData = JSON.parse(postData);
                        if (jsonData.token) {
                            capturedToken = String(jsonData.token);
                            console.log("✅ Fresh Token Captured!");
                        }
                    } catch (e) {}
                }
            }
            request.continue();
        });

        console.log("Attempting to click 'Send Code' button...");
        
        // Trigger the OTP request by clicking the actual button on the page
        await page.evaluate(() => {
            // Look for any button that says "Send Code" or "Get OTP" or "Verify"
            const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
            const targetButton = buttons.find(btn => 
                btn.innerText.toLowerCase().includes('send') || 
                btn.innerText.toLowerCase().includes('code') ||
                btn.innerText.toLowerCase().includes('otp') ||
                btn.innerText.toLowerCase().includes('verify')
            );
            
            if (targetButton) {
                targetButton.click();
            } else {
                // Fallback: try clicking the first submit button
                const submitBtn = document.querySelector('button[type="submit"]');
                if (submitBtn) submitBtn.click();
            }
        });

        // Wait 5 seconds for the network request to finish
        console.log("Waiting for API response...");
        await new Promise(r => setTimeout(r, 6000));

        await browser.close();

        if (capturedToken && capturedToken.length > 20) {
            fs.writeFileSync('token.txt', capturedToken.trim(), 'utf8');
            console.log("✅ Successfully saved fresh token to token.txt");
        } else {
            // If we failed, write a placeholder so the script doesn't crash
            console.error("❌ Could not capture token. Writing placeholder.");
            fs.writeFileSync('token.txt', 'PLACEHOLDER_TOKEN', 'utf8');
        }

    } catch (e) {
        console.error("❌ Error: ", e);
        await browser.close();
    }
})();
