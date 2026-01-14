
export class MorseCode {
  static MORSE_MAP = {
    A: ".-",
    B: "-...",
    C: "-.-.",
    D: "-..",
    E: ".",
    F: "..-.",
    G: "--.",
    H: "....",
    I: "..",
    J: ".---",
    K: "-.-",
    L: ".-..",
    M: "--",
    N: "-.",
    O: "---",
    P: ".--.",
    Q: "--.-",
    R: ".-.",
    S: "...",
    T: "-",
    U: "..-",
    V: "...-",
    W: ".--",
    X: "-..-",
    Y: "-.--",
    Z: "--..",
    0: "-----",
    1: ".----",
    2: "..---",
    3: "...--",
    4: "....-",
    5: ".....",
    6: "-....",
    7: "--...",
    8: "---..",
    9: "----.",
    ".": ".-.-.-",
    ",": "--..--",
    "?": "..--..",
    "'": ".----.",
    "!": "-.-.--",
    "/": "-..-.",
    "(": "-.--.",
    ")": "-.--.-",
    "&": ".-...",
    ":": "---...",
    ";": "-.-.-.",
    "=": "-...-",
    "+": ".-.-.",
    "-": "-....-",
    _: "..--.-",
    '"': ".-..-.",
    $: "...-..-",
    "@": ".--.-.",
    " ": "/",
  };

  static REVERSE_MAP = Object.fromEntries(
    Object.entries(this.MORSE_MAP).map(([k, v]) => [v, k])
  );

  static encode(text) {
    return text
      .toUpperCase()
      .split("")
      .map((char) => this.MORSE_MAP[char] || char)
      .join(" ");
  }

  static decode(morse) {
    return morse
      .split(" ")
      .map((code) => (code === "/" ? " " : this.REVERSE_MAP[code] || code))
      .join("");
  }

  static playAudio(morse, wpm = 20) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const dotDuration = 1.2 / wpm;
    let time = audioCtx.currentTime;

    for (const char of morse) {
      if (char === ".") {
        this.playTone(audioCtx, time, dotDuration);
        time += dotDuration * 2;
      } else if (char === "-") {
        this.playTone(audioCtx, time, dotDuration * 3);
        time += dotDuration * 4;
      } else if (char === " ") {
        time += dotDuration * 3;
      } else if (char === "/") {
        time += dotDuration * 7;
      }
    }
    return time - audioCtx.currentTime;
  }

  static playTone(audioCtx, startTime, duration) {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = 600;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.5, startTime);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }
}
