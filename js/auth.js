const urlParams = new URLSearchParams(window.location.search);
const redirectUrl = `https://pagerduty.github.io/pagerduty-bulk-user-mgr-sample/`;
const clientId = `37e14ac7da1930c2612f9b41ee69eea40087e317f020eb2b9336f4843c59927e`;
let PDJS = {};

if (urlParams.get('code')) {
    // post to /token to request token
    postData(`https://app.pagerduty.com/oauth/token?grant_type=authorization_code&code=${urlParams.get('code')}&redirect_uri=${redirectUrl}&client_id=${clientId}&code_verifier=${sessionStorage.getItem('code_verifier')}`, {})
        .then(data => {
            if (data.access_token) {
                localStorage.setItem("pd-token", (JSON.stringify(data)));
                PDJS = new PDJSobj({
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
    const gen128x8bitNonce = function() {
        const array = new Uint8Array(128); //( generate 1024bits 8*128
        window.crypto.getRandomValues(array);
        return array;
    };
    // hash verifier
    async function digestVerifier(vString) {
        const encoder = new TextEncoder();
        const verifier = encoder.encode(vString);
        const hash = await crypto.subtle.digest('SHA-256', verifier);
        return hash;
    }

    function btoaUTF16 (sString) {
        const aUTF16CodeUnits = new Uint16Array(sString.length);
        Array.prototype.forEach.call(aUTF16CodeUnits, function (el, idx, arr) { arr[idx] = sString.charCodeAt(idx); });
        return btoa(String.fromCharCode.apply(null, new Uint8Array(aUTF16CodeUnits.buffer)));
    }

    const base64Unicode = function(buffer) {
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

        return base64EncArr(new Uint8Array(buffer));
    }

    async function auth() {
        const generatedCode = gen128x8bitNonce();
        // base64 encode verifier here
        let codeVerifier = base64Unicode(generatedCode.buffer);
        codeVerifier = codeVerifier.replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=/g, '');
                    
        // save code_verifier
        sessionStorage.setItem('code_verifier', codeVerifier);
        const challengeBuffer =  await digestVerifier(codeVerifier);
        let challenge = base64Unicode(challengeBuffer);
            
        challenge = challenge.replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');         
        const authUrl = `https://app.pagerduty.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUrl}&response_type=code&code_challenge=${encodeURI(challenge)}&code_challenge_method=S256`;

        document.getElementById("pd-auth-button").href = authUrl;
    }
    auth();
}