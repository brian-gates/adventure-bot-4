import { prisma } from "~/db/index.ts";
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

  async save({ guildId }: { guildId: bigint }) {
    const { locations, paths, id, cols, rows } = this;
    const startLocation = this.map.locations
      .filter((loc) => loc.type === "combat")
      .reduce(
        (bottom, loc) => (loc.row > bottom.row ? loc : bottom),
        this.map.locations[0],
      );

    await prisma.$transaction(async (tx) => {
      await tx.location.createMany({
        data: locations.map((loc) => ({
          ...loc,
          attributes: {},
        })),
        skipDuplicates: true,
      });
      await tx.path.createMany({
        data: paths.map((path) => ({
          ...path,
          attributes: {},
        })),
        skipDuplicates: true,
      });
      await tx.guild.upsert({
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
      await tx.map.create({
        data: {
          id,
          cols,
          rows,
        },
      });
    });
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
}
