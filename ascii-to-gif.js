// deno-lint-ignore-file
const createCanvas = require("canvas").createCanvas;
const GIFEncoder = require("gifencoder");
const fs = require("fs");

function readAllStdin(callback) {
  let data = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => data += chunk);
  process.stdin.on("end", () => callback(data));
}

function getAsciiFrames(cb) {
  readAllStdin(function (input) {
    cb(input.split("\n\n====================\n\n"));
  });
}

// Character-to-style mapping for the GIF
const glyphStyles = {
  "C": { fg: "#ff8c00", bg: "#111" }, // campfire: bright orange on dark
  "$": { fg: "#ffd700", bg: "#111" }, // treasure: yellow on dark
  "X": { fg: "#0c0", bg: null }, // combat: green
  "E": { fg: "#a0a", bg: null }, // elite: magenta
  "?": { fg: "#08f", bg: null }, // event: blue
  "B": { fg: "#ac04a4", bg: null }, // boss: purple
  "S": { fg: "#9013FE", bg: null }, // shop: violet
  ".": { fg: "#000", bg: null }, // empty: black
  "|": { fg: "#888", bg: null }, // path: gray
  "/": { fg: "#888", bg: null }, // path: gray
  "\\": { fg: "#888", bg: null }, // path: gray
  "-": { fg: "#888", bg: null }, // path: gray
  " ": { fg: "#000", bg: null }, // space: black
};

// Regex to strip ANSI escape codes
const ansiRegex = /\x1b\[[0-9;]*m/g;

getAsciiFrames(function (asciiFrames) {
  const fontSize = 16;
  const lineHeight = 18;
  const font = fontSize + "px monospace";

  // Only use map lines for width calculation, and trim trailing spaces
  function getMapLines(frame) {
    return frame.split("\n").filter(
      (l) => l.match(/^[ 0-9]+[A-Za-z .?X|$CETBS/\\-]+$/),
    );
  }
  const allMapLines = asciiFrames.flatMap(getMapLines).map((l) =>
    l.replace(ansiRegex, "")
  );
  const width = 12 *
    Math.max.apply(Math, allMapLines.map((l) => l.replace(/\s+$/, "").length));
  const height = lineHeight *
    Math.max.apply(Math, asciiFrames.map((f) => f.split("\n").length));
  const encoder = new GIFEncoder(width, height);
  encoder.createReadStream().pipe(process.stdout);
  encoder.start();
  encoder.setRepeat(0);
  encoder.setDelay(120);
  encoder.setQuality(10);

  function drawStyledLine(ctx, line, x, y, font) {
    ctx.font = font;
    let i = 0;
    let drawX = x;
    // Strip ANSI codes from the line
    line = line.replace(ansiRegex, "");
    while (i < line.length) {
      let ch = line[i];
      // Handle escaped backslash
      if (ch === "\\" && i + 1 < line.length && line[i + 1] === "\\") {
        ch = "\\";
        i++;
      }
      const style = glyphStyles[ch] || { fg: "#000", bg: null };
      const charWidth = ctx.measureText(ch).width;
      if (style.bg) {
        ctx.save();
        ctx.fillStyle = style.bg;
        ctx.fillRect(drawX, y - fontSize, charWidth, fontSize + 4);
        ctx.restore();
      }
      ctx.fillStyle = style.fg;
      ctx.fillText(ch, drawX, y);
      drawX += charWidth;
      i++;
    }
  }

  asciiFrames.forEach(function (frame) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f8ecd4"; // light papyrus
    ctx.fillRect(0, 0, width, height);
    ctx.font = font;
    ctx.fillStyle = "#000";
    frame.split("\n").forEach(function (line, y) {
      drawStyledLine(ctx, line, 0, fontSize + y * lineHeight, font);
    });
    encoder.addFrame(ctx);
  });
  encoder.finish();
});
