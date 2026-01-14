import { MorseCode } from "../features/morse-code.js";
import { TextCipher, NumberSystem } from "../features/cipher.js";
import { InvisibleInk } from "../features/invisible-ink.js";
import { HashGenerator } from "../features/hash-generator.js";

export const CryptoPanelMixin = {
  initMorseCode() {
    const encodeInput = document.getElementById("morse-encode-input");
    const encodeBtn = document.getElementById("morse-encode-btn");
    const encodeOutput = document.getElementById("morse-encode-output");
    const encodeResult = document.getElementById("morse-encode-result");
    const copyBtn = document.getElementById("morse-copy-btn");
    const playBtn = document.getElementById("morse-play-btn");

    const decodeInput = document.getElementById("morse-decode-input");
    const decodeBtn = document.getElementById("morse-decode-btn");
    const decodeOutput = document.getElementById("morse-decode-output");
    const decodeResult = document.getElementById("morse-decode-result");

    if (encodeBtn) {
      encodeBtn.addEventListener("click", () => {
        const text = encodeInput.value.trim();
        if (!text) {
          this.showToast("Please enter text to encode", "error");
          return;
        }
        const morse = MorseCode.encode(text);
        encodeOutput.value = morse;
        encodeResult.hidden = false;
        this.showToast("Encoded to Morse code!", "success");
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(encodeOutput.value);
        this.showToast("Copied to clipboard!", "success");
      });
    }

    if (playBtn) {
      playBtn.addEventListener("click", () => {
        const morse = encodeOutput.value;
        if (!morse) return;
        MorseCode.playAudio(morse);
        this.showToast("Playing Morse audio...", "success");
      });
    }

    if (decodeBtn) {
      decodeBtn.addEventListener("click", () => {
        const morse = decodeInput.value.trim();
        if (!morse) {
          this.showToast("Please enter Morse code to decode", "error");
          return;
        }
        const text = MorseCode.decode(morse);
        decodeOutput.value = text;
        decodeResult.hidden = false;
        this.showToast("Decoded from Morse code!", "success");
      });
    }
  },

  initCipher() {
    const encodeInput = document.getElementById("cipher-encode-input");
    const encodeBtn = document.getElementById("cipher-encode-btn");
    const encodeOutput = document.getElementById("cipher-encode-output");
    const encodeResult = document.getElementById("cipher-encode-result");
    const cipherType = document.getElementById("cipher-type");
    const shiftSlider = document.getElementById("cipher-shift");
    const shiftValue = document.getElementById("cipher-shift-value");
    const shiftGroup = document.getElementById("cipher-shift-group");
    const keyGroup = document.getElementById("cipher-key-group");
    const keyInput = document.getElementById("cipher-key");
    const encodeCopyBtn = document.getElementById("cipher-encode-copy-btn");

    const decodeInput = document.getElementById("cipher-decode-input");
    const decodeBtn = document.getElementById("cipher-decode-btn");
    const decodeOutput = document.getElementById("cipher-decode-output");
    const decodeResult = document.getElementById("cipher-decode-result");
    const decodeType = document.getElementById("cipher-decode-type");
    const decodeShiftSlider = document.getElementById("cipher-decode-shift");
    const decodeShiftValue = document.getElementById(
      "cipher-decode-shift-value"
    );
    const decodeShiftGroup = document.getElementById(
      "cipher-decode-shift-group"
    );
    const decodeKeyGroup = document.getElementById("cipher-decode-key-group");
    const decodeKeyInput = document.getElementById("cipher-decode-key");

    const updateVisibility = (type, shiftGrp, keyGrp) => {
      if (type === "caesar") {
        shiftGrp.hidden = false;
        keyGrp.hidden = true;
      } else if (type === "vigenere") {
        shiftGrp.hidden = true;
        keyGrp.hidden = false;
      } else {
        shiftGrp.hidden = true;
        keyGrp.hidden = true;
      }
    };

    if (cipherType) {
      cipherType.addEventListener("change", () => {
        updateVisibility(cipherType.value, shiftGroup, keyGroup);
      });
    }

    if (decodeType) {
      decodeType.addEventListener("change", () => {
        updateVisibility(decodeType.value, decodeShiftGroup, decodeKeyGroup);
      });
    }

    if (shiftSlider) {
      shiftSlider.addEventListener("input", () => {
        shiftValue.textContent = shiftSlider.value;
      });
    }

    if (decodeShiftSlider) {
      decodeShiftSlider.addEventListener("input", () => {
        decodeShiftValue.textContent = decodeShiftSlider.value;
      });
    }

    if (encodeBtn) {
      encodeBtn.addEventListener("click", () => {
        const text = encodeInput.value;
        if (!text) {
          this.showToast("Please enter text to encrypt", "error");
          return;
        }
        const type = cipherType.value;
        const options = {
          shift: parseInt(shiftSlider.value),
          key: keyInput.value,
        };
        const result = TextCipher.encrypt(text, type, options);
        encodeOutput.value = result;
        encodeResult.hidden = false;
        this.showToast("Text encrypted!", "success");
      });
    }

    if (encodeCopyBtn) {
      encodeCopyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(encodeOutput.value);
        this.showToast("Copied to clipboard!", "success");
      });
    }

    if (decodeBtn) {
      decodeBtn.addEventListener("click", () => {
        const text = decodeInput.value;
        if (!text) {
          this.showToast("Please enter text to decrypt", "error");
          return;
        }
        const type = decodeType.value;
        const options = {
          shift: parseInt(decodeShiftSlider.value),
          key: decodeKeyInput.value,
        };
        const result = TextCipher.decrypt(text, type, options);
        decodeOutput.value = result;
        decodeResult.hidden = false;
        this.showToast("Text decrypted!", "success");
      });
    }
  },

  initNumberSystem() {
    const input = document.getElementById("number-input");
    const fromBase = document.getElementById("number-from-base");
    const convertBtn = document.getElementById("number-convert-btn");
    const results = document.getElementById("number-results");

    if (convertBtn) {
      convertBtn.addEventListener("click", () => {
        const value = input.value.trim();
        const base = parseInt(fromBase.value);

        if (!value) {
          this.showToast("Please enter a number", "error");
          return;
        }

        try {
          const result = NumberSystem.convert(value, base);
          document.getElementById("result-binary").textContent = result.binary;
          document.getElementById("result-octal").textContent = result.octal;
          document.getElementById("result-decimal").textContent =
            result.decimal;
          document.getElementById("result-hex").textContent = result.hex;
          results.hidden = false;
          this.showToast("Converted!", "success");
        } catch (e) {
          this.showToast(e.message, "error");
        }
      });
    }

    const romanInput = document.getElementById("roman-input");
    const romanBtn = document.getElementById("roman-convert-btn");
    const romanResult = document.getElementById("roman-result");
    const romanOutput = document.getElementById("roman-output");

    if (romanBtn) {
      romanBtn.addEventListener("click", () => {
        const val = romanInput.value.trim().toUpperCase();
        if (!val) {
          this.showToast("Please enter a value", "error");
          return;
        }

        if (/^\d+$/.test(val)) {
          const num = parseInt(val);
          if (num < 1 || num > 3999) {
            this.showToast("Enter number between 1 and 3999", "error");
            return;
          }
          romanOutput.textContent = this.toRoman(num);
          romanResult.hidden = false;
        } else if (/^[IVXLCDM]+$/.test(val)) {
          const num = this.fromRoman(val);
          romanOutput.textContent = num;
          romanResult.hidden = false;
        } else {
          this.showToast("Invalid Input", "error");
        }
      });
    }

    const romanCopyBtn = document.getElementById("roman-copy-btn");
    if (romanCopyBtn) {
      romanCopyBtn.addEventListener("click", () => {
        if (romanOutput.textContent) {
          navigator.clipboard.writeText(romanOutput.textContent);
          this.showToast("Copied!", "success");
        }
      });
    }

    const textInput = document.getElementById("text-binary-input");
    const textBtn = document.getElementById("text-binary-convert-btn");
    const textResult = document.getElementById("text-binary-result");
    const binOutput = document.getElementById("text-binary-output");
    const hexOutput = document.getElementById("text-hex-output");

    if (textBtn) {
      textBtn.addEventListener("click", () => {
        const text = textInput.value;
        if (!text) return;

        let binary = "";
        let hex = "";

        for (let i = 0; i < text.length; i++) {
          const code = text.charCodeAt(i);
          binary += code.toString(2).padStart(8, "0") + " ";
          hex += code.toString(16).padStart(2, "0").toUpperCase() + " ";
        }

        binOutput.value = binary.trim();
        hexOutput.value = hex.trim();
        textResult.hidden = false;
      });
    }
  },

  toRoman(num) {
    const lookup = {
      M: 1000,
      CM: 900,
      D: 500,
      CD: 400,
      C: 100,
      XC: 90,
      L: 50,
      XL: 40,
      X: 10,
      IX: 9,
      V: 5,
      IV: 4,
      I: 1,
    };
    let roman = "";
    for (let i in lookup) {
      while (num >= lookup[i]) {
        roman += i;
        num -= lookup[i];
      }
    }
    return roman;
  },

  fromRoman(roman) {
    const lookup = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    let num = 0;
    for (let i = 0; i < roman.length; i++) {
      let curr = lookup[roman[i]];
      let next = lookup[roman[i + 1]];
      if (next && curr < next) {
        num -= curr;
      } else {
        num += curr;
      }
    }
    return num;
  },

  initInvisibleInk() {
    const coverInput = document.getElementById("ink-cover-input");
    const secretInput = document.getElementById("ink-secret-input");
    const encodeBtn = document.getElementById("ink-encode-btn");
    const encodeOutput = document.getElementById("ink-encode-output");
    const encodeResult = document.getElementById("ink-encode-result");
    const copyBtn = document.getElementById("ink-copy-btn");

    const decodeInput = document.getElementById("ink-decode-input");
    const decodeBtn = document.getElementById("ink-decode-btn");
    const decodeOutput = document.getElementById("ink-decode-output");
    const decodeResult = document.getElementById("ink-decode-result");
    const decodeCopyBtn = document.getElementById("ink-decode-copy-btn");

    if (encodeBtn) {
      encodeBtn.addEventListener("click", () => {
        const cover = coverInput.value || "This is a normal text.";
        const secret = secretInput.value;

        if (!secret) {
          this.showToast("Please enter a secret message", "error");
          return;
        }

        const result = InvisibleInk.encode(cover, secret);
        encodeOutput.textContent = result;
        encodeResult.hidden = false;
        this.showToast("Message embedded with Invisible Ink!", "success");
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(encodeOutput.textContent);
        this.showToast("Copied! (Contains hidden message)", "success");
      });
    }

    if (decodeBtn) {
      decodeBtn.addEventListener("click", () => {
        const text = decodeInput.value;
        if (!text) {
          this.showToast("Please enter text to decode", "error");
          return;
        }

        const message = InvisibleInk.decode(text);
        if (message) {
          decodeOutput.textContent = message;
          decodeResult.hidden = false;
          this.showToast("Hidden message found!", "success");
        } else {
          this.showToast("No hidden message found", "error");
          decodeResult.hidden = true;
        }
      });
    }

    if (decodeCopyBtn) {
      decodeCopyBtn.addEventListener("click", () => {
        if (decodeOutput.textContent) {
          navigator.clipboard.writeText(decodeOutput.textContent);
          this.showToast("Decoded message copied!", "success");
        }
      });
    }
  },

  initHashGenerator() {
    const textInput = document.getElementById("hash-text-input");
    const textBtn = document.getElementById("hash-text-btn");
    const textResults = document.getElementById("hash-text-results");

    const fileDropzone = document.getElementById("hash-file-dropzone");
    const fileInput = document.getElementById("hash-file-input");
    const filePreview = document.getElementById("hash-file-preview");
    const fileName = document.getElementById("hash-file-name");
    const fileRemove = document.getElementById("hash-file-remove");
    const fileBtn = document.getElementById("hash-file-btn");
    const fileResults = document.getElementById("hash-file-results");

    let hashFile = null;

    if (textBtn) {
      textBtn.addEventListener("click", async () => {
        const text = textInput.value;
        if (!text) {
          this.showToast("Please enter text to hash", "error");
          return;
        }

        try {
          const hashes = await HashGenerator.generateAll(text);
          document.getElementById("hash-md5").textContent = hashes.md5;
          document.getElementById("hash-sha1").textContent = hashes.sha1;
          document.getElementById("hash-sha256").textContent = hashes.sha256;
          document.getElementById("hash-sha512").textContent = hashes.sha512;
          textResults.hidden = false;
          this.showToast("Hashes generated!", "success");
        } catch (e) {
          this.showToast("Hash generation failed: " + e.message, "error");
        }
      });
    }

    const loadFile = (file) => {
      hashFile = file;
      fileName.textContent = file.name;
      fileDropzone.querySelector(".upload-content").hidden = true;
      filePreview.hidden = false;
      fileBtn.disabled = false;
    };

    if (fileDropzone) {
      fileDropzone.addEventListener("click", () => fileInput.click());
      fileDropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        fileDropzone.classList.add("dragover");
      });
      fileDropzone.addEventListener("dragleave", () => {
        fileDropzone.classList.remove("dragover");
      });
      fileDropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        fileDropzone.classList.remove("dragover");
        if (e.dataTransfer.files.length) {
          loadFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (fileInput) {
      fileInput.addEventListener("change", () => {
        if (fileInput.files.length) {
          loadFile(fileInput.files[0]);
        }
      });
    }

    if (fileRemove) {
      fileRemove.addEventListener("click", (e) => {
        e.stopPropagation();
        hashFile = null;
        fileInput.value = "";
        fileDropzone.querySelector(".upload-content").hidden = false;
        filePreview.hidden = true;
        fileBtn.disabled = true;
        fileResults.hidden = true;
      });
    }

    if (fileBtn) {
      fileBtn.addEventListener("click", async () => {
        if (!hashFile) return;

        try {
          const buffer = await hashFile.arrayBuffer();
          const hashes = await HashGenerator.generateAll(buffer);
          document.getElementById("hash-file-md5").textContent = hashes.md5;
          document.getElementById("hash-file-sha1").textContent = hashes.sha1;
          document.getElementById("hash-file-sha256").textContent =
            hashes.sha256;
          document.getElementById("hash-file-sha512").textContent =
            hashes.sha512;
          fileResults.hidden = false;
          this.showToast("File hashes generated!", "success");
        } catch (e) {
          this.showToast("Hash generation failed: " + e.message, "error");
        }
      });
    }

    document.querySelectorAll(".hash-copy").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.target;
        const el = document.getElementById(target);
        if (el && el.textContent) {
          navigator.clipboard.writeText(el.textContent);
          this.showToast("Hash copied!", "success");
        }
      });
    });
  },

  initTextRepeater() {
    const inputText = document.getElementById("repeat-text-input");
    const countInput = document.getElementById("repeat-count");
    const separatorSelect = document.getElementById("repeat-separator");
    const repeatBtn = document.getElementById("repeat-btn");
    const resultPanel = document.getElementById("repeat-result");
    const output = document.getElementById("repeat-output");
    const copyBtn = document.getElementById("repeat-copy-btn");

    if (repeatBtn) {
      repeatBtn.addEventListener("click", () => {
        const text = inputText.value;
        const count = parseInt(countInput.value);
        let separator = separatorSelect.value;

        if (separator === "\\n") separator = "\n";

        if (!text) {
          this.showToast("Please enter text to repeat", "error");
          return;
        }

        if (isNaN(count) || count < 1) {
          this.showToast("Please enter a valid number of repetitions", "error");
          return;
        }

        if (count > 5000) {
          this.showToast("Max repetitions is 5000", "error");
          return;
        }

        let result = "";
        for (let i = 0; i < count; i++) {
          result += text + (i < count - 1 ? separator : "");
        }

        output.textContent = result;
        resultPanel.hidden = false;
        this.showToast("Text repeated " + count + " times!", "success");
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        const text = output.textContent;
        if (text) {
          try {
            await navigator.clipboard.writeText(text);
            this.showToast("Repeated text copied to clipboard!", "success");
          } catch (e) {
            this.showToast("Failed to copy text", "error");
          }
        }
      });
    }
  },

  initPasswordGenerator() {
    const lengthSlider = document.getElementById("pwd-length");
    const lengthValue = document.getElementById("pwd-length-value");
    const upperCheck = document.getElementById("pwd-upper");
    const lowerCheck = document.getElementById("pwd-lower");
    const numbersCheck = document.getElementById("pwd-numbers");
    const symbolsCheck = document.getElementById("pwd-symbols");
    const generateBtn = document.getElementById("pwd-generate-btn");
    const result = document.getElementById("pwd-result");
    const output = document.getElementById("pwd-output");
    const copyBtn = document.getElementById("pwd-copy-btn");
    const strengthText = document.getElementById("pwd-strength");
    const strengthBar = document.getElementById("pwd-strength-bar");

    const chars = {
      upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      lower: "abcdefghijklmnopqrstuvwxyz",
      numbers: "0123456789",
      symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
    };

    const generatePassword = () => {
      let charset = "";
      if (upperCheck?.checked) charset += chars.upper;
      if (lowerCheck?.checked) charset += chars.lower;
      if (numbersCheck?.checked) charset += chars.numbers;
      if (symbolsCheck?.checked) charset += chars.symbols;

      if (!charset) {
        this.showToast("Please select at least one character type", "error");
        return null;
      }

      const length = parseInt(lengthSlider?.value || 16);
      let password = "";
      const array = new Uint32Array(length);
      crypto.getRandomValues(array);

      for (let i = 0; i < length; i++) {
        password += charset[array[i] % charset.length];
      }

      return password;
    };

    const calculateStrength = (password) => {
      let score = 0;

      if (password.length >= 8) score += 1;
      if (password.length >= 12) score += 1;
      if (password.length >= 16) score += 1;
      if (password.length >= 24) score += 1;

      if (/[a-z]/.test(password)) score += 1;
      if (/[A-Z]/.test(password)) score += 1;
      if (/[0-9]/.test(password)) score += 1;
      if (/[^a-zA-Z0-9]/.test(password)) score += 1;

      if (score <= 2) return { label: "Weak", color: "#ef4444", percent: 25 };
      if (score <= 4) return { label: "Fair", color: "#f59e0b", percent: 50 };
      if (score <= 6) return { label: "Good", color: "#10b981", percent: 75 };
      return { label: "Strong", color: "#6366f1", percent: 100 };
    };

    if (lengthSlider) {
      lengthSlider.addEventListener("input", () => {
        lengthValue.textContent = lengthSlider.value;
      });
    }

    if (generateBtn) {
      generateBtn.addEventListener("click", () => {
        const password = generatePassword();
        if (password) {
          output.textContent = password;
          result.hidden = false;

          const strength = calculateStrength(password);
          strengthText.textContent = strength.label;
          strengthText.style.color = strength.color;
          strengthBar.style.width = strength.percent + "%";
          strengthBar.style.background = strength.color;

          this.showToast("Password generated!", "success");
        }
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        const password = output.textContent;
        if (password) {
          await navigator.clipboard.writeText(password);
          this.showToast("Password copied to clipboard!", "success");
        }
      });
    }
  },
};
