import type { Interaction } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import {
  type CombatActionResult,
  renderCombatAction,
} from "~/game/ui/renderers/combat-renderer.ts";

// Command interface - defines what all game commands should implement
export interface GameCommand {
  execute(): Promise<CommandResult>;
}

// Result interface - standardized return type for all commands
export interface CommandResult {
  success: boolean;
  data?: unknown;
  error?: string;
  requiresUI?: boolean;
}

// Combat command - pure game logic
export class AttackCommand implements GameCommand {
  constructor(
    private readonly params: {
      attacker: string;
      target: string;
      attackRoll: number;
      damageRoll: number;
      hit: boolean;
      newHealth: number;
      maxHealth: number;
      weaponName?: string;
    },
  ) {}

  async execute(): Promise<CommandResult> {
    // Pure game logic - no UI concerns
    const combatResult: CombatActionResult = {
      attacker: this.params.attacker,
      target: this.params.target,
      hit: this.params.hit,
      damage: this.params.damageRoll,
      attackRoll: this.params.attackRoll,
      damageRoll: this.params.damageRoll,
      newHealth: this.params.newHealth,
      maxHealth: this.params.maxHealth,
      weaponName: this.params.weaponName,
    };

    return {
      success: true,
      data: combatResult,
      requiresUI: true,
    };
  }
}

// Command handler - orchestrates commands and UI rendering
export class CommandHandler {
  constructor(
    private readonly renderers: {
      combat: typeof renderCombatAction;
    },
  ) {}

  async handleCommand(
    command: GameCommand,
    uiOptions: {
      channelId: bigint;
      avatarUrl?: string;
    },
  ): Promise<void> {
    const result = await command.execute();

    if (!result.success) {
      console.error("Command failed:", result.error);
      return;
    }

    // Handle UI rendering based on command result
    if (result.requiresUI && result.data) {
      if (this.isCombatResult(result.data)) {
        await this.renderers.combat(result.data, {
          channelId: uiOptions.channelId,
          avatarUrl: uiOptions.avatarUrl,
        });
      }
    }
  }

  private isCombatResult(data: unknown): data is CombatActionResult {
    return (
      typeof data === "object" &&
      data !== null &&
      "attacker" in data &&
      "target" in data &&
      "hit" in data
    );
  }
}

// Usage example
export async function handleAttackAction({
  interaction,
  random,
}: {
  interaction: Interaction;
  random: () => number;
}) {
  // Game logic
  const attackRoll = Math.floor(random() * 20) + 1;
  const hit = attackRoll > 10;
  const damageRoll = hit ? Math.floor(random() * 4) + 1 : 0;

  // Create command
  const attackCommand = new AttackCommand({
    attacker: "Player",
    target: "Enemy",
    attackRoll,
    damageRoll,
    hit,
    newHealth: 15,
    maxHealth: 20,
  });

  // Handle command with UI rendering
  const handler = new CommandHandler({
    combat: renderCombatAction,
  });

  await handler.handleCommand(attackCommand, {
    channelId: interaction.channelId!,
    avatarUrl: "https://example.com/avatar.png",
  });
}
