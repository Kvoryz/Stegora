export default class AudioSteganography {
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

  static async encode(audioBuffer, message) {
    const fullMessage = message + this.DELIMITER;
    const binaryMessage = this.textToBinary(fullMessage);
    const messageLength = binaryMessage.length;

    const binaryLength = messageLength
      .toString(2)
      .padStart(this.HEADER_BITS, "0");
    const fullBinary = binaryLength + binaryMessage;

    const view = new DataView(audioBuffer);
    const dataStart = 44;
    const bytesPerSample = view.getUint16(34, true) / 8;
    const numSamples = (audioBuffer.byteLength - dataStart) / bytesPerSample;

    if (fullBinary.length > numSamples) {
      throw new Error(
        `Audio too short. Need ${fullBinary.length} samples, but only ${numSamples} available.`
      );
    }

    const result = new Uint8Array(audioBuffer.slice(0));

    for (let i = 0; i < fullBinary.length; i++) {
      const sampleIndex = dataStart + i * bytesPerSample;
      const bit = parseInt(fullBinary[i], 10);
      result[sampleIndex] = (result[sampleIndex] & 0xfe) | bit;
    }

    return result.buffer;
  }

  static async decode(audioBuffer) {
    const view = new DataView(audioBuffer);
    const dataStart = 44;
    const bytesPerSample = view.getUint16(34, true) / 8;
    const data = new Uint8Array(audioBuffer);

    let binaryLength = "";
    let bitIndex = 0;

    while (bitIndex < this.HEADER_BITS) {
      const sampleIndex = dataStart + bitIndex * bytesPerSample;
      binaryLength += (data[sampleIndex] & 1).toString();
      bitIndex++;
    }

    const messageLength = parseInt(binaryLength, 2);

    if (messageLength <= 0 || messageLength > 10000000) {
      throw new Error("No hidden message found in this audio.");
    }

    let binaryMessage = "";
    const totalBitsNeeded = this.HEADER_BITS + messageLength;

    while (bitIndex < totalBitsNeeded) {
      const sampleIndex = dataStart + bitIndex * bytesPerSample;
      if (sampleIndex >= data.length) break;
      binaryMessage += (data[sampleIndex] & 1).toString();
      bitIndex++;
    }

    const message = this.binaryToText(binaryMessage);
    const delimiterIndex = message.indexOf(this.DELIMITER);

    if (delimiterIndex === -1) {
      throw new Error("No hidden message found in this audio.");
    }

    return message.substring(0, delimiterIndex);
  }
}
