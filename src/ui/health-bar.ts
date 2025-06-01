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
  const healthWidth = Math.round((current / max) * width);
  const healWidth = Math.round((heal / max) * width);
  const damageWidth = Math.round((damage / max) * width);
  const greenBox =
    healthWidth > 0
      ? `drawbox=x=0:y=0:w=${healthWidth}:h=${height}:color=green@1:t=fill,`
      : "";
  const whiteBox =
    healWidth > 0
      ? `drawbox=x=${
          healthWidth - healWidth
        }:y=0:w=${healWidth}:h=${height}:color=white@1:t=fill,`
      : "";
  const redBox =
    damageWidth > 0
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
  if (code !== 0)
    throw new Error("FFmpeg error: " + new TextDecoder().decode(stderr));
  return stdout;
}
