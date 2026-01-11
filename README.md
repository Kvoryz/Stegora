# Stegora - Secure Steganography & Forensics

Stegora is a modern, privacy-focused web application that allows you to hide secret messages inside images and audio files using advanced steganography techniques. It combines LSB (Least Significant Bit) manipulation with AES-256 encryption to ensure your data remains hidden and secure.

Beyond hiding secrets, Stegora is also a powerful **Forensics Tool**, capable of analyzing images for hidden data and privacy leaks (Metadata/GPS).

<p align="center">
  <img src="assets/iconste.png" alt="Stegora Icon" width="200">
</p>

## ✨ Features

### 🛡️ Secure Encoding

- **Image Steganography**: Hide text messages inside PNG, JPG, and WEBP images.
- **Audio Steganography**: Hide messages inside WAV audio files.
- **AES-256 Encryption**: All messages are encrypted with military-grade AES encryption.
- **Smart Capacity**: Automatically calculates how many characters you can hide based on file size.
- **Privacy Sanitization**: Automatically strips all metadata (Exif, GPS, Camera info) during encoding.

### 🔧 Submit Workflow

When you click **Submit**, you get two options:

1. **Sanitize Only**: Removes all metadata and saves as `sanitize_filename.png` — no message hidden.
2. **Encode Message**: Hides your secret message AND strips metadata, saving as `stegora_filename.png`.
3. **Scramble Image**: Visually encrypts the image using XOR with your password. The image becomes unrecognizable noise. To restore, scramble again with the same password. Output: `scramble_filename.png`.

### 🕵️‍♂️ Hybrid Analysis (Forensics)

Stegora includes a dual-engine analysis tool:

1. **Steganalysis**: Detects hidden messages by analyzing pixel statistics (LSB noise patterns, Chi-Square analysis).
2. **Metadata Scan**: Parses raw file data to extract hidden tags.
   - **GPS Location**: Extracts Latitude & Longitude if present.
   - **Device Info**: Identifies Camera Make & Model.
   - **Ratings**: Classifies images as **"Safe"** (Green) if anonymized, or warns you if privacy-leaking tags are found.

### 🎭 Decoy Mode

Protect yourself from coercion:

- **Real Password**: Decrypts the actual secret message.
- **Wrong/No Password**: Shows a **Decoy Message** ("Who are you?") instead of an error.

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla CSS3 (Plus Jakarta Sans), JavaScript (ES6+).
- **Encryption**: CryptoJS (AES-256).
- **Core Logic**: Custom Bit-Plane Slicing & TIFF/Exif Parsing.
- **Deployment**: Vercel ready (Clean URLs, Secure Headers).
- **PWA**: Fully offline-capable Progressive Web App.

## 🚀 How to Use

### 1. Encode (Hide)

1. Upload an image or audio file.
2. Enter your secret message.
3. (Optional) Set a password for encryption.
4. Click **Submit** → Choose **Encode Message**.
5. Download the secured file (prefixed with `stegora_`).

### 2. Sanitize (Clean Metadata Only)

1. Upload an image.
2. Click **Submit** → Choose **Sanitize Only**.
3. Download the clean file (prefixed with `sanitize_`).

### 3. Scramble (Visual Encryption)

1. Upload an image.
2. Enter a password (required).
3. Click **Submit** → Choose **Scramble Image**.
4. Download the scrambled file (prefixed with `scramble_`).
5. To **restore**: Upload the scrambled image, enter the same password, and Scramble again.

### 3. Decode (Reveal)

1. Upload the encoded file.
2. Enter the password.
3. Click **Decode** to reveal the secret.
   - _Note: Wrong password triggers Decoy Mode._

### 4. Analyze (Forensics)

1. Upload any image to the **Analyze** tab.
2. View the **Verdict** (Clean/Suspicious/Detected).
3. Check the **Metadata Report**:
   - **Green**: Safe! (No tracking data found).
   - **Red**: Warning! (Contains Exif or GPS data).

## 📱 Installation (PWA)

Stegora works offline! Install it on your device:

- **Mobile (iOS/Android)**: Tap "Share" → "Add to Home Screen".
- **Desktop**: Click the install icon in the URL bar.

## 🔒 Privacy

Stegora runs **entirely in your browser**. No images, audio files, or passwords are ever uploaded to a server. Your secrets stay on your device.

---

_Hide secrets in plain sight._
