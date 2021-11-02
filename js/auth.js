const urlParams = new URLSearchParams(window.location.search);
let pd = {};

if (urlParams.get('code')) {
    // post to /token to request token
    let requestTokenUrl = `https://app.pagerduty.com/oauth/token?` + 
                            `grant_type=authorization_code&` + 
                            `code=${urlParams.get('code')}&` +
                            `redirect_uri=${APP_CONFIG.redirectUrl}&` + 
                            `client_id=${APP_CONFIG.clientId}&` + 
                            `code_verifier=${sessionStorage.getItem('code_verifier')}`;
    postData(requestTokenUrl, {})
        .then(data => {
            if (data.access_token) {
                localStorage.setItem("pd-token", (JSON.stringify(data)));
                pd = new PagerDuty.api({
                    token: data.access_token,
                    tokenType: data.token_type,
                    logging: true
                });
            } else {
                document.write(error.error_description);
            }
        }) // JSON-string from `response.json()` call
        .catch(error => document.write(error));

    function postData(url, data) {
        return fetch(url, {
            method: 'POST'
        })
        .then(response => response.json()); // parses JSON response into native JavaScript objects 
    }
} else {
    function gen128x8bitNonce() {
         // account for the overhead of going to base64
         var bytes = Math.floor(128  / 1.37);  
         var array = new Uint8Array(bytes); //
         // note: there was a bug where getRandomValues was assumed
         // to modify the reference to the array and not return
         // a value
         array = window.crypto.getRandomValues(array);
         return base64Unicode(array.buffer);

    };
    // hash verifier
    async function digestVerifier(vString) {
        const encoder = new TextEncoder();
        const verifier = encoder.encode(vString);
        const hash = await crypto.subtle.digest('SHA-256', verifier);
        return hash;
    }

    function base64Unicode(buffer) {
        /*\
        |*|
        |*|  Base64 / binary data / UTF-8 strings utilities (#1)
        |*|
        |*|  https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding
        |*|
        |*|  Author: madmurphy
        |*|
        \*/
        const uint6ToB64 = function(nUint6) {

            return nUint6 < 26 ?
                nUint6 + 65 :
                nUint6 < 52 ?
                nUint6 + 71 :
                nUint6 < 62 ?
                nUint6 - 4 :
                nUint6 === 62 ?
                43 :
                nUint6 === 63 ?
                47 :
                65;

        }
        const base64EncArr = function(aBytes) {

            let eqLen = (3 - (aBytes.length % 3)) % 3,
                sB64Enc = "";

            for (let nMod3, nLen = aBytes.length, nUint24 = 0, nIdx = 0; nIdx < nLen; nIdx++) {
                nMod3 = nIdx % 3;
                /* Uncomment the following line in order to split the output in lines 76-character long: */
                /*
                if (nIdx > 0 && (nIdx * 4 / 3) % 76 === 0) { sB64Enc += "\r\n"; }
                */
                nUint24 |= aBytes[nIdx] << (16 >>> nMod3 & 24);
                if (nMod3 === 2 || aBytes.length - nIdx === 1) {
                    sB64Enc += String.fromCharCode(uint6ToB64(nUint24 >>> 18 & 63), uint6ToB64(nUint24 >>> 12 & 63), uint6ToB64(nUint24 >>> 6 & 63), uint6ToB64(nUint24 & 63));
                    nUint24 = 0;
                }
            }

            return eqLen === 0 ?
                sB64Enc :
                sB64Enc.substring(0, sB64Enc.length - eqLen) + (eqLen === 1 ? "=" : "==");
        };
        let encodedArr =  base64EncArr(new Uint8Array(buffer));
        // manually finishing up the url encoding fo the encodedArr
        encodedArr = encodedArr.replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=/g, '');
        return encodedArr;
    }
    
    async function auth() {
        // generate code verifier
        const codeVerifier = gen128x8bitNonce();
        // save code_verifier
        sessionStorage.setItem('code_verifier', codeVerifier);
        // generate the challenge from the code verifier
        const challengeBuffer =  await digestVerifier(codeVerifier);
        // base64 encode the challenge
        const challenge = base64Unicode(challengeBuffer);        
        // build authUrl
        const authUrl = `https://app.pagerduty.com/oauth/authorize?` +
                            `client_id=${APP_CONFIG.clientId}&` +
                            `redirect_uri=${APP_CONFIG.redirectUrl}&` + 
                            `response_type=code&` +
                            `code_challenge=${encodeURI(challenge)}&` + 
                            `code_challenge_method=S256`;

        document.getElementById("pd-auth-button").href = authUrl;
    }
    auth();
}