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
        // Go to the page
        await page.goto('https://www.sportybet.com/ng/m/', { waitUntil: 'networkidle2' });

        // INJECT JAVASCRIPT TO EXTRACT TOKEN
        // Browsers load JavaScript that generates the token. 
        // We have to simulate an OTP request to force the browser to generate the token in memory.
        // Note: The exact variable name is hidden deep in SportyBet's JS. 
        // Below, we try to intercept the network request directly from the browser:

        let capturedToken = null;

        // Intercept the network request to capture the token BEFORE it is sent to SportyBet
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (request.url().includes('/msg/v1/otps') && request.method() === 'POST') {
                const postData = request.postData();
                if (postData) {
                    try {
                        const jsonData = JSON.parse(postData);
                        if (jsonData.token) {
                            capturedToken = jsonData.token;
                            console.log("✅ Fresh Token Captured!");
                        }
                    } catch (e) {}
                }
            }
            request.continue();
        });

        // To trigger the request interception, we need to trick the page into thinking we clicked "Send OTP"
        // We do this by manually executing the specific JavaScript function that sends the SMS.
        // We send it to a dummy number so it triggers the network call.
        try {
            await page.evaluate(() => {
                // The website's internal function usually looks like `sendOtp('08012345678')`
                // You may need to inspect the webpage to find the exact function name.
                // For now, we try the direct approach:
                
                // 1. Fill in the dummy number in the hidden input field
                // 2. Click the button.
                // This forces the browser to generate the token and send it to our listener above.
                
                // NOTE: The exact selectors change. You must inspect the page in Chrome to find
                // the exact ID of the 'Send OTP' button to trigger this.
                const inputField = document.querySelector('input[type="tel"]');
                const submitBtn = document.querySelector('button[type="submit"]');
                if(inputField && submitBtn) {
                    inputField.value = '08011111111';
                    submitBtn.click();
                }
            });
        } catch (e) {}

        // Wait a few seconds for the network request to finish
        await new Promise(r => setTimeout(r, 5000));

        if (!capturedToken) {
            // If we couldn't intercept the request, we use a fallback method:
            // Dump the entire browser's localStorage/JS context to find it.
            capturedToken = await page.evaluate(() => {
                // Attempt to find the token in global variables
                for (let key in window) {
                    if (key.includes('token') || key.includes('session')) {
                        return window[key];
                    }
                }
                return null;
            });
        }

        await browser.close();

        if (capturedToken) {
            // Save the token to a file
            fs.writeFileSync('token.txt', capturedToken);
            console.log("Saved fresh token to token.txt");
        } else {
            console.error("Could not capture token. Will try again next run.");
            // Keep old token alive
        }

    } catch (e) {
        console.error("Error: ", e);
        await browser.close();
    }
})();
