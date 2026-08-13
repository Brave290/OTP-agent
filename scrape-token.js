const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({ 
        headless: 'new', 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36');

    let capturedToken = null;

    try {
        console.log("1. Loading SportyBet homepage...");
        await page.goto('https://www.sportybet.com/ng/m/', { waitUntil: 'networkidle2' });

        console.log("2. Clicking 'Join Now' button...");
        await page.evaluate(() => {
            const joinBtn = Array.from(document.querySelectorAll('a, button, div[role="button"]')).find(el => 
                el.innerText.trim().toLowerCase().includes('join now') || 
                el.innerText.trim().toLowerCase().includes('register')
            );
            if (joinBtn) joinBtn.click();
        });

        console.log("3. Waiting for first popup (Mobile Number form)...");
        await new Promise(r => setTimeout(r, 3000));

        // Step 4: Set up the interceptor to catch the token
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (request.url().includes('/msg/v1/otps') && request.method() === 'POST') {
                const postData = request.postData();
                if (postData) {
                    try {
                        const jsonData = JSON.parse(postData);
                        if (jsonData.token) {
                            capturedToken = String(jsonData.token);
                            console.log("✅ FRESH TOKEN CAPTURED!");
                        }
                    } catch (e) {}
                }
            }
            request.continue();
        });

        console.log("4. Entering dummy phone number and clicking 'Next'...");
        await page.evaluate(() => {
            // Find the Mobile Number input field
            const inputField = document.querySelector('input[type="tel"], input[type="number"], input[placeholder*="Mobile"]');
            if (inputField) {
                inputField.value = '08011111111'; // Dummy number to trigger the API
                inputField.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // Find and click the "Next" button
            const nextBtn = Array.from(document.querySelectorAll('button')).find(btn => 
                btn.innerText.trim().toLowerCase() === 'next'
            );
            if (nextBtn) nextBtn.click();
        });

        console.log("5. Waiting for API response (6 seconds)...");
        await new Promise(r => setTimeout(r, 6000));

        // Optional: Take a screenshot to see what the bot sees (for debugging)
        // await page.screenshot({ path: 'debug-screenshot.png' });

        await browser.close();

        if (capturedToken && capturedToken.length > 20) {
            fs.writeFileSync('token.txt', capturedToken.trim(), 'utf8');
            console.log("✅ Successfully saved token to token.txt");
        } else {
            console.error("❌ Could not capture token. Writing placeholder.");
            fs.writeFileSync('token.txt', 'PLACEHOLDER_TOKEN', 'utf8');
        }

    } catch (e) {
        console.error("❌ Script crashed: ", e);
        await browser.close();
    }
})();
