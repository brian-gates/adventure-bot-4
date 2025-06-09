# Location Types Requirements

This document expands on the map generation requirements to specify rules and
logic for different location types: **Event**, **Combat**, **Elite**, and
**Tavern (Rest)**.

## General Principles

- Each location in the map has a `type` property: one of `event`, `combat`,
  `elite`, or `tavern`.
- Location types are assigned during map generation, after location placement
  but before path generation.
- The distribution of location types should create a balanced, interesting, and
  fair experience for players.
- All location type logic must respect the core map requirements (no orphans,
  unique positions, etc).

## Location Types

### Combat Locations

- **Default location type**; all locations are `combat` unless assigned a
  special type.
- Must be present in every row except the first (start) and last (boss/end).
- Can be adjacent to any other location type.
- No special placement rules beyond the general map requirements.

### Event Locations

- Represent non-combat encounters (story, choices, rewards, etc).
- Should appear in most rows, but not dominate any single row.
- **Frequency:**
  - At least 1 event location every 2–3 rows (configurable).
  - No more than 1 event location per row (unless map is very wide).
- **Placement:**
  - Cannot be in the first or last row.
  - Should not be adjacent to another event location in the previous or next row
    (avoid event clusters).
- **Special Logic:**
  - If a row has only 2 locations, avoid both being events.

### Elite Locations

- Represent tougher combat encounters with greater rewards.
- **Frequency:**
  - At least 1 elite location per map (configurable, e.g., 1–2 per map).
  - Never in the first 2 rows or last 2 rows.
- **Placement:**
  - Should not be adjacent to another elite location in the previous or next
    row.
  - Never place two elites in the same row.
  - Prefer to place elites in the middle third of the map.
- **Special Logic:**
  - If the map is long, spread elites out (not consecutive rows).

### Tavern (Rest) Locations

- Allow players to rest, heal, or shop.
- **Frequency:**
  - At least 1 tavern per map (configurable, e.g., 1–3 per map).
  - Never in the first or last row.
- **Placement:**
  - Never place two taverns in consecutive rows.
  - Never place a tavern adjacent to an elite location in the same or adjacent
    row.
  - Prefer to place taverns after an elite location (in the next row).
- **Special Logic:**
  - If a row has only 2 locations, avoid both being taverns.

## Assignment Algorithm

- After location positions are generated, assign location types in this order:
  1. Place elite locations according to constraints.
  2. Place tavern locations, respecting elite adjacency rules.
  3. Place event locations, respecting frequency and adjacency rules.
  4. Assign all remaining locations as combat.
- Validate that all constraints are satisfied after assignment.
- If constraints cannot be satisfied, retry or adjust location placement.

## Extensibility

- New location types (e.g., shop, boss, mystery) can be added with similar
  rules.
- Location type assignment should be deterministic if seeded.
- All location type logic should be testable and debuggable.
