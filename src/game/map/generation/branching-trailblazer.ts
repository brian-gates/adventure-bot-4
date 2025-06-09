import {
  type Location,
  LocationType,
  type MapGenerator,
  type Path,
} from "~/game/map/index.ts";
import type { JsonValue } from "~/generated/prisma/internal/prismaNamespace.ts";

export const branchingTrailblazerStrategy: MapGenerator = ({
  cols = 7,
  rows = 15,
  minNodes = 2,
  maxNodes = 5,
  random,
  guildId,
}) => {
  const mapId = crypto.randomUUID();
  const allRows: { col: number; row: number }[][] = Array.from(
    { length: rows },
    () => []
  );

  const edgeSet = new Set<string>();
  let stable = false;

  // Ensure first and last rows have one centered node
  allRows[0] = [{ col: Math.floor(cols / 2), row: 0 }];
  allRows[rows - 1] = [{ col: Math.floor(cols / 2), row: rows - 1 }];

  // Generate nodes for middle rows, ensuring min/max constraints
  for (let row = 1; row < rows - 1; row++) {
    const nodeCount = Math.max(
      minNodes,
      Math.min(
        maxNodes,
        Math.floor(random() * (maxNodes - minNodes + 1)) + minNodes
      )
    );
    const availableCols = Array.from({ length: cols }, (_, i) => i);
    const rowCols: number[] = [];
    while (rowCols.length < nodeCount && availableCols.length > 0) {
      const idx = Math.floor(random() * availableCols.length);
      rowCols.push(availableCols[idx]);
      availableCols.splice(idx, 1);
    }
    // Ensure minNodes are present even if random selection failed
    while (rowCols.length < minNodes) {
      const missing = Array.from({ length: cols }, (_, i) => i).filter(
        (c) => !rowCols.includes(c)
      );
      if (missing.length === 0) break;
      const col = missing[Math.floor(random() * missing.length)];
      rowCols.push(col);
    }
    // Ensure maxNodes are not exceeded
    while (rowCols.length > maxNodes) {
      rowCols.splice(Math.floor(random() * rowCols.length), 1);
    }
    allRows[row] = rowCols.map((col) => ({ col, row }));
  }

  const crosses = (aFrom: number, aTo: number, bFrom: number, bTo: number) =>
    (aFrom < bFrom && aTo > bTo) || (aFrom > bFrom && aTo < bTo);

  // --- Connectivity Enforcement (Outgoing) --- //
  // Ensure every node has at least one connection to the next row
  for (let row = 0; row < rows - 1; row++) {
    const fromNodes = allRows[row];
    const toNodes = allRows[row + 1];

    // If the next row is empty, add a node in the center column (or closest available)
    if (toNodes.length === 0) {
      const targetCol = Math.floor(cols / 2);
      allRows[row + 1].push({ col: targetCol, row: row + 1 });
      // No need to re-sort/deduplicate here as we just added one node
    }

    // After ensuring the next row has at least one node, iterate and add edges/nodes if needed
    const updatedToNodes = allRows[row + 1]; // Get the potentially updated list

    for (const from of fromNodes) {
      // Check for outgoing connections to adjacent columns in the next row
      const hasOutgoing = updatedToNodes.some(
        (to) => Math.abs(to.col - from.col) <= 1
      );

      if (!hasOutgoing) {
        // Find an adjacent column in the next row to connect to
        const adjacentToCols = updatedToNodes
          .filter((to) => Math.abs(to.col - from.col) <= 1)
          .map((to) => to.col);

        let targetCol: number | undefined;

        if (adjacentToCols.length > 0) {
          // If adjacent nodes exist, connect to the closest one among them
          targetCol = adjacentToCols.reduce((prevCol, currCol) => {
            const diffPrev = Math.abs(prevCol - from.col);
            const diffCurr = Math.abs(currCol - from.col);
            return diffCurr < diffPrev ? currCol : prevCol;
          });
        } else {
          // No adjacent nodes exist in the next row. Check if we can add a node in an adjacent column.
          const potentialCols = [from.col - 1, from.col, from.col + 1].filter(
            (c) => c >= 0 && c < cols
          ); // Check adjacent and directly below columns
          const availablePotentialCols = potentialCols.filter(
            (c) => !updatedToNodes.some((n) => n.col === c)
          ); // Filter out cols that already have nodes

          // Only attempt to add a node if the next row is not the last row and we are allowed to add nodes based on maxNodes.
          if (row + 1 <= rows - 1 && availablePotentialCols.length > 0) {
            // If there are available adjacent columns to add a node, pick one (e.g., the closest or center if available)
            // For simplicity, let's try to add to the directly below column first if available, otherwise pick an adjacent available column.
            if (availablePotentialCols.includes(from.col)) {
              targetCol = from.col;
            } else {
              targetCol = availablePotentialCols.reduce((prevCol, currCol) => {
                const diffPrev = Math.abs(prevCol - from.col);
                const diffCurr = Math.abs(currCol - from.col);
                return diffCurr < diffPrev ? currCol : prevCol;
              });
            }
            // Check if adding this node would exceed maxNodes before pushing
            if (allRows[row + 1].length < maxNodes) {
              allRows[row + 1].push({ col: targetCol, row: row + 1 });
              // Re-sort and deduplicate after adding nodes
              allRows[row + 1].sort((a, b) => a.col - b.col);
              allRows[row + 1] = Array.from(
                new Map(
                  allRows[row + 1].map((item) => [item.col, item])
                ).values()
              );
              // Mark stable as false since we added a node
              stable = false; // Assuming 'stable' is accessible
            } else {
              console.log(
                `BranchingTrailblazer: Could not add node at ${
                  row + 1
                },${targetCol} for outgoing connectivity due to maxNodes constraint.`
              );
              targetCol = undefined; // Cannot add node, so no target column to connect to
            }
          } else {
            // Cannot add a node (either it's the last row, no adjacent columns available, or maxNodes reached).
            console.log(
              `BranchingTrailblazer: Node at ${from.row},${
                from.col
              } cannot ensure outgoing connectivity to row ${
                row + 1
              } within adjacent columns.`
            );
            targetCol = undefined; // Cannot establish adjacent connection
          }
        }

        // *** Explicitly add the required edge here (if target node exists and is adjacent and doesn't create crossing) ***
        // Re-find the target node after potential addition
        // Ensure targetNode is in an adjacent column before attempting to add the edge
        const targetNode = allRows[row + 1].find(
          (to) =>
            targetCol !== undefined &&
            to.col === targetCol &&
            Math.abs(to.col - from.col) <= 1
        );

        // Only add the edge if targetNode exists, is adjacent, and doesn't create a crossing
        if (targetNode && Math.abs(from.col - targetNode.col) <= 1) {
          const edgeString = `${from.row},${from.col}->${targetNode.row},${targetNode.col}`;

          // Check if adding this edge would create a crossing with existing edges in the edgeSet *for this row pair*
          let wouldCross = false;
          // We only need to check against edges in the edgeSet that connect the same two rows
          const existingEdgesInRowPair = Array.from(edgeSet).filter((e) => {
            const [eFromStr, eToStr] = e.split("->");
            const [eFromRow] = eFromStr.split(",").map(Number);
            const [eToRow] = eToStr.split(",").map(Number);
            return eFromRow === from.row && eToRow === targetNode.row;
          });

          for (const existingEdgeString of existingEdgesInRowPair) {
            const [existingFromStr, existingToStr] =
              existingEdgeString.split("->");
            const [existingFromCol] = existingFromStr.split(",").map(Number);
            const [existingToCol] = existingToStr.split(",").map(Number);
            if (
              crosses(from.col, targetNode.col, existingFromCol, existingToCol)
            ) {
              wouldCross = true;
              console.log(
                `BranchingTrailblazer: Could not add edge ${edgeString} for outgoing connectivity due to crossing with ${existingEdgeString}.`
              );
              break; // Found a crossing, no need to check further
            }
          }

          if (!wouldCross) {
            edgeSet.add(edgeString);
            // Mark stable as false since we added an edge
            stable = false; // Assuming 'stable' is accessible in this scope or needs re-evaluation
          }
        }
      }
    }
  }

  // --- Connectivity Enforcement (Incoming) --- //
  // Ensure every node has at least one connection from the previous row
  for (let row = 1; row < rows; row++) {
    const toNodes = allRows[row];
    const fromNodes = allRows[row - 1];

    if (toNodes.length === 0) continue; // Cannot connect to empty row
    if (fromNodes.length === 0) {
      // Cannot add node to the first row (row 0)
      console.log(
        `BranchingTrailblazer: Cannot add node to row ${
          row - 1
        } for incoming connectivity as it is the first row.`
      );
      continue; // Skip incoming connectivity for this row if the previous is empty and is the first row
    }

    const updatedFromNodes = allRows[row - 1]; // Get the potentially updated list

    for (const to of toNodes) {
      const hasIncoming = updatedFromNodes.some(
        (from) => Math.abs(from.col - to.col) <= 1
      );

      if (!hasIncoming) {
        // Find an adjacent column in the previous row to connect from
        const adjacentFromCols = updatedFromNodes
          .filter((from) => Math.abs(from.col - to.col) <= 1)
          .map((from) => from.col);

        let targetCol: number | undefined;

        if (adjacentFromCols.length > 0) {
          // If adjacent nodes exist, connect from the closest one among them
          targetCol = adjacentFromCols.reduce((prevCol, currCol) => {
            const diffPrev = Math.abs(prevCol - to.col);
            const diffCurr = Math.abs(currCol - to.col);
            return diffCurr < diffPrev ? currCol : prevCol;
          });
        } else {
          // No adjacent nodes exist in the previous row. Check if we can add a node in an adjacent column.
          const potentialCols = [to.col - 1, to.col, to.col + 1].filter(
            (c) => c >= 0 && c < cols
          ); // Check adjacent and directly above columns
          const availablePotentialCols = potentialCols.filter(
            (c) => !updatedFromNodes.some((n) => n.col === c)
          ); // Filter out cols that already have nodes

          // Only attempt to add a node if the previous row is not the first row and we are allowed to add nodes based on maxNodes.
          if (row - 1 >= 0 && availablePotentialCols.length > 0) {
            // If there are available adjacent columns to add a node, pick one (e.g., the closest or center if available)
            if (availablePotentialCols.includes(to.col)) {
              targetCol = to.col;
            } else {
              targetCol = availablePotentialCols.reduce((prevCol, currCol) => {
                const diffPrev = Math.abs(prevCol - to.col);
                const diffCurr = Math.abs(currCol - to.col);
                return diffCurr < diffPrev ? currCol : prevCol;
              });
            }
            // Check if adding this node would exceed maxNodes before pushing
            if (allRows[row - 1].length < maxNodes) {
              allRows[row - 1].push({ col: targetCol, row: row - 1 });
              // Re-sort and deduplicate after adding nodes
              allRows[row - 1].sort((a, b) => a.col - b.col);
              allRows[row - 1] = Array.from(
                new Map(
                  allRows[row - 1].map((item) => [item.col, item])
                ).values()
              );
              // Mark stable as false since we added a node
              stable = false; // Assuming 'stable' is accessible
            } else {
              console.log(
                `BranchingTrailblazer: Could not add node at ${
                  row - 1
                },${targetCol} for incoming connectivity due to maxNodes constraint.`
              );
              // Cannot add node, so the node in the current row will necessarily lack an incoming edge.
            }
          } else {
            // Cannot add a node (either it's the first row, no adjacent columns available, or maxNodes reached).
            // The node in the current row will necessarily lack an incoming edge.
            console.log(
              `BranchingTrailblazer: Node at ${to.row},${
                to.col
              } cannot ensure incoming connectivity from row ${
                row - 1
              } within adjacent columns.`
            );
          }
        }
        // Note: Edge will be generated in the main edge generation loop below if an adjacent fromNode exists after potential node addition.
      }
    }
  }

  // After enforcing connectivity, ensure minNodes per row is still met (nodes might have been added)
  for (let row = 1; row < rows - 1; row++) {
    while (allRows[row].length < minNodes) {
      const missing = Array.from({ length: cols }, (_, i) => i).filter(
        (c) => !allRows[row].some((n) => n.col === c)
      );
      if (missing.length === 0) break;
      const col = missing[Math.floor(random() * missing.length)];
      allRows[row].push({ col, row });
      // Re-sort after adding
      allRows[row].sort((a, b) => a.col - b.col);
    }
    // Re-enforce maxNodes as nodes might have been added for connectivity
    while (allRows[row].length > maxNodes) {
      // Avoid removing nodes that are the only connection for a node in the previous/next row if possible
      // This check adds complexity; for now, simple random removal
      allRows[row].splice(Math.floor(random() * allRows[row].length), 1);
    }
    // Deduplicate one last time after all adjustments
    allRows[row] = Array.from(
      new Map(allRows[row].map((item) => [item.col, item])).values()
    );
  }

  // Re-generate nodeset based on the finalized allRows
  let nodeSet = new Set<string>();
  for (let row = 0; row < rows; row++) {
    // Ensure allRows[row] is an array before iterating
    if (Array.isArray(allRows[row])) {
      for (const n of allRows[row]) nodeSet.add(`${n.row},${n.col}`);
    }
  }

  // Initialize edgeSet and edgesByRow outside the stabilization loop
  let edgesByRow: {
    from: { col: number; row: number };
    to: { col: number; row: number };
  }[][] = [];

  // Initial edge generation based on connectivity enforcement, before stabilization
  for (let row = 0; row < rows - 1; row++) {
    if (!Array.isArray(allRows[row]) || !Array.isArray(allRows[row + 1])) {
      continue;
    }

    const fromNodes = allRows[row];
    const toNodes = allRows[row + 1];

    // Generate all valid edges between adjacent nodes in these rows
    const currentEdges: { from: number; to: number }[] = [];
    for (const from of fromNodes) {
      for (const to of toNodes) {
        // Only consider adjacent nodes for initial edge generation
        if (Math.abs(from.col - to.col) <= 1) {
          // Check against edges already added in this *initial* pass for this row pair
          const wouldCross = currentEdges.some((e) =>
            crosses(from.col, to.col, fromNodes[e.from].col, toNodes[e.to].col)
          );
          // Only add the edge if it's adjacent and doesn't cross existing edges in this initial pass
          if (!wouldCross) {
            currentEdges.push({
              from: fromNodes.indexOf(from),
              to: toNodes.indexOf(to),
            });
            edgeSet.add(`${from.row},${from.col}->${to.row},${to.col}`);
          }
        }
      }
    }
    edgesByRow[row] = currentEdges.map((e) => ({
      from: fromNodes[e.from],
      to: toNodes[e.to],
    }));
  }

  let iteration = 0; // Add iteration counter

  // Note: The complex stabilization loop for removing crossing edges is kept as is.
  // It might need adjustments based on the new connectivity guarantees.
  while (!stable) {
    stable = true;
    iteration++; // Increment iteration counter
    console.log(
      `BranchingTrailblazer stabilization loop iteration: ${iteration}`
    ); // Log iteration

    // Recalculate nodeSet based on current allRows (nodes shouldn't change in stabilization, but for safety)
    nodeSet = new Set<string>();
    for (let row = 0; row < rows; row++) {
      if (Array.isArray(allRows[row])) {
        for (const n of allRows[row]) nodeSet.add(`${n.row},${n.col}`);
      }
    }

    // Rebuild edgesByRow based on the persistent edgeSet
    edgesByRow = [];
    for (let row = 0; row < rows - 1; row++) {
      if (!Array.isArray(allRows[row]) || !Array.isArray(allRows[row + 1])) {
        continue;
      }

      // Edges for this row pair in this iteration
      const currentEdges: Array<{
        from: { col: number; row: number };
        to: { col: number; row: number };
      }> = [];

      // Simply rebuild edgesByRow from the current edgeSet for this row pair
      Array.from(edgeSet)
        .filter((edgeString) => {
          const [fromStr, toStr] = edgeString.split("->");
          const [fromRow] = fromStr.split(",").map(Number);
          const [toRow] = toStr.split(",").map(Number);
          return fromRow === row && toRow === row + 1;
        })
        .forEach((edgeString) => {
          const [fromStr, toStr] = edgeString.split("->");
          const [fromRow, fromCol] = fromStr.split(",").map(Number);
          const [toRow, toCol] = toStr.split(",").map(Number);
          const fromNode = allRows[fromRow].find((n) => n.col === fromCol);
          const toNode = allRows[toRow].find((n) => n.col === toCol);
          if (!fromNode || !toNode) {
            throw new Error(`Node not found for edge ${edgeString}`);
          }
          currentEdges.push({ from: fromNode, to: toNode });
        });
      edgesByRow[row] = currentEdges;
    }

    // *** Logic to remove crossing edges goes here ***
    // Identify all edges in edgeSet that cross each other and collect them for removal.
    const edgesArray = Array.from(edgeSet);
    const edgesToRemove = new Set<string>();

    for (let i = 0; i < edgesArray.length; i++) {
      const [from1Str, to1Str] = edgesArray[i].split("->");
      const [from1Row, from1Col] = from1Str.split(",").map(Number);
      const [to1Row, to1Col] = to1Str.split(",").map(Number);

      for (let j = i + 1; j < edgesArray.length; j++) {
        const [from2Str, to2Str] = edgesArray[j].split("->");
        const [from2Row, from2Col] = from2Str.split(",").map(Number);
        const [to2Row, to2Col] = to2Str.split(",").map(Number);

        // Only check crossings between edges connecting the same two rows
        if (from1Row === from2Row && to1Row === to2Row) {
          if (crosses(from1Col, to1Col, from2Col, to2Col)) {
            // Found a crossing! Add both edges to the removal set.
            edgesToRemove.add(edgesArray[i]);
            edgesToRemove.add(edgesArray[j]);
            stable = false; // Crossings were found, need another iteration
          }
        }
      }
    }

    // Remove collected edges from the edgeSet after identifying all crossings
    for (const edgeString of edgesToRemove) {
      console.log(
        `BranchingTrailblazer: Removing crossing edge ${edgeString}.`
      );
      edgeSet.delete(edgeString);
    }

    // After removing crossing edges, re-check if stable. If any edges were removed, stable will be false.
    // Also need to ensure connectivity is still met after removing edges, which might require re-adding logic for that here.
    // For now, let's just see if removing crossings helps stabilize.
  }

  // Final check to ensure the start node still has an outgoing edge after stabilization
  const startNode = allRows[0]?.[0];
  if (startNode) {
    const hasOutgoing = Array.from(edgeSet).some((edge) =>
      edge.startsWith(`${startNode.row},${startNode.col}->`)
    );
    if (!hasOutgoing) {
      const row1Nodes = allRows[1];
      if (row1Nodes && row1Nodes.length > 0) {
        const adjacentRow1Nodes = row1Nodes.filter(
          (n) => Math.abs(n.col - startNode.col) <= 1
        );
        if (adjacentRow1Nodes.length > 0) {
          const closestToNode = adjacentRow1Nodes.reduce((prev, curr) => {
            const distPrev = Math.abs(prev.col - startNode.col);
            const distCurr = Math.abs(curr.col - startNode.col);
            return distCurr < distPrev ? curr : prev;
          }, adjacentRow1Nodes[0]);
          const addedEdgeString = `${startNode.row},${startNode.col}->${closestToNode.row},${closestToNode.col}`;
          edgeSet.add(addedEdgeString);
          console.log(
            `BranchingTrailblazer: Added missing outgoing edge for start node: ${addedEdgeString}`
          );
          stable = false;
        }
      }
    }
  }

  // Build final locations and paths based on the modified allRows and edgeSet
  const locations: Location[] = allRows.flat().map(({ col, row }, i) => ({
    id: `loc-${row}-${col}-${i}`,
    row,
    col,
    type: LocationType.combat, // Default type, can be refined
    name: `Node ${row},${col}`,
    description: `Description for Node ${row},${col}`,
    attributes: {} as JsonValue,
    createdAt: new Date(),
    updatedAt: new Date(),
    mapId,
  }));

  const paths: Path[] = Array.from(edgeSet).map((edge, i) => {
    const [fromStr, toStr] = edge.split("->");
    const [fromRow, fromCol] = fromStr.split(",").map(Number);
    const [toRow, toCol] = toStr.split(",").map(Number);
    const fromLocation = locations.find(
      (loc) => loc.row === fromRow && loc.col === fromCol
    );
    const toLocation = locations.find(
      (loc) => loc.row === toRow && loc.col === toCol
    );

    if (!fromLocation || !toLocation) {
      throw new Error(`Could not find locations for edge: ${edge}`);
    }

    return {
      id: `path-${i}`,
      fromLocationId: fromLocation.id,
      toLocationId: toLocation.id,
      description: `Path from ${fromStr} to ${toStr}`,
      attributes: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      mapId,
    };
  });

  return {
    locations,
    paths,
    cols,
    rows,
    id: mapId,
    createdAt: new Date(),
    updatedAt: new Date(),
    currentLocationId: locations[0].id,
    locationId: locations[0].id,
    guildId,
  };
};
