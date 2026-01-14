export class InvisibleInk {
  static ZERO_WIDTH_SPACE = "\u200B";
  static ZERO_WIDTH_NON_JOINER = "\u200C";
  static ZERO_WIDTH_JOINER = "\u200D";
  static LEFT_TO_RIGHT_MARK = "\u200E";
  static RIGHT_TO_LEFT_MARK = "\u200F";

  /**
   * @param {string} coverText - The text to hide the message in.
   * @param {string} secretMessage - The message to hide.
   * @returns {string} - The cover text with hidden message embedded.
   */
  static encode(coverText, secretMessage) {
    if (!secretMessage) return coverText;

    const binary = this.textToBinary(secretMessage);
    const hiddenString = binary
      .split("")
      .map((bit) => {
        return bit === "1" ? this.ZERO_WIDTH_SPACE : this.ZERO_WIDTH_NON_JOINER;
      })
      .join("");

    const payload =
      this.LEFT_TO_RIGHT_MARK + hiddenString + this.RIGHT_TO_LEFT_MARK;

    if (coverText.length > 0) {
      return coverText.slice(0, 1) + payload + coverText.slice(1);
    } else {
      return payload;
    }
  }

  /**
   * Decodes a hidden message from a text containing zero-width characters.
   * @param {string} textWithHidden - The text containing the hidden message.
   * @returns {string} - The decoded secret message, or null if none found.
   */
  static decode(textWithHidden) {
    const regex = /\u200E([\u200B\u200C]+)\u200F/;
    const match = textWithHidden.match(regex);

    if (!match) return null;

    const hiddenString = match[1];
    let binary = "";
    for (const char of hiddenString) {
      if (char === this.ZERO_WIDTH_SPACE) binary += "1";
      else if (char === this.ZERO_WIDTH_NON_JOINER) binary += "0";
    }

    return this.binaryToText(binary);
  }

  static textToBinary(text) {
    return text
      .split("")
      .map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
      .join("");
  }

  static binaryToText(binary) {
    const bytes = binary.match(/.{1,8}/g) || [];
    return bytes.map((byte) => String.fromCharCode(parseInt(byte, 2))).join("");
  }
}
