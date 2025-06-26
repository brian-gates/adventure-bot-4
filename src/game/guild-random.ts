import { prisma } from "~/db/index.ts";
import { seededRandom } from "~/game/seeded-random.ts";

/**
 * Returns a debounced, atomic-incrementing random function for a guild.
 * Usage:
 *   const random = makeGuildRandom({ guildId, seed, cursor });
 *   // use random() as usual; persistence is automatic.
 */
export function guildRandom(
  { guildId, seed, cursor }: {
    guildId: bigint;
    seed: string | number;
    cursor: number;
  },
) {
  let currentCursor = cursor;
  let calls = 0;
  const randomFn = seededRandom(seed, currentCursor);
  let debounceTimer: number | undefined;

  async function flush() {
    if (calls > 0) {
      await prisma.guild.update({
        where: { id: guildId },
        data: { randomCursor: { increment: calls } },
      });
      currentCursor += calls;
      calls = 0;
    }
  }

  function debouncedFlush() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flush, 25);
  }

  const random = () => {
    const value = randomFn();
    calls++;
    debouncedFlush();
    return value;
  };

  return random;
}
