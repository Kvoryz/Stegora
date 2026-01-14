# Stegora - Secure Steganography & Privacy Tools

<p align="center">
  <img src="assets/iconste.png" alt="Stegora Icon" width="150">
</p>

Stegora is a modern, privacy-focused web application for **hiding secrets**, **analyzing images**, and **protecting your privacy**. Everything runs 100% client-side—no data leaves your device.

## ✨ Features

### 🖼️ Image Tools

| Feature                | Description                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| **Steganography**      | Hide text messages inside PNG/JPG/WEBP images using LSB encoding |
| **Scramble**           | Visually encrypt images with password-protected pixel scrambling |
| **Redact (Obfuscate)** | Pixelate or blur sensitive areas in images                       |
| **Metadata Sanitize**  | Strip all EXIF, GPS, and camera info from images                 |

### 🔊 Audio Tools

| Feature                 | Description                          |
| ----------------------- | ------------------------------------ |
| **Audio Steganography** | Hide messages inside WAV audio files |

### 🔍 Analysis Tools

| Feature            | Description                                                |
| ------------------ | ---------------------------------------------------------- |
| **EXIF Inspector** | Extract camera, date, GPS, software metadata from images   |
| **Image Diff**     | Compare two images to detect pixel-level changes           |
| **LSB Analysis**   | Detect hidden data using Chi-Square and entropy statistics |

### 📁 File Tools

| Feature              | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| **File Vault**       | Encrypt/Decrypt any file type using AES-GCM 256-bit          |
| **Base64 Converter** | Convert files to Base64 (and back). Supports Direct Paste!   |
| **File Splitter**    | Split large files into smaller chunks & merge them back      |
| **Magic Bytes**      | Detect actual file type by inspecting file signature headers |

### 🔑 Crypto Tools

| Feature                | Description                                              |
| ---------------------- | -------------------------------------------------------- |
| **Morse Code**         | Encode/decode text to Morse code with audio playback     |
| **Text Cipher**        | Caesar, ROT13, Atbash, and Vigenère cipher encryption    |
| **Number Converter**   | Convert between Binary, Octal, Decimal, and Hexadecimal  |
| **Secret Link**        | Create encrypted self-destructing secret links           |
| **Hash Generator**     | Generate MD5, SHA-1, SHA-256, SHA-512 hashes             |
| **Text Repeater**      | Repeat text N times with custom separator                |
| **Password Generator** | Generate secure random passwords with strength indicator |

### 🔐 Security Features

- **AES-256 Encryption**: Messages are encrypted before hiding
- **Decoy Mode**: Wrong password shows decoy message instead of error
- **Password-Protected Scramble**: Images with embedded password verification
- **Client-Side Only**: Zero server uploads, 100% browser-based

## 🚀 How to Use

### Steganography → Encode

1. Upload an image
2. Enter your secret message
3. (Optional) Set a password
4. Click **Encode Message** → Download

### Steganography → Decode

1. Upload the encoded image
2. Enter the password (if encrypted)
3. Click **Decode Message** → Read the secret

### Scramble → Scramble

1. Upload an image
2. Enter a password
3. Click **Scramble Image** → Download scrambled image

### Scramble → Unscramble

1. Upload the scrambled image
2. Enter the same password
3. Click **Unscramble Image** → Original restored

### Metadata → Exif Data

1. Upload any image
2. Click **Inspect Exif Data**
3. View: File info, Privacy scan, Camera/GPS/Date details

### Metadata → Sanitize

1. Upload an image
2. Click **Sanitize & Download**
3. Clean image with all metadata stripped

### Analysis → Image Diff

1. Upload Original image
2. Upload Suspect image
3. Adjust Amplification slider
4. Click **Compare Images** → See difference map

### Analysis → LSB Analysis

1. Upload any image
2. Click **Analyze LSB**
3. View: Verdict (Clean/Suspicious/Detected), Chi-Square, Entropy, LSB Plane

### Redact → Obfuscate

1. Upload an image
2. Choose Pixelate or Blur tool
3. Adjust strength slider
4. Draw over sensitive areas
5. Download the redacted image

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS3, JavaScript ES6+
- **Encryption**: Web Crypto API (AES-256, PBKDF2)
- **Fonts**: Plus Jakarta Sans (Google Fonts)
- **Deployment**: Vercel-ready with PWA support
- **Offline**: Service Worker for full offline capability

## 📱 Install as App (PWA)

- **Mobile**: Tap Share → Add to Home Screen
- **Desktop**: Click install icon in URL bar

## 🔒 Privacy Promise

All processing happens **in your browser**. No images, audio, passwords, or messages are ever uploaded. Your secrets stay on your device.

---

<p align="center"><em>Hide secrets in plain sight.</em></p>
