/**
 * Haven Cryptography Utilities
 * Uses Web Crypto API for secure, in-browser encryption.
 */

// Algorithms
const ALGO_KEY_PAIR = {
    name: "RSA-OAEP",
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
};

const ALGO_AES = "AES-GCM";

/**
 * Generate a new RSA key pair for the user
 * Public key is stored in Supabase profiles
 * Private key is stored locally (and ideally encrypted)
 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
    return window.crypto.subtle.generateKey(
        ALGO_KEY_PAIR,
        true,
        ["encrypt", "decrypt"]
    );
}

/**
 * Export key to string (JWK format) for storage/transmission
 */
export async function exportKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("jwk", key);
    return JSON.stringify(exported);
}

/**
 * Import key from string (JWK format)
 */
export async function importKey(keyStr: string, type: "public" | "private"): Promise<CryptoKey> {
    const keyData = JSON.parse(keyStr);
    return window.crypto.subtle.importKey(
        "jwk",
        keyData,
        ALGO_KEY_PAIR,
        true,
        type === "public" ? ["encrypt"] : ["decrypt"]
    );
}

/**
 * Encrypt a text message for multiple recipients
 * Uses Hybrid Encryption:
 * 1. Generate random AES key (Session Key)
 * 2. Encrypt message content with AES key
 * 3. Encrypt AES key SEPARATELY for each recipient using their RSA Public Key
 */
export async function encryptMessage(
    text: string,
    recipientPublicKeys: Record<string, CryptoKey> // userId -> PublicKey
): Promise<{ encryptedContent: string; encryptedKeys: Record<string, string>; iv: string }> {
    const encodedText = new TextEncoder().encode(text);

    // 1. Generate AES session key
    const sessionKey = await window.crypto.subtle.generateKey(
        { name: ALGO_AES, length: 256 },
        true,
        ["encrypt", "decrypt"]
    );

    // 2. Encrypt message with AES key
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedContentBuffer = await window.crypto.subtle.encrypt(
        { name: ALGO_AES, iv },
        sessionKey,
        encodedText
    );

    // 3. Export AES key to raw bytes
    const rawSessionKey = await window.crypto.subtle.exportKey("raw", sessionKey);

    // 4. Encrypt AES key for EACH Recipient
    const encryptedKeys: Record<string, string> = {};

    for (const [userId, publicKey] of Object.entries(recipientPublicKeys)) {
        const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            publicKey,
            rawSessionKey
        );
        encryptedKeys[userId] = arrayBufferToBase64(encryptedKeyBuffer);
    }

    return {
        encryptedContent: arrayBufferToBase64(encryptedContentBuffer),
        encryptedKeys,
        iv: arrayBufferToBase64(iv.buffer),
    };
}

/**
 * Decrypt a message
 */
export async function decryptMessage(
    encryptedContent: string,
    encryptedKeys: Record<string, string> | string, // Support legacy (string) and new (map)
    iv: string,
    privateKey: CryptoKey,
    userId: string // WE NEED TO KNOW WHICH USER IS DECRYPTING TO PICK THE RIGHT KEY
): Promise<string> {

    let encryptedKeyStr: string;

    // Handle Legacy (Single recipient string) vs New (Map)
    if (typeof encryptedKeys === 'string') {
        encryptedKeyStr = encryptedKeys;
    } else {
        encryptedKeyStr = encryptedKeys[userId];
        if (!encryptedKeyStr) {
            throw new Error(`No encrypted key found for user ${userId}`);
        }
    }

    // 1. Decrypt AES session key with Private Key
    const rawSessionKey = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        base64ToArrayBuffer(encryptedKeyStr)
    );

    // 2. Import AES session key
    const sessionKey = await window.crypto.subtle.importKey(
        "raw",
        rawSessionKey,
        { name: ALGO_AES },
        false,
        ["decrypt"]
    );

    // 3. Decrypt message content
    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: ALGO_AES, iv: base64ToArrayBuffer(iv) },
        sessionKey,
        base64ToArrayBuffer(encryptedContent)
    );

    return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Encrypt a file (Blob/File) with a fresh AES key.
 * Returns the encrypted blob and the key/iv needed to decrypt it.
 */
export async function encryptFile(
    file: File | Blob
): Promise<{ encryptedBlob: Blob; key: string; iv: string }> {
    const fileBuffer = await file.arrayBuffer();

    // 1. Generate AES session key
    const sessionKey = await window.crypto.subtle.generateKey(
        { name: ALGO_AES, length: 256 },
        true,
        ["encrypt", "decrypt"]
    );

    // 2. Encrypt file content
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: ALGO_AES, iv },
        sessionKey,
        fileBuffer
    );

    // 3. Export key to string
    const rawSessionKey = await window.crypto.subtle.exportKey("raw", sessionKey);

    return {
        encryptedBlob: new Blob([encryptedBuffer]),
        key: arrayBufferToBase64(rawSessionKey),
        iv: arrayBufferToBase64(iv.buffer),
    };
}

/**
 * Decrypt a file blob using provided key/iv.
 */
export async function decryptFile(
    encryptedBlob: Blob,
    keyStr: string,
    ivStr: string
): Promise<Blob> {
    const encryptedBuffer = await encryptedBlob.arrayBuffer();

    // 1. Import AES session key
    const sessionKey = await window.crypto.subtle.importKey(
        "raw",
        base64ToArrayBuffer(keyStr),
        { name: ALGO_AES },
        false,
        ["decrypt"]
    );

    // 2. Decrypt
    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: ALGO_AES, iv: base64ToArrayBuffer(ivStr) },
        sessionKey,
        encryptedBuffer
    );

    return new Blob([decryptedBuffer]);
}

// Helpers
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}
