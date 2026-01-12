export default class MetadataScanner {
  static async scan(file) {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    const findings = [];
    const details = {};

    if (view.getUint16(0) === 0xffd8) {
      let offset = 2;
      while (offset < view.byteLength) {
        if (view.getUint8(offset) !== 0xff) break;
        const marker = view.getUint8(offset + 1);
        const length = view.getUint16(offset + 2);

        if (marker === 0xe1) {
          findings.push("Exif Metadata (APP1)");
          const exifData = this.parseExif(view, offset + 4);
          if (exifData) Object.assign(details, exifData);
        }
        if (marker === 0xe0) findings.push("JFIF Header (APP0)");
        if (marker === 0xfe) findings.push("JPEG Comment");
        if (marker === 0xed) findings.push("Photoshop Metadata");

        offset += 2 + length;
      }
    }

    if (view.getUint32(0) === 0x89504e47) {
      let offset = 8;
      while (offset < view.byteLength) {
        const length = view.getUint32(offset);
        const type = String.fromCharCode(
          view.getUint8(offset + 4),
          view.getUint8(offset + 5),
          view.getUint8(offset + 6),
          view.getUint8(offset + 7)
        );

        if (["tEXt", "zTXt", "iTXt"].includes(type))
          findings.push(`Text Data (${type})`);
        if (type === "pHYs") findings.push("Physical Dimensions (pHYs)");
        if (type === "tIME") findings.push("Modification Time (tIME)");
        if (type === "eXIf") findings.push("Raw Exif (eXIf)");

        offset += 12 + length;
      }
    }

    return {
      findings: findings.length > 0 ? findings : ["No hidden metadata found"],
      details,
    };
  }

  static parseExif(view, start) {
    const tiffStart = start + 6;
    if (
      String.fromCharCode(
        view.getUint8(start),
        view.getUint8(start + 1),
        view.getUint8(start + 2),
        view.getUint8(start + 3)
      ) !== "Exif"
    )
      return null;

    const littleEndian = view.getUint16(tiffStart) === 0x4949;
    const firstIFDOffset = view.getUint32(tiffStart + 4, littleEndian);
    if (firstIFDOffset < 8) return null;

    const tags = {};
    const ifdOffset = tiffStart + firstIFDOffset;
    const entries = view.getUint16(ifdOffset, littleEndian);

    const getBytesPerComponent = (type) => {
      if (type === 1 || type === 2 || type === 7) return 1;
      if (type === 3) return 2;
      if (type === 4 || type === 9 || type === 11) return 4;
      if (type === 5 || type === 10 || type === 12) return 8;
      return 0;
    };

    for (let i = 0; i < entries; i++) {
      try {
        const entryOffset = ifdOffset + 2 + i * 12;
        const tag = view.getUint16(entryOffset, littleEndian);
        const type = view.getUint16(entryOffset + 2, littleEndian);
        const count = view.getUint32(entryOffset + 4, littleEndian);
        const valueOffset = view.getUint32(entryOffset + 8, littleEndian);

        const typeSize = getBytesPerComponent(type);
        const dataSize = count * typeSize;

        const dataOffset =
          dataSize > 4 ? tiffStart + valueOffset : entryOffset + 8;

        if (tag === 0x0110)
          tags.model = this.readString(view, dataOffset, count);
        if (tag === 0x010f)
          tags.make = this.readString(view, dataOffset, count);
        if (tag === 0x0132 || tag === 0x9003)
          tags.date = this.readString(view, dataOffset, count);
        if (tag === 0x0131)
          tags.software = this.readString(view, dataOffset, count);
        if (tag === 0x013b)
          tags.artist = this.readString(view, dataOffset, count);
        if (tag === 0x8298)
          tags.copyright = this.readString(view, dataOffset, count);
        if (tag === 0x010e)
          tags.desc = this.readString(view, dataOffset, count);

        if (tag === 0x8825) {
          const gpsIfdOffset = tiffStart + valueOffset;
          if (gpsIfdOffset < view.byteLength) {
            Object.assign(
              tags,
              this.parseGPS(view, gpsIfdOffset, littleEndian, tiffStart)
            );
          }
        }

        if (tag === 0x8769) {
          const exifIfdOffset = tiffStart + valueOffset;
          const exifEntries = view.getUint16(exifIfdOffset, littleEndian);
          for (let j = 0; j < exifEntries; j++) {
            const exifEntryOffset = exifIfdOffset + 2 + j * 12;
            const exifTag = view.getUint16(exifEntryOffset, littleEndian);
            const exifValOffset = view.getUint32(
              exifEntryOffset + 8,
              littleEndian
            );

            if (exifTag === 0x8825) {
              const gpsIfdOffset = tiffStart + exifValOffset;
              Object.assign(
                tags,
                this.parseGPS(view, gpsIfdOffset, littleEndian, tiffStart)
              );
            }
          }
        }
      } catch (e) {}
    }
    return tags;
  }

  static parseGPS(view, offset, littleEndian, tiffStart) {
    let entries = view.getUint16(offset, littleEndian);

    if (entries === 0 || entries > 50) {
      const altEntries = view.getUint16(offset, !littleEndian);
      if (altEntries > 0 && altEntries < 50) {
        entries = altEntries;
        littleEndian = !littleEndian;
      }
    }

    if (entries === 0 || entries > 50) return {};

    let lat = [],
      lon = [],
      latRef = "",
      lonRef = "";

    for (let i = 0; i < entries; i++) {
      try {
        const entryOffset = offset + 2 + i * 12;
        if (entryOffset + 12 > view.byteLength) break;

        const tag = view.getUint16(entryOffset, littleEndian);
        const type = view.getUint16(entryOffset + 2, littleEndian);
        const count = view.getUint32(entryOffset + 4, littleEndian);
        const valueOffset = view.getUint32(entryOffset + 8, littleEndian);

        const typeSize = type === 5 || type === 10 ? 8 : 1;
        const totalSize = count * typeSize;
        const dataOffset =
          totalSize > 4 ? tiffStart + valueOffset : entryOffset + 8;

        if (dataOffset < 0 || dataOffset + totalSize > view.byteLength)
          continue;

        if (tag === 1 && type === 2)
          latRef = this.readString(view, dataOffset, count);
        if (tag === 2 && type === 5 && count === 3) {
          lat = [
            this.readRational(view, dataOffset, littleEndian),
            this.readRational(view, dataOffset + 8, littleEndian),
            this.readRational(view, dataOffset + 16, littleEndian),
          ];
        }
        if (tag === 3 && type === 2)
          lonRef = this.readString(view, dataOffset, count);
        if (tag === 4 && type === 5 && count === 3) {
          lon = [
            this.readRational(view, dataOffset, littleEndian),
            this.readRational(view, dataOffset + 8, littleEndian),
            this.readRational(view, dataOffset + 16, littleEndian),
          ];
        }
      } catch (e) {
        continue;
      }
    }

    if (lat.length === 3 && lon.length === 3) {
      if (
        lat.every((v) => !isNaN(v) && isFinite(v)) &&
        lon.every((v) => !isNaN(v) && isFinite(v))
      ) {
        const latMult = latRef && latRef.toUpperCase().startsWith("S") ? -1 : 1;
        const lonMult = lonRef && lonRef.toUpperCase().startsWith("W") ? -1 : 1;

        const latDec = (lat[0] + lat[1] / 60 + lat[2] / 3600) * latMult;
        const lonDec = (lon[0] + lon[1] / 60 + lon[2] / 3600) * lonMult;

        if (
          (latDec !== 0 || lonDec !== 0) &&
          Math.abs(latDec) <= 90 &&
          Math.abs(lonDec) <= 180
        ) {
          return { gps: `${latDec.toFixed(6)}, ${lonDec.toFixed(6)}` };
        }
      }
    }
    return {};
  }

  static readRational(view, offset, littleEndian) {
    try {
      if (offset + 8 > view.byteLength) return 0;
      const num = view.getUint32(offset, littleEndian);
      const den = view.getUint32(offset + 4, littleEndian);
      if (den === 0) return 0;
      return num / den;
    } catch (e) {
      return 0;
    }
  }

  static readString(view, offset, length) {
    let str = "";
    for (let i = 0; i < length; i++) {
      const char = view.getUint8(offset + i);
      if (char === 0) break;
      str += String.fromCharCode(char);
    }
    return str.trim();
  }
}
