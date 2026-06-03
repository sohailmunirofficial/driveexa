import { db } from "./db";

export interface Vehicle {
  id: number;
  name: string;
  type: string;
  registration_number?: string | null;
  model_year?: string | null;
  color?: string | null;
  price_per_day: number;
  price_per_hour: number;
  image_url: string;
  image_urls?: string | null;
  transmission: string;
  seats: number;
  fuel_type: string;
  description: string;
  is_available: number; // 1 or 0
}

type SqliteValue = string | number | null;

export type VehicleWriteInput = Omit<
  Vehicle,
  "id" | "image_url" | "image_urls" | "price_per_hour"
> & {
  image_url?: string;
  image_urls?: string[];
  price_per_hour?: number;
};

function serializeVehicleImages(images?: string[]): string {
  const cleanImages = (images || [])
    .map((image) => image.trim())
    .filter(Boolean);
  return JSON.stringify(cleanImages);
}

export function getVehicleImageUris(
  vehicle: Pick<Vehicle, "image_url" | "image_urls">,
): string[] {
  const gallery: string[] = [];

  if (vehicle.image_urls) {
    try {
      const parsedImages: unknown = JSON.parse(vehicle.image_urls);
      if (Array.isArray(parsedImages)) {
        parsedImages.forEach((image) => {
          if (typeof image === "string" && image.trim()) {
            gallery.push(image.trim());
          }
        });
      }
    } catch {
      // Ignore malformed legacy image gallery values.
    }
  }

  if (
    vehicle.image_url?.trim() &&
    !gallery.includes(vehicle.image_url.trim())
  ) {
    gallery.unshift(vehicle.image_url.trim());
  }

  return gallery;
}

export const VehicleRepository = {
  async getFleetVehicles(): Promise<Vehicle[]> {
    try {
      const vehicles = await db.getAllAsync<Vehicle>(
        "SELECT * FROM vehicles ORDER BY id DESC",
      );
      return vehicles;
    } catch (error) {
      console.error("Error fetching fleet vehicles:", error);
      return [];
    }
  },

  async getAllVehicles(): Promise<Vehicle[]> {
    try {
      const vehicles = await db.getAllAsync<Vehicle>(
        "SELECT * FROM vehicles WHERE is_available = 1",
      );
      return vehicles;
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      return [];
    }
  },

  async getVehicleById(id: number): Promise<Vehicle | null> {
    try {
      const vehicle = await db.getFirstAsync<Vehicle>(
        "SELECT * FROM vehicles WHERE id = ?",
        [id],
      );
      return vehicle || null;
    } catch (error) {
      console.error("Error fetching vehicle by ID:", error);
      return null;
    }
  },

  async getVehiclesByType(type: string): Promise<Vehicle[]> {
    try {
      const vehicles = await db.getAllAsync<Vehicle>(
        "SELECT * FROM vehicles WHERE type = ? AND is_available = 1",
        [type],
      );
      return vehicles;
    } catch (error) {
      console.error("Error fetching vehicles by type:", error);
      return [];
    }
  },
  async createVehicle(vehicle: VehicleWriteInput): Promise<Vehicle | null> {
    try {
      const images =
        vehicle.image_urls || (vehicle.image_url ? [vehicle.image_url] : []);
      const primaryImage = images[0] || vehicle.image_url || "";
      const result = await db.runAsync(
        "INSERT INTO vehicles (name, type, registration_number, model_year, color, price_per_day, price_per_hour, image_url, image_urls, transmission, seats, fuel_type, description, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          vehicle.name,
          vehicle.type,
          vehicle.registration_number || "",
          vehicle.model_year || "",
          vehicle.color || "",
          vehicle.price_per_day,
          vehicle.price_per_hour || 0,
          primaryImage,
          serializeVehicleImages(images),
          vehicle.transmission || "",
          vehicle.seats || 4,
          vehicle.fuel_type || "",
          vehicle.description || "",
          vehicle.is_available ?? 1,
        ],
      );
      return {
        id: result.lastInsertRowId,
        ...vehicle,
        image_url: primaryImage,
        image_urls: serializeVehicleImages(images),
        price_per_hour: vehicle.price_per_hour || 0,
      };
    } catch (error) {
      console.error("Error creating vehicle:", error);
      return null;
    }
  },
  async updateVehicle(
    id: number,
    vehicle: Partial<VehicleWriteInput>,
  ): Promise<boolean> {
    try {
      const sets: string[] = [];
      const values: SqliteValue[] = [];

      if (vehicle.name !== undefined) {
        sets.push("name = ?");
        values.push(vehicle.name);
      }
      if (vehicle.type !== undefined) {
        sets.push("type = ?");
        values.push(vehicle.type);
      }
      if (vehicle.registration_number !== undefined) {
        sets.push("registration_number = ?");
        values.push(vehicle.registration_number);
      }
      if (vehicle.model_year !== undefined) {
        sets.push("model_year = ?");
        values.push(vehicle.model_year);
      }
      if (vehicle.color !== undefined) {
        sets.push("color = ?");
        values.push(vehicle.color);
      }
      if (vehicle.price_per_day !== undefined) {
        sets.push("price_per_day = ?");
        values.push(vehicle.price_per_day);
      }
      if (vehicle.price_per_hour !== undefined) {
        sets.push("price_per_hour = ?");
        values.push(vehicle.price_per_hour);
      }
      if (vehicle.image_urls !== undefined) {
        const primaryImage = vehicle.image_urls[0] || vehicle.image_url || "";
        sets.push("image_url = ?");
        values.push(primaryImage);
        sets.push("image_urls = ?");
        values.push(serializeVehicleImages(vehicle.image_urls));
      } else if (vehicle.image_url !== undefined) {
        sets.push("image_url = ?");
        values.push(vehicle.image_url);
      }
      if (vehicle.transmission !== undefined) {
        sets.push("transmission = ?");
        values.push(vehicle.transmission);
      }
      if (vehicle.seats !== undefined) {
        sets.push("seats = ?");
        values.push(vehicle.seats);
      }
      if (vehicle.fuel_type !== undefined) {
        sets.push("fuel_type = ?");
        values.push(vehicle.fuel_type);
      }
      if (vehicle.description !== undefined) {
        sets.push("description = ?");
        values.push(vehicle.description);
      }
      if (vehicle.is_available !== undefined) {
        sets.push("is_available = ?");
        values.push(vehicle.is_available);
      }

      if (sets.length === 0) return false;

      await db.runAsync(`UPDATE vehicles SET ${sets.join(", ")} WHERE id = ?`, [
        ...values,
        id,
      ]);
      return true;
    } catch (error) {
      console.error("Error updating vehicle:", error);
      return false;
    }
  },

  async deleteVehicle(id: number): Promise<boolean> {
    try {
      await db.runAsync("DELETE FROM vehicles WHERE id = ?", [id]);
      return true;
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      return false;
    }
  },
};
