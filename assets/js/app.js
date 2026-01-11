class Crypto {
  static ENCRYPTED_PREFIX = "<<ENC>>";

  static async deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  static async encrypt(message, password) {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(password, salt);

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encoder.encode(message)
    );

    const combined = new Uint8Array(
      salt.length + iv.length + encrypted.byteLength
    );
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    return this.ENCRYPTED_PREFIX + btoa(String.fromCharCode(...combined));
  }

  static async decrypt(encryptedData, password) {
    if (!encryptedData.startsWith(this.ENCRYPTED_PREFIX)) {
      return encryptedData;
    }

    const data = encryptedData.slice(this.ENCRYPTED_PREFIX.length);
    const combined = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));

    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);

    const key = await this.deriveKey(password, salt);

    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encrypted
      );
      return new TextDecoder().decode(decrypted);
    } catch {
      throw new Error("Incorrect password or corrupted data");
    }
  }

  static isEncrypted(message) {
    return message.startsWith(this.ENCRYPTED_PREFIX);
  }
}

class Steganography {
  static HEADER_BITS = 32;
  static DELIMITER = "<<END>>";

  static textToBinary(text) {
    return text
      .split("")
      .map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
      .join("");
  }

  static binaryToText(binary) {
    const bytes = binary.match(/.{8}/g) || [];
    return bytes.map((byte) => String.fromCharCode(parseInt(byte, 2))).join("");
  }

  static encode(imageData, message) {
    const fullMessage = message + this.DELIMITER;
    const binaryMessage = this.textToBinary(fullMessage);
    const messageLength = binaryMessage.length;

    const binaryLength = messageLength
      .toString(2)
      .padStart(this.HEADER_BITS, "0");
    const fullBinary = binaryLength + binaryMessage;

    const requiredPixels = Math.ceil(fullBinary.length / 3);
    const totalPixels = imageData.width * imageData.height;

    if (requiredPixels > totalPixels) {
      throw new Error(
        `Image too small. Need ${requiredPixels} pixels, but image only has ${totalPixels}. Use a larger image or shorter message.`
      );
    }

    const data = imageData.data;

    for (let bitIndex = 0; bitIndex < fullBinary.length; bitIndex++) {
      const pixelIndex = Math.floor(bitIndex / 3) * 4;
      const channelOffset = bitIndex % 3;
      const bit = parseInt(fullBinary[bitIndex], 10);
      data[pixelIndex + channelOffset] =
        (data[pixelIndex + channelOffset] & 0xfe) | bit;
    }

    return imageData;
  }

  static decode(imageData) {
    const data = imageData.data;
    let bitIndex = 0;
    let binaryLength = "";

    while (bitIndex < this.HEADER_BITS) {
      const pixelIndex = Math.floor(bitIndex / 3) * 4;
      const channelOffset = bitIndex % 3;
      binaryLength += (data[pixelIndex + channelOffset] & 1).toString();
      bitIndex++;
    }

    const messageLength = parseInt(binaryLength, 2);

    if (messageLength <= 0 || messageLength > 10000000) {
      throw new Error("No hidden message found in this image.");
    }

    let binaryMessage = "";
    const totalBitsNeeded = this.HEADER_BITS + messageLength;

    while (bitIndex < totalBitsNeeded) {
      const pixelIndex = Math.floor(bitIndex / 3) * 4;
      const channelOffset = bitIndex % 3;

      if (pixelIndex >= data.length) break;

      binaryMessage += (data[pixelIndex + channelOffset] & 1).toString();
      bitIndex++;
    }

    const message = this.binaryToText(binaryMessage);
    const delimiterIndex = message.indexOf(this.DELIMITER);

    if (delimiterIndex === -1) {
      throw new Error("No hidden message found in this image.");
    }

    return message.substring(0, delimiterIndex);
  }
}

class StegoraApp {
  constructor() {
    this.canvas = document.getElementById("canvas");
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    this.encodeImage = null;
    this.decodeImage = null;

    this.initTabs();
    this.initEncode();
    this.initDecode();
    this.initPasswordToggles();
    this.initModal();
  }

