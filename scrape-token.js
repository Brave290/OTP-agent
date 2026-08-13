const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    // Launch a fake browser on GitHub's server
    const browser = await puppeteer.launch({ 
        headless: 'new', 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    
    // Set a real-looking user agent
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36');

    try {
        console.log("Loading SportyBet page...");
        await page.goto('https://www.sportybet.com/ng/m/', { waitUntil: 'networkidle2' });

        let capturedToken = null;

        // Intercept the network request
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (request.url().includes('/msg/v1/otps') && request.method() === 'POST') {
                const postData = request.postData();
                if (postData) {
                    try {
                        const jsonData = JSON.parse(postData);
                        if (jsonData.token) {
                            // FIX 1: Force it to be a string immediately
                            capturedToken = String(jsonData.token);
                            console.log("✅ Fresh Token Captured!");
                        }
                    } catch (e) {}
                }
            }
            request.continue();
        });

        // Force the hidden trigger
        try {
            await page.evaluate(() => {
                // Try to find any input field and submit button
                const inputField = document.querySelector('input[type="tel"], input[type="number"], input[type="text"]');
                const submitBtn = document.querySelector('button[type="submit"], button:not([class*="close"])');
                
                if(inputField && submitBtn) {
                    // Attempt to trigger the OTP request via JS
                    inputField.value = '08011111111';
                    submitBtn.click();
                }
            });
        } catch (e) {}

        // Wait for network request
        await new Promise(r => setTimeout(r, 5000));

        if (!capturedToken) {
            capturedToken = await page.evaluate(() => {
                for (let key in window) {
                    if (typeof window[key] === 'string' && window[key].length > 20) {
                        return window[key];
                    }
                }
                return null;
            });
        }

        await browser.close();

        if (capturedToken) {
            // FIX 2: Ensure it's saved as a clean string
            fs.writeFileSync('token.txt', capturedToken.trim(), 'utf8');
            console.log("Saved fresh token to token.txt");
        } else {
            console.error("Could not capture token. Will try again next run.");
        }

    } catch (e) {
        console.error("Error: ", e);
        await browser.close();
    }
})();
