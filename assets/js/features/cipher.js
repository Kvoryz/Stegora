export class TextCipher {
  static caesar(text, shift, decrypt = false) {
    if (decrypt) shift = 26 - shift;
    return text
      .split("")
      .map((char) => {
        if (char.match(/[a-z]/i)) {
          const base = char === char.toUpperCase() ? 65 : 97;
          return String.fromCharCode(
            ((char.charCodeAt(0) - base + shift) % 26) + base
          );
        }
        return char;
      })
      .join("");
  }

  static rot13(text) {
    return this.caesar(text, 13);
  }

  static atbash(text) {
    return text
      .split("")
      .map((char) => {
        if (char.match(/[a-z]/i)) {
          const base = char === char.toUpperCase() ? 65 : 97;
          return String.fromCharCode(base + 25 - (char.charCodeAt(0) - base));
        }
        return char;
      })
      .join("");
  }

  static vigenere(text, key, decrypt = false) {
    if (!key) return text;
    key = key.toUpperCase().replace(/[^A-Z]/g, "");
    if (!key) return text;

    let keyIndex = 0;
    return text
      .split("")
      .map((char) => {
        if (char.match(/[a-z]/i)) {
          const base = char === char.toUpperCase() ? 65 : 97;
          let shift = key.charCodeAt(keyIndex % key.length) - 65;
          if (decrypt) shift = 26 - shift;
          keyIndex++;
          return String.fromCharCode(
            ((char.charCodeAt(0) - base + shift) % 26) + base
          );
        }
        return char;
      })
      .join("");
  }

  static encrypt(text, type, options = {}) {
    switch (type) {
      case "caesar":
        return this.caesar(text, options.shift || 3);
      case "rot13":
        return this.rot13(text);
      case "atbash":
        return this.atbash(text);
      case "vigenere":
        return this.vigenere(text, options.key || "KEY");
      default:
        return text;
    }
  }

  static decrypt(text, type, options = {}) {
    switch (type) {
      case "caesar":
        return this.caesar(text, options.shift || 3, true);
      case "rot13":
        return this.rot13(text);
      case "atbash":
        return this.atbash(text);
      case "vigenere":
        return this.vigenere(text, options.key || "KEY", true);
      default:
        return text;
    }
  }
}

export class NumberSystem {
  static convert(value, fromBase) {
    const decimal = parseInt(value, fromBase);
    if (isNaN(decimal)) throw new Error("Invalid number for selected base");

    return {
      binary: decimal.toString(2),
      octal: decimal.toString(8),
      decimal: decimal.toString(10),
      hex: decimal.toString(16).toUpperCase(),
    };
  }
}

export class SecretLink {
  static async encrypt(message, password) {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoder.encode(message)
    );

    const combined = new Uint8Array(
      salt.length + iv.length + encrypted.byteLength
    );
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    return btoa(String.fromCharCode(...combined))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  static async decrypt(data, password) {
    const encoder = new TextEncoder();
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    const combined = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        encrypted
      );
      return new TextDecoder().decode(decrypted);
    } catch {
      throw new Error("Invalid password or corrupted data");
    }
  }

  static generateLink(
    encryptedData,
    baseUrl = window.location.origin + window.location.pathname
  ) {
    return `${baseUrl}#secret=${encryptedData}`;
  }

  static extractFromUrl(url) {
    const match = url.match(/#secret=([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
  }
}
