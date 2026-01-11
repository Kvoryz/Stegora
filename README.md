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
- **AES-256 Encryption**: All messages are encrypted not just with LSB, but with Military-grade AES encryption.
- **Smart Capacity**: Automatically calculates exactly how many characters you can hide based on the file size.
- **Privacy Sanitization**: Automatically strips all metadata (Exif, GPS, Camera info) during the encoding process to protect your anonymity.

### 🕵️‍♂️ Hybrid Analysis (Forensics)

Stegora includes a dual-engine analysis tool to check files for potential security risks:

1.  **Steganalysis**: Detects hidden messages by analyzing pixel statistics (LSB noise patterns, Chi-Square analysis).
2.  **Metadata Scan**: Parses raw file data to extract hidden tags.
    - **GPS Location**: Extracts Latitude & Longitude if present.
    - **device Info**: Identifies Camera Make & Model.
    - **Ratings**: Classifies images as **"Safe"** (Green) if they are anonymized, or warns you if privacy-leaking tags are found.

### 🎭 Decoy Mode

Protect yourself from coercion. If someone forces you to give up your password:

- **Real Password**: Decrypts the actual secret message.
- **Wrong/No Password**: Decrypts a **Decoy Message** ("Who are you?") instead of showing an error. To the attacker, it looks like that was the only hidden message.

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla CSS3 (Plus Jakarta Sans), JavaScript (ES6+).
- **Encryption**: CryptoJS (AES-256).
- **Core Logic**: Custom Bit-Plane Slicing & TIFF/Exif Parsing.
- **Deployment**: Vercel ready (Clean URLs, Secure Headers).
- **PWA**: Fully offline-capable Progressive Web App.

## 🚀 How to Use

### 1. Encode (Hide)

1.  Upload an image or audio file.
2.  Enter your secret message.
3.  (Optional) Set a password for encryption.
4.  Click **Encode** and download the secured file.
    - _The output file is automatically sanitized of all original metadata._

### 2. Decode (Reveal)

1.  Upload the encoded file.
2.  Enter the password.
3.  Click **Decode** to reveal the secret.
    - _Note: Entering the wrong password will trigger Decoy Mode._

### 3. Analyze (Forensics)

1.  Upload any image to the **Analyze** tab.
2.  View the **Verdict** (Clean/Suspicious/Detected).
3.  Check the **Metadata Report**:
    - **Green**: Safe! (No tracking data found).
    - **Red**: Warning! (Contains Exif or GPS data).

## 📱 Installation (PWA)

Stegora works offline! You can install it on your device:

- **Mobile (iOS/Android)**: Tap "Share" -> "Add to Home Screen" (or use browser menu -> "Install App").
- **Desktop**: Click the install icon in the URL bar.

## 🔒 Privacy

Stegora runs **entirely in your browser**. No images, audio files, or passwords are ever uploaded to a server. Your secrets stay on your device.

---

_Hide secrets in plain sight._
