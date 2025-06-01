export async function search({
  bot,
  message,
  args,
}: {
  bot: any;
  message: any;
  args?: any;
}) {
  const query =
    args &&
    typeof args === "object" &&
    "query" in args &&
    typeof (args as any).query === "string"
      ? (args as any).query
      : undefined;
  const content = query
    ? `<@${message.authorId.toString()}> searches for "${query}" and discovers something!`
    : `<@${message.authorId.toString()}> searches, but finds nothing of interest.`;
  await bot.helpers.sendMessage(message.channelId, { content });
}
