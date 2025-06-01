export async function heal({
  bot,
  message,
}: {
  bot: any;
  message: any;
  args?: any;
}) {
  await bot.helpers.sendMessage(message.channelId, {
    content: `<@${message.authorId.toString()}> heals themselves!`,
  });
}
