import { Crypto } from "../core/crypto.js";
import { AudioSteganography } from "../core/steganography.js";

export const AudioPanelMixin = {
  initAudio() {
    const modeButtons = document.querySelectorAll(".audio-mode");
    modeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        modeButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const mode = btn.dataset.mode;
        document.getElementById("audio-encode-section").hidden =
          mode !== "encode";
        document.getElementById("audio-decode-section").hidden =
          mode !== "decode";
      });
    });

    const encodeDropzone = document.getElementById("audio-encode-dropzone");
    const encodeInput = document.getElementById("audio-encode-input");
    const encodePreview = document.getElementById("audio-encode-preview");
    const encodeFilename = document.getElementById("audio-encode-filename");
    const encodeRemove = document.getElementById("audio-encode-remove");
    const audioMessage = document.getElementById("audio-secret-message");
    const audioEncodeBtn = document.getElementById("audio-encode-btn");

    this.setupAudioDropzone(encodeDropzone, encodeInput, (file) => {
      file.arrayBuffer().then((buffer) => {
        this.audioEncodeBuffer = buffer;
        encodeFilename.textContent = file.name;
        encodePreview.hidden = false;
        encodeDropzone.querySelector(".upload-content").hidden = true;
        document.getElementById("audio-enc-actions").hidden = false;
        this.updateAudioEncodeButton();
      });
    });

    encodeRemove.addEventListener("click", (e) => {
      e.stopPropagation();
      this.audioEncodeBuffer = null;
      encodePreview.hidden = true;
      encodeDropzone.querySelector(".upload-content").hidden = false;
      document.getElementById("audio-enc-actions").hidden = true;
      encodeInput.value = "";
      audioMessage.value = "";
      document.getElementById("audio-encode-password").value = "";
      this.updateAudioEncodeButton();
    });

    audioMessage.addEventListener("input", () => {
      this.updateAudioEncodeButton();
    });

    audioEncodeBtn.addEventListener("click", () => this.encodeAudio());

    const decodeDropzone = document.getElementById("audio-decode-dropzone");
    const decodeInput = document.getElementById("audio-decode-input");
    const decodePreview = document.getElementById("audio-decode-preview");
    const decodeFilename = document.getElementById("audio-decode-filename");
    const decodeRemove = document.getElementById("audio-decode-remove");
    const audioDecodeBtn = document.getElementById("audio-decode-btn");
    const audioCopyBtn = document.getElementById("audio-copy-btn");

    this.setupAudioDropzone(decodeDropzone, decodeInput, (file) => {
      file.arrayBuffer().then((buffer) => {
        this.audioDecodeBuffer = buffer;
        decodeFilename.textContent = file.name;
        decodePreview.hidden = false;
        decodeDropzone.querySelector(".upload-content").hidden = true;
        document.getElementById("audio-dec-actions").hidden = false;
        audioDecodeBtn.disabled = false;
        document.getElementById("audio-result-box").hidden = true;
      });
    });

    decodeRemove.addEventListener("click", (e) => {
      e.stopPropagation();
      this.audioDecodeBuffer = null;
      decodePreview.hidden = true;
      decodeDropzone.querySelector(".upload-content").hidden = false;
      document.getElementById("audio-dec-actions").hidden = true;
      decodeInput.value = "";
      document.getElementById("audio-decode-password").value = "";
      audioDecodeBtn.disabled = true;
      document.getElementById("audio-result-box").hidden = true;
    });

    audioDecodeBtn.addEventListener("click", () => this.decodeAudio());

    audioCopyBtn.addEventListener("click", () => {
      const message = document.getElementById(
        "audio-result-message"
      ).textContent;
      this.copyToClipboard(message);
    });

    const audioPasswordToggles = [
      { btn: "toggle-audio-encode-password", input: "audio-encode-password" },
      { btn: "toggle-audio-decode-password", input: "audio-decode-password" },
    ];

    audioPasswordToggles.forEach(({ btn, input }) => {
      const button = document.getElementById(btn);
      const passwordInput = document.getElementById(input);
      if (button && passwordInput) {
        button.addEventListener("click", () => {
          const isPassword = passwordInput.type === "password";
          passwordInput.type = isPassword ? "text" : "password";
        });
      }
    });
  },

  setupAudioDropzone(dropzone, input, onFile) {
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
      if (file && file.name.endsWith(".wav")) {
        onFile(file);
      } else {
        this.showToast("Please drop a WAV file", "error");
      }
    });

    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) onFile(file);
    });
  },

  updateAudioEncodeButton() {
    const message = document.getElementById("audio-secret-message").value;
    document.getElementById("audio-encode-btn").disabled =
      !this.audioEncodeBuffer || !message.trim();
  },

  async encodeAudio() {
    const message = document
      .getElementById("audio-secret-message")
      .value.trim();
    const password = document
      .getElementById("audio-encode-password")
      .value.trim();

    if (!this.audioEncodeBuffer || !message) {
      this.showToast("Please provide an audio file and message", "error");
      return;
    }

    try {
      let finalMessage = message;

      if (password) {
        this.showToast("Encrypting message...", "");
        finalMessage = await Crypto.encrypt(message, password);
      }

      const encodedBuffer = await AudioSteganography.encode(
        this.audioEncodeBuffer,
        finalMessage
      );

      const blob = new Blob([encodedBuffer], { type: "audio/wav" });
      this.downloadBlob(blob, "stegora_encoded.wav");

      this.showToast("Audio encoded and downloaded!", "success");
    } catch (error) {
      this.showToast(error.message, "error");
    }
  },

  async decodeAudio() {
    if (!this.audioDecodeBuffer) {
      this.showToast("Please provide an audio file", "error");
      return;
    }

    const password = document
      .getElementById("audio-decode-password")
      .value.trim();

    try {
      let message = await AudioSteganography.decode(this.audioDecodeBuffer);

      if (Crypto.isEncrypted(message)) {
        if (!password) {
          this.showToast(
            "This message is encrypted. Please enter the password.",
            "error"
          );
          return;
        }
        message = await Crypto.decrypt(message, password);
      }

      this.showToast("Message decoded!", "success");
      const resultBox = document.getElementById("audio-result-box");
      const resultMsg = document.getElementById("audio-result-message");

      resultMsg.textContent = message;
      resultBox.hidden = false;
    } catch (error) {
      this.showToast(error.message, "error");
    }
  },
};
