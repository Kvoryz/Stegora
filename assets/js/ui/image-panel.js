import { Crypto } from "../core/crypto.js";
import { Steganography } from "../core/steganography.js";

export const ImagePanelMixin = {
  initEncode() {
    const dropzone = document.getElementById("encode-dropzone");
    const input = document.getElementById("encode-image-input");
    const preview = document.getElementById("encode-preview");
    const previewImg = document.getElementById("encode-preview-img");
    const removeBtn = document.getElementById("encode-remove");
    const messageInput = document.getElementById("secret-message");
    const charCount = document.getElementById("char-count");
    const maxCharsDisplay = document.getElementById("max-chars");
    const submitBtn = document.getElementById("submit-btn");

    let maxAllowedChars = 0;

    this.setupDropzone(dropzone, input, (file) => {
      this.encodeFile = file;
      this.loadImage(file)
        .then((img) => {
          this.encodeImage = img;

          const totalPixels =
            (img.width || img.naturalWidth) * (img.height || img.naturalHeight);
          maxAllowedChars = Math.floor((totalPixels * 3 - 88) / 8);

          if (maxAllowedChars < 0) maxAllowedChars = 0;
          maxCharsDisplay.textContent = maxAllowedChars.toLocaleString();

          previewImg.src = URL.createObjectURL(file);
          preview.hidden = false;
          dropzone.querySelector(".upload-content").hidden = true;
          document.getElementById("hide-actions").hidden = false;
          this.updateEncodeButton(maxAllowedChars);
        })
        .catch((err) => {
          this.showToast(err.message, "error");
        });
    });

    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.encodeImage = null;
      this.encodeFile = null;
      maxAllowedChars = 0;
      maxCharsDisplay.textContent = "0";
      charCount.textContent = "0";
      preview.hidden = true;
      dropzone.querySelector(".upload-content").hidden = false;
      document.getElementById("hide-actions").hidden = true;
      input.value = "";

      document.getElementById("secret-message").value = "";
      document.getElementById("encode-password").value = "";
      document.getElementById("encode-hash-display").hidden = true;
      document.getElementById("encode-hash-value").textContent = "";

      this.updateEncodeButton(maxAllowedChars);
    });

    messageInput.addEventListener("input", () => {
      const len = messageInput.value.length;
      charCount.textContent = len.toLocaleString();

      if (len > maxAllowedChars && maxAllowedChars > 0) {
        charCount.style.color = "red";
      } else {
        charCount.style.color = "inherit";
      }

      this.updateEncodeButton(maxAllowedChars);
    });

    submitBtn.addEventListener("click", () => {
      this.encode();
    });

    const passwordInput = document.getElementById("encode-password");
    passwordInput.addEventListener("input", () => {
      this.updateEncodeButton(maxAllowedChars);
    });
  },

  initDecode() {
    const dropzone = document.getElementById("decode-dropzone");
    const input = document.getElementById("decode-image-input");
    const preview = document.getElementById("decode-preview");
    const previewImg = document.getElementById("decode-preview-img");
    const removeBtn = document.getElementById("decode-remove");
    const decodeBtn = document.getElementById("decode-btn");
    const copyBtn = document.getElementById("copy-btn");
    const passwordInput = document.getElementById("decode-password");

    this.setupDropzone(dropzone, input, (file) => {
      this.loadImage(file)
        .then((img) => {
          this.decodeImage = img;
          this.decodeFile = file;
          previewImg.src = URL.createObjectURL(file);
          preview.hidden = false;
          dropzone.querySelector(".upload-content").hidden = true;
          document.getElementById("extract-actions").hidden = false;

          const isScrambledFile = file.name.startsWith("scramble_");
          decodeBtn.disabled = isScrambledFile;
          if (isScrambledFile) {
            decodeBtn.title =
              "Scrambled images cannot be decoded. Use Unscramble tab instead.";
          } else {
            decodeBtn.title = "";
          }

          document.getElementById("result-box").hidden = true;
        })
        .catch((err) => {
          this.showToast(err.message, "error");
        });
    });

    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.decodeImage = null;
      this.decodeFile = null;
      preview.hidden = true;
      dropzone.querySelector(".upload-content").hidden = false;
      document.getElementById("extract-actions").hidden = true;
      input.value = "";
      passwordInput.value = "";
      decodeBtn.disabled = true;
      document.getElementById("result-box").hidden = true;
    });

    decodeBtn.addEventListener("click", () => this.decode());

    copyBtn.addEventListener("click", () => {
      const message = document.getElementById("result-message").textContent;
      this.copyToClipboard(message);
    });
  },

  updateEncodeButton(maxChars = 0) {
    const submitBtn = document.getElementById("submit-btn");
    const message = document.getElementById("secret-message").value.trim();
    const hasImage = !!this.encodeImage;
    const hasMessage = message.length > 0;
    const withinLimit = maxChars === 0 || message.length <= maxChars;

    submitBtn.disabled = !(hasImage && hasMessage && withinLimit);
  },

  async encode() {
    const message = document.getElementById("secret-message").value.trim();
    const password = document.getElementById("encode-password").value.trim();
    const decoyMessage = "Who are you?";

    if (!this.encodeImage || !message) {
      this.showToast("Please provide an image and message", "error");
      return;
    }

    try {
      let finalMessage = message;

      if (password) {
        this.showToast("Securing message...", "");
        const encryptedReal = await Crypto.encrypt(message, password);
        finalMessage =
          "<<DECOY>>" +
          JSON.stringify({
            real: encryptedReal,
            decoy: decoyMessage,
          });
      }

      this.canvas.width =
        this.encodeImage.width || this.encodeImage.naturalWidth;
      this.canvas.height =
        this.encodeImage.height || this.encodeImage.naturalHeight;
      this.ctx.drawImage(this.encodeImage, 0, 0);

      const imageData = this.ctx.getImageData(
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );

      const encodedData = await Steganography.encode(
        imageData,
        finalMessage,
        null
      );
      this.ctx.putImageData(encodedData, 0, 0);

      const messageHash = await Crypto.hash(message);
      document.getElementById("encode-hash-value").textContent = messageHash;
      document.getElementById("encode-hash-display").hidden = false;

      this.canvas.toBlob((blob) => {
        const baseName = this.encodeFile
          ? this.encodeFile.name.replace(/\.[^/.]+$/, "")
          : "image";
        this.downloadBlob(blob, `stegora_${baseName}.png`);

        const successMsg = password
          ? "Sanitized, Secured with decoy & Encoded!"
          : "Sanitized & Encoded!";
        this.showToast(successMsg, "success");
      }, "image/png");
    } catch (error) {
      this.showToast(error.message, "error");
    }
  },

  async decode() {
    if (!this.decodeImage) {
      this.showToast("Please provide an image", "error");
      return;
    }

    const password = document.getElementById("decode-password").value.trim();

    try {
      this.canvas.width =
        this.decodeImage.width || this.decodeImage.naturalWidth;
      this.canvas.height =
        this.decodeImage.height || this.decodeImage.naturalHeight;
      this.ctx.drawImage(this.decodeImage, 0, 0);

      const imageData = this.ctx.getImageData(
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );

      let message;
      let usedScrambling = false;

      try {
        message = await Steganography.decode(imageData, null);
      } catch (sequentialError) {
        if (password) {
          try {
            message = await Steganography.decode(imageData, password);
            usedScrambling = true;
          } catch (scrambledError) {
            throw new Error("No hidden message found or wrong password.");
          }
        } else {
          throw new Error("No hidden message found.");
        }
      }

      if (message.startsWith("<<DECOY>>")) {
        const jsonPart = message.slice(9);
        try {
          const data = JSON.parse(jsonPart);

          if (!password) {
            message = data.decoy;
            this.showToast("Message decoded (Decoy Mode)", "success");
          } else {
            try {
              message = await Crypto.decrypt(data.real, password);
              this.showToast("Message decoded!", "success");
            } catch {
              message = data.decoy;
              this.showToast("Message decoded (Decoy Mode)", "success");
            }
          }
        } catch {
          this.showToast("Failed to parse message structure", "error");
          return;
        }
      } else if (Crypto.isEncrypted(message)) {
        if (!password) {
          this.showToast(
            "This message is encrypted. Please enter the password.",
            "error"
          );
          return;
        }
        try {
          message = await Crypto.decrypt(message, password);
        } catch (e) {
          throw new Error("Wrong password.");
        }
      }

      const messageHash = await Crypto.hash(message);
      document.getElementById("decode-hash-value").textContent = messageHash;

      if (
        !message.startsWith("<<DECOY>>") &&
        !usedScrambling &&
        !Crypto.isEncrypted(message)
      ) {
        this.showToast("Message decoded!", "success");
      }

      document.getElementById("result-message").textContent = message;
      document.getElementById("result-box").hidden = false;
    } catch (error) {
      this.showToast(error.message, "error");
    }
  },

  initHashCopy() {
    const copyEncodeHash = document.getElementById("copy-encode-hash");
    const copyDecodeHash = document.getElementById("copy-decode-hash");

    if (copyEncodeHash) {
      copyEncodeHash.addEventListener("click", () => {
        const hash = document.getElementById("encode-hash-value").textContent;
        this.copyToClipboard(hash, "Hash copied!");
      });
    }

    if (copyDecodeHash) {
      copyDecodeHash.addEventListener("click", () => {
        const hash = document.getElementById("decode-hash-value").textContent;
        this.copyToClipboard(hash, "Hash copied!");
      });
    }
  },
};
