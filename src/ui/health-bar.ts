import { bot } from "~/bot/index.ts";

export async function displayHealthBar({
  channelId,
  entity,
  current,
  max,
  heal,
  damage,
}: {
  channelId: bigint;
  entity: { name: string };
  current: number;
  max: number;
  heal?: number;
  damage?: number;
}) {
  const healthBarImage = await getHealthBarImage({
    current,
    max,
    heal,
    damage,
    label: entity.name,
  });

  await bot.helpers.sendMessage(channelId, {
    file: {
      blob: new Blob([healthBarImage]),
      name: `${entity.name}-health-bar.png`,
    },
  });
}

export async function getHealthBarImage({
  current,
  max,
  heal = 0,
  damage = 0,
  width = 200,
  height = 24,
  label,
}: {
  current: number;
  max: number;
  heal?: number;
  damage?: number;
  width?: number;
  height?: number;
  label?: string;
}): Promise<Uint8Array> {
  const healthAfterAction = Math.max(0, Math.min(max, current + heal - damage));
  const healthToShowAsGreen = damage > 0
    ? Math.max(0, current - damage)
    : current;

  const healthWidth = Math.round((healthToShowAsGreen / max) * width);
  const healWidth = Math.round((heal / max) * width);
  const damageWidth = Math.round(
    (Math.min(current, damage) / max) * width,
  );
  const greenBox = healthWidth > 0
    ? `drawbox=x=0:y=0:w=${healthWidth}:h=${height}:color=green@1:t=fill`
    : "";
  const whiteBox = healWidth > 0
    ? `drawbox=x=${healthWidth}:y=0:w=${healWidth}:h=${height}:color=white@1:t=fill`
    : "";
  const redBox = damageWidth > 0
    ? `drawbox=x=${healthWidth}:y=0:w=${damageWidth}:h=${height}:color=#b71c1c@1:t=fill`
    : "";

  const healthBarDrawing = [
    // Base layer filters
    `drawbox=w=${width}:h=${height}:color=white:t=2`, // Border
    `drawbox=w=${width}:h=${height}:color=black:t=fill`, // Black background for bar
  ];
  if (greenBox) healthBarDrawing.push(greenBox);
  if (whiteBox) healthBarDrawing.push(whiteBox);
  if (redBox) healthBarDrawing.push(redBox);

  // Text on top
  healthBarDrawing.push(
    `drawtext=fontfile=media/MedievalSharp-Regular.ttf:text='${healthAfterAction}/${max}':x=(w-text_w)/2:y=(h-text_h)/2:fontsize=16:fontcolor=white:borderw=2:bordercolor=black`,
  );

  // Filter graph for the health bar part ONLY
  const healthBarFilter = [
    `color=s=${width}x${height}:c=black@0[hb_base]`, // Base transparent canvas for the bar
    `[hb_base]${healthBarDrawing.join(",")}[hb_drawn]`, // All drawing happens here
    `[hb_drawn][0:v]alphamerge[hb_final]`, // Apply the mask (input 0)
  ].join(";");

  let finalFilter;
  if (label) {
    const labelHeight = 20;
    // If there's a label, create it and stack it on top of the health bar
    const labelFilter = [
      `color=s=${width}x${labelHeight}:c=black[label_base]`,
      `[label_base]drawtext=fontfile=media/MedievalSharp-Regular.ttf:text='${label}':x=(w-text_w)/2:y=(h-text_h)/2:fontsize=12:fontcolor=white[label_final]`,
      `[label_final][hb_final]vstack=inputs=2`,
    ].join(";");
    finalFilter = `${healthBarFilter};${labelFilter}`;
  } else {
    // If no label, the final image is just the health bar
    finalFilter = healthBarFilter.replace("[hb_final]", "");
  }

  const ffmpegArgs = [
    "-nostdin",
    "-i",
    "media/mask.png", // Mask is input 0
    "-filter_complex",
    finalFilter,
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

  const process = command.spawn();

  const { success, stdout, stderr } = await process.output();

  if (!success) {
    const errorOutput = new TextDecoder().decode(stderr);
    console.error("FFmpeg command failed!");
    console.error("Arguments:", ffmpegArgs.join(" "));
    console.error("FFmpeg stderr:", errorOutput);
    throw new Error(`FFmpeg failed to generate health bar: ${errorOutput}`);
  }

  return stdout;
}
