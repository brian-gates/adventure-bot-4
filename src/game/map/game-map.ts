import { prisma } from "~/db/index.ts";
import type { Prisma, PrismaClient } from "~/generated/prisma/client.ts";
import {
  getMapById,
  type Location,
  type Map,
  type Path,
} from "~/game/map/index.ts";
import { renderMapSvg } from "./render-map-svg.ts";

export class GameMap {
  private locationsById: Record<string, Location>;
  private pathsById: Record<string, Path>;
  private pathsFromLocation: Record<string, Path[]>;
  private pathsToLocation: Record<string, Path[]>;

  constructor(private _map: Map) {
    const { locations, paths } = _map;
    this.locationsById = Object.fromEntries(locations.map((l) => [l.id, l]));
    this.pathsById = Object.fromEntries(paths.map((p) => [p.id, p]));
    this.pathsFromLocation = {};
    this.pathsToLocation = {};
    for (const path of paths) {
      (this.pathsFromLocation[path.fromLocationId] ??= []).push(path);
      (this.pathsToLocation[path.toLocationId] ??= []).push(path);
    }
  }

  static async getById(id: string) {
    const map = await getMapById(id);
    if (!map) return null;
    return new GameMap(map);
  }

  static async findAll() {
    const maps = await prisma.map.findMany({
      include: {
        locations: true,
        paths: true,
        guild: { include: { currentLocation: true } },
      },
    });
    return maps.map((m) => new GameMap(m));
  }

  static async getByGuildId(id: bigint) {
    const guild = await prisma.guild.findUnique({
      where: { id },
      include: {
        map: {
          include: {
            locations: true,
            paths: true,
            guild: { include: { currentLocation: true } },
          },
        },
      },
    });
    if (!guild?.map) return null;
    return new GameMap(guild.map);
  }

  get map() {
    return this._map;
  }

  get currentLocation() {
    return this.map.guild?.currentLocation ?? null;
  }

  get id() {
    return this.map.id;
  }

  get guild() {
    return this.map.guild;
  }

  get locations() {
    return this.map.locations;
  }
  get paths() {
    return this.map.paths;
  }
  get cols() {
    return this.map.cols;
  }
  get rows() {
    return this.map.rows;
  }

  getLocation({ id }: { id: string }) {
    return this.locationsById[id];
  }
  getPathsFrom({ id }: { id: string }) {
    return this.pathsFromLocation[id] ?? [];
  }
  getPathsTo({ id }: { id: string }) {
    return this.pathsToLocation[id] ?? [];
  }
  getNextLocations({ id }: { id: string }) {
    return (this.pathsFromLocation[id] ?? []).map((p) =>
      this.locationsById[p.toLocationId]
    );
  }
  getPrevLocations({ id }: { id: string }) {
    return (this.pathsToLocation[id] ?? []).map((p) =>
      this.locationsById[p.fromLocationId]
    );
  }
  getPath({ id }: { id: string }) {
    return this.pathsById[id];
  }
  getLocations() {
    return this.map.locations;
  }
  getPaths() {
    return this.map.paths;
  }
  serialize() {
    return {
      locations: this.map.locations,
      paths: this.map.paths,
    };
  }
  toSvg() {
    return renderMapSvg(this);
  }

  get guildId() {
    return this.map.guildId;
  }
  get createdAt() {
    return this.map.createdAt;
  }
  get updatedAt() {
    return this.map.updatedAt;
  }

  get startLocation() {
    const startCol = Math.floor(this.map.cols / 2);
    return this.map.locations.find(
      (loc) => loc.row === 0 && loc.col === startCol,
    );
  }

  async save(
    { guildId, prisma: db }: {
      guildId: bigint;
      prisma: PrismaClient | Prisma.TransactionClient;
    },
  ) {
    const { locations, paths, id, cols, rows } = this.map;
    const startLocation = this.startLocation;
    if (!startLocation) throw new Error("No start location found");

    // Create the map and all locations
    await db.map.create({
      data: {
        id,
        cols,
        rows,
      },
    });
    await db.location.createMany({
      data: locations.map((loc) => ({
        ...loc,
        mapId: id,
        attributes: {},
      })),
      skipDuplicates: true,
    });

    // Fetch all location IDs after insert
    const allLocationIds = new Set(
      (await db.location.findMany({
        where: { mapId: id },
        select: { id: true },
      })).map((l) => l.id),
    );
    // Check that all path endpoints exist
    const missing = paths.flatMap((p) =>
      [p.fromLocationId, p.toLocationId].filter((locId) =>
        !allLocationIds.has(locId)
      )
    );
    if (missing.length > 0) {
      throw new Error(
        `Missing location IDs for paths: ${[...new Set(missing)].join(", ")}`,
      );
    }

    // Create paths and upsert guild
    await db.path.createMany({
      data: paths.map((path) => ({
        ...path,
        mapId: id,
        attributes: {},
      })),
      skipDuplicates: true,
    });
    console.log(
      `[GameMap] Setting guild ${guildId} currentLocation to startLocation: id=${startLocation.id}, row=${startLocation.row}, col=${startLocation.col}`,
    );
    await db.guild.upsert({
      where: { id: guildId },
      update: {
        currentLocation: { connect: { id: startLocation.id } },
        map: { connect: { id } },
      },
      create: {
        id: guildId,
        currentLocation: { connect: { id: startLocation.id } },
        map: { connect: { id } },
      },
    });
  }

  getSiblingLocations({ id }: { id: string }) {
    const currentLocation = this.locationsById[id];
    if (!currentLocation) return [];

    // Get parent locations of the current location
    const parentLocations = this.getPrevLocations({ id });

    // Find all locations that share any of the same parents
    return this.locations.filter((location) => {
      if (location.id === id) return false; // Exclude self

      // Get this location's parents
      const locationParents = this.getPrevLocations({ id: location.id });

      // If they share any parents, they are siblings
      return parentLocations.some((parent) =>
        locationParents.some((locationParent) =>
          locationParent.id === parent.id
        )
      );
    });
  }
}
