
export class HashGenerator {
  static async md5(data) {
    const msgBuffer =
      typeof data === "string"
        ? new TextEncoder().encode(data)
        : new Uint8Array(data);

    function rotateLeft(x, n) {
      return (x << n) | (x >>> (32 - n));
    }

    const K = [];
    for (let i = 0; i < 64; i++) {
      K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000);
    }

    const S = [
      7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20,
      5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4,
      11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6,
      10, 15, 21,
    ];

    let a0 = 0x67452301,
      b0 = 0xefcdab89,
      c0 = 0x98badcfe,
      d0 = 0x10325476;

    const originalLength = msgBuffer.length;
    const paddingLength = (56 - ((originalLength + 1) % 64) + 64) % 64;
    const padded = new Uint8Array(originalLength + 1 + paddingLength + 8);
    padded.set(msgBuffer);
    padded[originalLength] = 0x80;

    const bitLength = originalLength * 8;
    const view = new DataView(padded.buffer);
    view.setUint32(padded.length - 8, bitLength >>> 0, true);
    view.setUint32(
      padded.length - 4,
      Math.floor(bitLength / 0x100000000),
      true
    );

    for (let i = 0; i < padded.length; i += 64) {
      const M = new Uint32Array(16);
      for (let j = 0; j < 16; j++) {
        M[j] = view.getUint32(i + j * 4, true);
      }

      let A = a0,
        B = b0,
        C = c0,
        D = d0;

      for (let j = 0; j < 64; j++) {
        let F, g;
        if (j < 16) {
          F = (B & C) | (~B & D);
          g = j;
        } else if (j < 32) {
          F = (D & B) | (~D & C);
          g = (5 * j + 1) % 16;
        } else if (j < 48) {
          F = B ^ C ^ D;
          g = (3 * j + 5) % 16;
        } else {
          F = C ^ (B | ~D);
          g = (7 * j) % 16;
        }

        F = (F + A + K[j] + M[g]) >>> 0;
        A = D;
        D = C;
        C = B;
        B = (B + rotateLeft(F, S[j])) >>> 0;
      }

      a0 = (a0 + A) >>> 0;
      b0 = (b0 + B) >>> 0;
      c0 = (c0 + C) >>> 0;
      d0 = (d0 + D) >>> 0;
    }

    const result = new Uint8Array(16);
    new DataView(result.buffer).setUint32(0, a0, true);
    new DataView(result.buffer).setUint32(4, b0, true);
    new DataView(result.buffer).setUint32(8, c0, true);
    new DataView(result.buffer).setUint32(12, d0, true);

    return Array.from(result)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  static async hashWithAlgorithm(data, algorithm) {
    const buffer =
      typeof data === "string"
        ? new TextEncoder().encode(data)
        : new Uint8Array(data);
    const hash = await crypto.subtle.digest(algorithm, buffer);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  static async sha1(data) {
    return this.hashWithAlgorithm(data, "SHA-1");
  }

  static async sha256(data) {
    return this.hashWithAlgorithm(data, "SHA-256");
  }

  static async sha512(data) {
    return this.hashWithAlgorithm(data, "SHA-512");
  }

  static async generateAll(data) {
    const [md5, sha1, sha256, sha512] = await Promise.all([
      this.md5(data),
      this.sha1(data),
      this.sha256(data),
      this.sha512(data),
    ]);
    return { md5, sha1, sha256, sha512 };
  }
}
