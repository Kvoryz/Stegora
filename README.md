# Stegora - Secure Steganography App

Stegora is a modern, privacy-focused web application that allows you to hide secret messages inside images and audio files using advanced steganography techniques. It combines LSB (Least Significant Bit) manipulation with AES-256 encryption to ensure your data remains hidden and secure.

![Stegora Icon](assets/iconste.png)

## ✨ Features

- **Image Steganography**: Hide text messages inside PNG, JPG, and WEBP images.
- **Audio Steganography**: Hide messages inside WAV audio files.
- **AES-256 Encryption**: All messages are encrypted with a user-provided password before hiding.
- **Decoy Mode**: Protect yourself from coercion. If a wrong password is entered (or no password), a fake "decoy" message ("Who are you?") is revealed instead of an error.
- **Steganalysis Tool**: Analyze images to detect if they contain hidden steganographic data.
- **Secure Sanitization**: Automatically strips EXIF metadata from images during encoding to protect privacy.
- **PWA Support**: Installable as a native-like app on Mobile (Android/iOS) and Desktop. Works offline!
- **Mobile Optimized**: Responsive design that works perfectly on smartphones and tablets.

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3 (Plus Jakarta Sans), JavaScript (ES6+).
- **Encryption**: CryptoJS (AES-256).
- **Analysis**: Custom LSB & Chi-Square analysis algorithms.
- **Deployment**: Vercel ready (Clean URLs, Secure Headers).

## 🚀 How to Use

### 1. Encode (Hide)

1.  Upload an image or audio file.
2.  Enter your secret message.
3.  (Optional) Set a password for encryption.
4.  Click **Encode** and download the secured file.

### 2. Decode (Reveal)

1.  Upload the encoded file.
2.  Enter the password (if one was used).
3.  Click **Decode** to reveal the secret.
    - _Note: Entering the wrong password will trigger Decoy Mode._

### 3. Analyze (Detect)

1.  Upload any image to the **Analyze** tab.
2.  The tool will scan for statistical anomalies (LSB noise, bit-plane complexity).
3.  It will give a verdict: **Clean**, **Suspicious**, or **Detected**.

## 📱 Installation (PWA)

**On Android/Chrome Desktop**:

- Click the **"Install App"** button at the top of the screen (Mobile only) or use the browser menu -> "Install App".

**On iOS**:

- Tap the **Share** button -> **Add to Home Screen**.

## 🔒 Privacy

Stegora runs entirely in your browser. No images, audio files, or passwords are ever sent to a server. Your secrets stay on your device.

---

_Hide secrets in plain sight._
