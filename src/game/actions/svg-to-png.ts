export const svgToPing = async (svg: string): Promise<Uint8Array> => {
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
  if (code !== 0) {
    throw new Error(`rsvg-convert failed: ${new TextDecoder().decode(stderr)}`);
  }
  return new Uint8Array(stdout);
};
