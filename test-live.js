const fetch = require('node-fetch');

async function testLiveOTP() {
    console.log('Testing OTP flow on https://billingsystem1.vercel.app/api/db ...');
    try {
        const response = await fetch('https://billingsystem1.vercel.app/api/db', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'sendOTP',
                payload: { email: 'amolguddeti3178@gmail.com' }
            })
        });
        
        const json = await response.json();
        console.log('Status Code:', response.status);
        console.log('Response:', JSON.stringify(json, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
}

testLiveOTP();