  initTabs() {
    const tabs = document.querySelectorAll(".tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        document
          .querySelectorAll(".panel")
          .forEach((p) => p.classList.remove("active"));
        document
          .getElementById(`${tab.dataset.tab}-panel`)
          .classList.add("active");
      });
    });
  }

  initPasswordToggles() {
    const toggles = [
      { btn: "toggle-encode-password", input: "encode-password" },
      { btn: "toggle-decode-password", input: "decode-password" },
    ];

    toggles.forEach(({ btn, input }) => {
      const button = document.getElementById(btn);
      const passwordInput = document.getElementById(input);

      if (button && passwordInput) {
        button.addEventListener("click", () => {
          const isPassword = passwordInput.type === "password";
          passwordInput.type = isPassword ? "text" : "password";
          button.classList.toggle("active", isPassword);
        });
      }
    });
  }

  initModal() {
    const modal = document.getElementById("image-modal");
    const modalImage = document.getElementById("modal-image");
    const modalClose = document.getElementById("modal-close");
    const backdrop = modal.querySelector(".modal-backdrop");

    document.querySelectorAll(".preview-view").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const targetId = btn.dataset.target;
        const img = document.getElementById(targetId);
        if (img && img.src) {
          modalImage.src = img.src;
          modal.hidden = false;
          document.body.style.overflow = "hidden";
        }
      });
    });

    const closeModal = () => {
      modal.hidden = true;
      document.body.style.overflow = "";
    };

    modalClose.addEventListener("click", closeModal);
    backdrop.addEventListener("click", closeModal);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.hidden) {
        closeModal();
      }
    });
  }

  initEncode() {
    const dropzone = document.getElementById("encode-dropzone");
    const input = document.getElementById("encode-image-input");
    const preview = document.getElementById("encode-preview");
    const previewImg = document.getElementById("encode-preview-img");
    const removeBtn = document.getElementById("encode-remove");
    const messageInput = document.getElementById("secret-message");
    const charCount = document.getElementById("char-count");
    const encodeBtn = document.getElementById("encode-btn");

    this.setupDropzone(dropzone, input, (file) => {
      this.loadImage(file)
        .then((img) => {
          this.encodeImage = img;
          previewImg.src = img.src;
          preview.hidden = false;
          dropzone.querySelector(".upload-content").hidden = true;
          this.updateEncodeButton();
        })
        .catch((err) => {
          this.showToast(err.message, "error");
        });
    });

    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.encodeImage = null;
      preview.hidden = true;
      dropzone.querySelector(".upload-content").hidden = false;
      input.value = "";
      this.updateEncodeButton();
    });

    messageInput.addEventListener("input", () => {
      charCount.textContent = messageInput.value.length;
      this.updateEncodeButton();
    });

    encodeBtn.addEventListener("click", () => this.encode());
  }

  initDecode() {
    const dropzone = document.getElementById("decode-dropzone");
    const input = document.getElementById("decode-image-input");
    const preview = document.getElementById("decode-preview");
    const previewImg = document.getElementById("decode-preview-img");
    const removeBtn = document.getElementById("decode-remove");
    const decodeBtn = document.getElementById("decode-btn");
    const copyBtn = document.getElementById("copy-btn");

    this.setupDropzone(dropzone, input, (file) => {
      this.loadImage(file)
        .then((img) => {
          this.decodeImage = img;
          previewImg.src = img.src;
          preview.hidden = false;
          dropzone.querySelector(".upload-content").hidden = true;
          decodeBtn.disabled = false;
          document.getElementById("result-box").hidden = true;
        })
        .catch((err) => {
          this.showToast(err.message, "error");
        });
    });

    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.decodeImage = null;
      preview.hidden = true;
      dropzone.querySelector(".upload-content").hidden = false;
      input.value = "";
      decodeBtn.disabled = true;
      document.getElementById("result-box").hidden = true;
    });

    decodeBtn.addEventListener("click", () => this.decode());

    copyBtn.addEventListener("click", () => {
      const message = document.getElementById("result-message").textContent;
      navigator.clipboard.writeText(message).then(() => {
        this.showToast("Copied to clipboard!", "success");
      });
    });
  }

  setupDropzone(dropzone, input, onFile) {
    dropzone.addEventListener("click", () => input.click());

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("dragover");
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        onFile(file);
      } else {
        this.showToast("Please drop a valid image file", "error");
      }
    });

    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) onFile(file);
    });
  }

  loadImage(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        reject(new Error("Please select a valid image file"));
        return;
      }

      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  }

  updateEncodeButton() {
    const message = document.getElementById("secret-message").value;
    document.getElementById("encode-btn").disabled =
      !this.encodeImage || !message.trim();
  }

  async encode() {
    const message = document.getElementById("secret-message").value.trim();
    const password = document.getElementById("encode-password").value;

    if (!this.encodeImage || !message) {
      this.showToast("Please provide an image and message", "error");
      return;
    }

    try {
      let finalMessage = message;

      if (password) {
        this.showToast("Encrypting message...", "");
        finalMessage = await Crypto.encrypt(message, password);
      }

      this.canvas.width = this.encodeImage.naturalWidth;
      this.canvas.height = this.encodeImage.naturalHeight;
      this.ctx.drawImage(this.encodeImage, 0, 0);

      const imageData = this.ctx.getImageData(
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );
      const encodedData = Steganography.encode(imageData, finalMessage);
      this.ctx.putImageData(encodedData, 0, 0);

      this.canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "stegora_encoded.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const successMsg = password
          ? "Encrypted & encoded successfully!"
          : "Image encoded and downloaded!";
        this.showToast(successMsg, "success");
      }, "image/png");
    } catch (error) {
      this.showToast(error.message, "error");
    }
  }

  async decode() {
    if (!this.decodeImage) {
      this.showToast("Please provide an image", "error");
      return;
    }

    try {
      this.canvas.width = this.decodeImage.naturalWidth;
      this.canvas.height = this.decodeImage.naturalHeight;
      this.ctx.drawImage(this.decodeImage, 0, 0);

      const imageData = this.ctx.getImageData(
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );
      let message = Steganography.decode(imageData);

      if (Crypto.isEncrypted(message)) {
        const password = document.getElementById("decode-password").value;
        if (!password) {
          this.showToast(
            "This message is encrypted. Please enter the password.",
            "error"
          );
          return;
        }
        message = await Crypto.decrypt(message, password);
        this.showToast("Decrypted successfully!", "success");
      } else {
        this.showToast("Message decoded!", "success");
      }

      document.getElementById("result-message").textContent = message;
      document.getElementById("result-box").hidden = false;
    } catch (error) {
      this.showToast(error.message, "error");
    }
  }

  showToast(message, type = "") {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = "toast" + (type ? ` ${type}` : "");
    toast.classList.add("show");

    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new StegoraApp();
});
