// Looks inside a theme file in the browser, before anything is uploaded:
// what kind it is, whether it is safe to share, and (for CrateDigger) its
// name and colors.
import { unzipSync, strFromU8 } from "fflate";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ENTRIES = 3000;
const MAX_UNPACKED_BYTES = 60 * 1024 * 1024;

// Things that run code, on a computer or on the iPod (.rock and .codec are
// Rockbox plugins and codecs; .ipod and .mi4 are firmware images).
const BLOCKED = /\.(exe|dll|bat|cmd|com|scr|msi|sh|command|app|dmg|pkg|jar|js|vbs|ps1|py|php|so|dylib|elf|bin|rock|codec|ipod|mi4)$/i;
const JUNK = /(^|\/)(__MACOSX\/|\.DS_Store$|Thumbs\.db$|\._)/;
const CRATEDIGGER_OK = /\.(json|ttf|otf|png|jpe?g|pdf|svg|txt|md)$/i;

// CrateDigger's built-in Carbon theme: what a token falls back to when a
// theme doesn't set it.
const CARBON = {
  dark: { chassis: "#171C22", paper: "#111820", ink: "#F3F7F7", orange: "#FF6D3F", cyan: "#45C7BD", sun: "#F4CA54", oledSurface: "#050504", oledForeground: "#F5F1E6", backgroundBase: "#080A0E" },
  light: { chassis: "#F5F8FA", paper: "#FAFCFD", ink: "#12171C", orange: "#FF6236", cyan: "#3AA8B8", sun: "#F4C84A", oledSurface: "#0A0A0A", oledForeground: "#F5F1E6", backgroundBase: "#DCE9EC" },
};
const HEX = /^#?[0-9a-f]{6}([0-9a-f]{2})?$/i;

/** The handful of colors that give a CrateDigger theme its look. */
export function swatchFrom(definition) {
  const mode = definition.baseAppearance === "light" ? "light" : "dark";
  const layers = [definition[mode]?.colors, definition.colors, CARBON[mode]];
  const swatch = {};
  for (const token of Object.keys(CARBON.dark)) {
    const value = layers.map((layer) => layer?.[token]).find((v) => typeof v === "string" && HEX.test(v));
    swatch[token] = "#" + value.replace("#", "").slice(0, 6).toUpperCase();
  }
  return swatch;
}

function readDefinition(text) {
  let definition;
  try {
    definition = JSON.parse(text);
  } catch {
    throw new Error("theme.json isn't valid JSON.");
  }
  for (const field of ["id", "name", "baseAppearance"]) {
    if (typeof definition?.[field] !== "string" || !definition[field]) throw new Error(`theme.json is missing "${field}".`);
  }
  return definition;
}

function listZip(bytes) {
  const names = [];
  let unpacked = 0;
  let wanted = null;
  const files = unzipSync(bytes, {
    filter(entry) {
      names.push(entry.name);
      unpacked += entry.originalSize || 0;
      if (names.length > MAX_ENTRIES || unpacked > MAX_UNPACKED_BYTES) throw new Error("This archive is too large to be a theme.");
      const isManifest = /(^|\/)theme\.json$/.test(entry.name) && !JUNK.test(entry.name);
      if (isManifest && !wanted) wanted = entry.name;
      return isManifest && entry.name === wanted; // only unpack the manifest
    },
  });
  return { names: names.filter((n) => !JUNK.test(n) && !n.endsWith("/")), manifest: wanted ? strFromU8(files[wanted]) : null };
}

/**
 * Inspects a chosen file for the given target ("cratedigger" or a firmware id).
 * Returns { ok, problems, name, author, version, swatch, fileCount }.
 */
export async function inspectThemeFile(file, target) {
  const result = { ok: false, problems: [], name: "", author: "", version: "", swatch: null, fileCount: 0 };
  const fail = (message) => (result.problems.push(message), result);
  if (file.size > MAX_FILE_BYTES) return fail("The file is larger than 5 MB.");
  const isZip = /\.zip$/i.test(file.name);
  const isJson = /\.json$/i.test(file.name);
  const forCrateDigger = target === "cratedigger";
  if (!isZip && !(forCrateDigger && isJson)) return fail(forCrateDigger ? "Choose a zipped .cdtheme folder or a theme .json file." : "Choose the theme as a .zip file.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    if (isJson) {
      const definition = readDefinition(strFromU8(bytes));
      Object.assign(result, { name: definition.name, author: definition.author || "", version: definition.version || "", swatch: swatchFrom(definition), fileCount: 1 });
    } else {
      const { names, manifest } = listZip(bytes);
      result.fileCount = names.length;
      if (!names.length) return fail("The archive is empty.");
      const blocked = names.filter((n) => BLOCKED.test(n));
      if (blocked.length) return fail(`Themes can't include programs or firmware. Remove: ${blocked.slice(0, 5).join(", ")}${blocked.length > 5 ? "…" : ""}`);

      if (forCrateDigger) {
        if (!manifest) return fail("No theme.json found. Zip the whole .cdtheme folder.");
        const definition = readDefinition(manifest);
        const odd = names.filter((n) => !CRATEDIGGER_OK.test(n));
        if (odd.length) return fail(`A CrateDigger theme only holds theme.json, fonts, a logo and license text. Remove: ${odd.slice(0, 5).join(", ")}`);
        const fonts = names.filter((n) => /\.(ttf|otf)$/i.test(n));
        const hasLicense = names.some((n) => /licen[sc]e|ofl|copying|readme/i.test(n.split("/").pop()));
        if (fonts.length && !hasLicense) return fail("This theme bundles fonts. Add each font's license file next to it so others are allowed to use it.");
        Object.assign(result, { name: definition.name, author: definition.author || "", version: definition.version || "", swatch: swatchFrom(definition) });
      } else if (!names.some((n) => /\.(wps|sbs|fms|cfg)$/i.test(n))) {
        return fail("This doesn't look like a Rockbox theme: no .wps, .sbs or .cfg file inside.");
      }
    }
  } catch (err) {
    return fail(err.message || "The file couldn't be read.");
  }
  result.ok = true;
  return result;
}

/**
 * Gets a screenshot ready to upload: small iPod captures stay as sharp PNGs,
 * anything larger becomes a JPEG at most 1600 pixels wide.
 */
export async function prepareScreenshot(file) {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error(`${file.name} isn't a PNG, JPEG or WebP image.`);
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  if (width <= 640 && file.type === "image/png" && file.size <= 400 * 1024) {
    bitmap.close();
    return { blob: file, contentType: "image/png", ext: "png", w: width, h: height };
  }
  const scale = Math.min(1, 1600 / width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error(`${file.name} couldn't be read as an image.`);
  return { blob, contentType: "image/jpeg", ext: "jpg", w: canvas.width, h: canvas.height };
}
