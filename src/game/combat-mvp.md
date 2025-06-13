# Combat MVP: Solo Fight vs. Goblin

This MVP enables a player to solo fight a goblin, providing the foundation for
the combat system.

## Features

- Player can encounter and fight a goblin at a combat location.
- Turn-based combat: player and goblin alternate attacks.
- Simple actions: attack only, fixed damage values.
- Bot narrates each action and updates HP.
- Combat ends with victory or defeat and a simple reward message.

## Data Model

```ts
// Player
{
  id: string;
  name: string;
  health: number;
  maxHealth: number;
}

// Enemy (Goblin)
{
  id: string;
  name: string;
  health: number;
  maxHealth: number;
}

// Encounter
{
  playerId: string;
  enemy: Enemy;
  playerHealth: number;
  enemyHealth: number;
  turn: "player" | "enemy";
  status: "active" | "victory" | "defeat";
}
```

## Command Flow

1. **/adventure** — Starts a solo encounter with a goblin if at a combat
   location.
2. **Bot:** Announces the goblin and prompts the player to attack.
3. **/attack** — Player attacks the goblin, bot narrates and updates HP.
4. **Bot:** Goblin attacks back, bot narrates and updates HP.
5. Repeat steps 3–4 until either the player or goblin is defeated.
6. **Bot:** Announces victory or defeat and gives a reward or message.

## Implementation Steps

- Add in-memory or persistent state to track solo encounters.
- Implement /adventure to start a solo goblin fight.
- Implement /attack to resolve player and goblin turns.
- Add end condition and simple reward message.

---

This MVP is the foundation for the full combat system. Expand with abilities,
multiple enemies, and group play in future iterations.
