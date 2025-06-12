# Map Generation Requirements

## General Principles

- The map is a directed acyclic graph (DAG) of nodes (locations) and edges
  (paths).
- The map is rendered as a grid with a fixed number of columns (`cols`) and rows
  (`rows`).
- Each node is placed at a unique `(col, row)` coordinate.
- The map is generated per-guild/channel and stored in the database.

## Node Placement

- The first row (start) and last row (boss/end) always have a single, centered
  node.
- All other rows have a variable number of nodes, constrained by:
  - **Minimum nodes per row:** e.g., 2 or 3.
  - **Maximum nodes per row:** e.g., 4 or 5.
- Nodes in a row must be placed in unique columns (no duplicates).
- The number of nodes per row should be fairly consistent from start to finish
  (no rapid fall-off).

## Path (Edge) Generation

- Each node in row N can only connect to nodes in row N+1 that are in the same
  column, or one column left/right (no skipping lanes, no "big jumps").
- Paths can split (one node connects to multiple nodes in the next row) and
  merge (multiple nodes connect to the same node in the next row).
- No "X" crossings: diagonal paths cannot cross each other.
- Every node (except the start) must have at least one incoming edge.
- Every node (except the end) must have at least one outgoing edge.
- No orphans: every node is part of at least one path from start to finish.

## Additional Constraints

- The algorithm must be deterministic if seeded (for reproducibility).
- All logic should be easily testable and debuggable, with optional ASCII output
  for terminal inspection.
