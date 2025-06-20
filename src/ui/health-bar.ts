export async function healthBar({
  current,
  max,
  heal = 0,
  damage = 0,
  width = 200,
  height = 24,
}: {
  current: number;
  max: number;
  heal?: number;
  damage?: number;
  width?: number;
  height?: number;
}): Promise<Uint8Array> {
  try {
    const healthWidth = Math.round((current / max) * width);
    const effectiveHeal = Math.max(0, Math.min(heal, max - current));
    const healWidth = Math.round((effectiveHeal / max) * width);
    const damageWidth = Math.round((damage / max) * width);
    const greenBox = healthWidth > 0
      ? `drawbox=x=0:y=0:w=${healthWidth}:h=${height}:color=green@1:t=fill,`
      : "";
    const whiteBox = healWidth > 0
      ? `drawbox=x=${healthWidth}:y=0:w=${healWidth}:h=${height}:color=white@1:t=fill,`
      : "";
    const redBox = damageWidth > 0
      ? `drawbox=x=${healthWidth}:y=0:w=${damageWidth}:h=${height}:color=#b71c1c@1:t=fill,`
      : "";
    // Input: solid black background
    const ffmpegArgs = [
      "-f", // input format
      "lavfi", // use FFmpeg's virtual input device
      "-i", // input
      `color=c=black:s=${width}x${height}`,
      // Input: semi-transparent black overlay
      "-f",
      "lavfi",
      "-i",
      `color=c=black@0.3:s=${width}x${height}`,
      // Input: mask image for rounded corners
      "-i",
      "media/mask.png",
      // Compose overlays, draw boxes, and text, then apply mask
      "-filter_complex",
      [
        `[0][1]overlay=0:0:shortest=1[base];`, // overlay semi-transparent black on base
        `[base]drawbox=x=0:y=0:w=${width}:h=${height}:color=white@1:t=2,`, // border
        greenBox, // health (green)
        whiteBox, // heal (white)
        redBox, // damage (red)
        `drawtext=fontfile=media/MedievalSharp-Regular.ttf:text='${current}/${max}':x=(w-text_w)/2:y=(h-text_h)/2:fontsize=16:fontcolor=white:borderw=2:bordercolor=black[drawn];`, // center text
        `[drawn][2]alphamerge`, // apply mask for rounded corners
      ].join(""),
      // Output: single frame as PNG
      "-frames:v",
      "1",
      "-vcodec",
      "png",
      "-f",
      "image2",
      "pipe:1",
    ];
    // Run FFmpeg command
    const command = new Deno.Command("ffmpeg", {
      args: ffmpegArgs,
      stdout: "piped",
      stderr: "piped",
    });
    const { code, stdout, stderr } = await command.output();
    if (code !== 0) {
      throw new Error("FFmpeg error: " + new TextDecoder().decode(stderr));
    }
    return stdout;
  } catch (error) {
    // Fallback: return a simple text representation as a PNG
    console.warn(
      "FFmpeg not available, using text fallback for health bar:",
      (error as Error).message,
    );

    // Create a simple SVG that can be converted to PNG
    const healthPercentage = Math.round((current / max) * 100);
    const healPercentage = Math.round((heal / max) * 100);
    const damagePercentage = Math.round((damage / max) * 100);

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="#2c2c2c" stroke="white" stroke-width="2"/>
        <rect x="2" y="2" width="${
      Math.max(0, (current / max) * (width - 4))
    }" height="${height - 4}" fill="green"/>
        ${
      heal > 0
        ? `<rect x="${2 + (current / max) * (width - 4)}" y="2" width="${
          Math.max(0, (heal / max) * (width - 4))
        }" height="${height - 4}" fill="white"/>`
        : ""
    }
        ${
      damage > 0
        ? `<rect x="${2 + (current / max) * (width - 4)}" y="2" width="${
          Math.max(0, (damage / max) * (width - 4))
        }" height="${height - 4}" fill="#b71c1c"/>`
        : ""
    }
        <text x="${width / 2}" y="${
      height / 2 + 5
    }" text-anchor="middle" fill="white" font-family="Arial" font-size="12">${current}/${max}</text>
      </svg>
    `;

    // Try to use rsvg-convert if available, otherwise return empty
    try {
      const p = new Deno.Command("rsvg-convert", {
        args: ["-f", "png"],
        stdin: "piped",
        stdout: "piped",
        stderr: "piped",
      });
      const child = p.spawn();
      const writer = child.stdin.getWriter();
      await writer.write(new TextEncoder().encode(svg));
      await writer.close();
      const { code, stdout, stderr } = await child.output();
      if (code === 0) {
        return new Uint8Array(stdout);
      }
    } catch (rsvgError) {
      console.warn(
        "rsvg-convert also not available:",
        (rsvgError as Error).message,
      );
    }

    // Final fallback: return empty array (no image)
    return new Uint8Array(0);
  }
}

export async function displayHealthBar({
  channelId,
  playerId,
  currentHealth,
  maxHealth,
  healAmount = 0,
  damageAmount = 0,
  playerName,
}: {
  channelId: bigint;
  playerId: bigint;
  currentHealth: number;
  maxHealth: number;
  healAmount?: number;
  damageAmount?: number;
  playerName: string;
}) {
  const { bot } = await import("~/bot/index.ts");

  const healthBarImage = await healthBar({
    current: currentHealth,
    max: maxHealth,
    heal: healAmount,
    damage: damageAmount,
    width: 200,
    height: 24,
  });

  if (healthBarImage.length > 0) {
    await bot.helpers.sendMessage(channelId, {
      content: `<@${playerId}>'s health bar:`,
      file: {
        blob: new Blob([healthBarImage]),
        name: "healthbar.png",
      },
    });
  } else {
    // Fallback: send text-based health bar
    const healthPercentage = Math.round((currentHealth / maxHealth) * 100);
    const healthBarText = `[${"█".repeat(Math.floor(healthPercentage / 10))}${
      "░".repeat(10 - Math.floor(healthPercentage / 10))
    }] ${currentHealth}/${maxHealth} (${healthPercentage}%)`;
    await bot.helpers.sendMessage(channelId, {
      content: `<@${playerId}>'s health: ${healthBarText}`,
    });
  }
}
