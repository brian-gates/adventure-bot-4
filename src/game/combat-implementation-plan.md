# Combat Encounter Implementation Plan

> See also: [Combat MVP: Solo Fight vs. Goblin](./combat-mvp.md)

## 1. Data Model Design

- Define Encounter, Enemy, EncounterPlayer, and related types in TypeScript.
- Update Prisma schema to add Encounter, Enemy, EncounterPlayer, and
  EncounterAction models.
- Add relations to Player, Location, and Guild as needed.

## 2. Database Migration

- Write and run Prisma migrations to create new tables for encounters and
  related entities.
- Seed initial enemy and gear data for testing.

## 3. Bot Command & UX Flow

- Update `/adventure` command to trigger encounter creation if at a combat
  location.
- Implement join flow: bot posts a message, players react or use `/join` to
  participate.
- Show real-time participant list and start encounter after a timer or minimum
  players.
- Implement turn-based flow: bot pings players for actions, narrates results,
  and advances turns.
- Handle enemy turns and auto-actions for inactive players.
- Announce results, distribute rewards, and update player and group progress.

## 4. Combat Logic

- Implement turn order, action resolution, and status effect handling.
- Scale enemy stats and rewards based on group size.
- Support drop-in/drop-out participation.

## 5. Gear and Rewards

- Implement loot distribution and gear equipping.
- Add support for gear effects in combat logic.
- Track and display individual and group rewards.

## 6. Testing & Iteration

- Write unit and integration tests for encounter logic and bot commands.
- Playtest with small groups to refine pacing, balance, and UX.
- Gather feedback and iterate on encounter flow and reward structure.

## 7. Milestones

- Data model and migration complete
- Basic encounter creation and join flow
- Turn-based combat loop functional
- Gear and reward system integrated
- Playtest and polish

## 8. Future Enhancements

- Add encounter variety (elite, boss, event types)
- Implement advanced status effects and combo moves
- Add encounter history and analytics
- Expand gear and enemy variety
