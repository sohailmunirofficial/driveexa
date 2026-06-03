import * as SQLite from "expo-sqlite";
import { hashPassword, isPasswordHash } from "./auth-security";

export const db = SQLite.openDatabaseSync("drivexa.db");

export async function initDatabase() {
  try {
    // Enable WAL for performance
    await db.execAsync("PRAGMA journal_mode = WAL;");
    await db.execAsync("PRAGMA foreign_keys = ON;");

    // Users Table (Now acts as Admin Table)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        password TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx
      ON users (LOWER(email));
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS password_reset_otps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        otp_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        attempt_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS password_reset_otps_user_id_idx
      ON password_reset_otps (user_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS password_reset_otps_expires_at_idx
      ON password_reset_otps (expires_at);
    `);

    // Customers Table (Walk-in customers)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        cnic TEXT,
        license_image_url TEXT,
        license_back_image_url TEXT,
        cnic_image_url TEXT,
        cnic_back_image_url TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Vehicles Table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        registration_number TEXT,
        model_year TEXT,
        color TEXT,
        price_per_day REAL NOT NULL,
        price_per_hour REAL DEFAULT 0,
        image_url TEXT,
        image_urls TEXT,
        transmission TEXT,
        seats INTEGER,
        fuel_type TEXT,
        description TEXT,
        is_available INTEGER DEFAULT 1
      );
    `);

    // Bookings Table (Updated for Payments & Customers)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        vehicle_id INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        total_price REAL NOT NULL,
        advance_amount REAL DEFAULT 0,
        balance_amount REAL DEFAULT 0,
        security_deposit REAL DEFAULT 0,
        base_unit_price REAL,
        negotiated_unit_price REAL,
        discount_amount REAL DEFAULT 0,
        discount_note TEXT,
        payment_status TEXT DEFAULT 'pending', -- pending, partial, paid
        status TEXT DEFAULT 'active', -- active, completed, cancelled
        pricing_unit TEXT DEFAULT 'day', -- day, hour
        pickup_location TEXT,
        dropoff_location TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id),
        FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
      );
    `);

    // 5. Settings Table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    // Migration: Add price_per_hour to vehicles if it doesn't exist
    try {
      await db.execAsync(
        "ALTER TABLE vehicles ADD COLUMN price_per_hour REAL DEFAULT 0;",
      );
    } catch (e) {
      // Column might already exist
    }

    try {
      await db.execAsync(
        "ALTER TABLE vehicles ADD COLUMN registration_number TEXT;",
      );
    } catch (e) {
      // Column might already exist
    }

    try {
      await db.execAsync("ALTER TABLE vehicles ADD COLUMN model_year TEXT;");
    } catch (e) {
      // Column might already exist
    }

    try {
      await db.execAsync("ALTER TABLE vehicles ADD COLUMN color TEXT;");
    } catch (e) {
      // Column might already exist
    }

    try {
      await db.execAsync("ALTER TABLE vehicles ADD COLUMN image_urls TEXT;");
    } catch (e) {
      // Column might already exist
    }

    try {
      await db.execAsync(
        "ALTER TABLE customers ADD COLUMN license_back_image_url TEXT;",
      );
    } catch (e) {
      // Column might already exist
    }

    try {
      await db.execAsync(
        "ALTER TABLE customers ADD COLUMN cnic_back_image_url TEXT;",
      );
    } catch (e) {
      // Column might already exist
    }

    // Migration: Add pricing_unit to bookings if it doesn't exist
    try {
      await db.execAsync(
        "ALTER TABLE bookings ADD COLUMN pricing_unit TEXT DEFAULT 'day';",
      );
    } catch (e) {
      // Column might already exist
    }

    try {
      await db.execAsync(
        "ALTER TABLE bookings ADD COLUMN security_deposit REAL DEFAULT 0;",
      );
    } catch (e) {
      // Column might already exist
    }

    try {
      await db.execAsync(
        "ALTER TABLE bookings ADD COLUMN base_unit_price REAL;",
      );
    } catch (e) {
      // Column might already exist
    }

    try {
      await db.execAsync(
        "ALTER TABLE bookings ADD COLUMN negotiated_unit_price REAL;",
      );
    } catch (e) {
      // Column might already exist
    }

    try {
      await db.execAsync(
        "ALTER TABLE bookings ADD COLUMN discount_amount REAL DEFAULT 0;",
      );
    } catch (e) {
      // Column might already exist
    }

    try {
      await db.execAsync("ALTER TABLE bookings ADD COLUMN discount_note TEXT;");
    } catch (e) {
      // Column might already exist
    }

    try {
      await db.execAsync(
        "ALTER TABLE bookings ADD COLUMN pickup_location TEXT;",
      );
    } catch (e) {
      // Column might already exist
    }

    try {
      await db.execAsync(
        "ALTER TABLE bookings ADD COLUMN dropoff_location TEXT;",
      );
    } catch (e) {
      // Column might already exist
    }

    try {
      await db.execAsync("ALTER TABLE bookings ADD COLUMN notes TEXT;");
    } catch (e) {
      // Column might already exist
    }

    await migrateLegacyUserPasswords();

    // Seed initial data if empty
    await seedDatabase();
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

async function migrateLegacyUserPasswords() {
  try {
    const users = await db.getAllAsync<{ id: number; password: string }>(
      "SELECT id, password FROM users",
    );

    for (const user of users) {
      if (!user.password || isPasswordHash(user.password)) {
        continue;
      }

      const passwordHash = await hashPassword(user.password);
      await db.runAsync("UPDATE users SET password = ? WHERE id = ?", [
        passwordHash,
        user.id,
      ]);
    }
  } catch (error) {
    console.error("Password migration error:", error);
  }
}

async function seedDatabase() {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      "SELECT count(*) as count FROM vehicles",
    );
    if ((result?.count ?? 0) === 0) {
      const vehicles = [
        {
          name: "Toyota Corolla",
          type: "Sedan",
          registration_number: "LEA-0001",
          model_year: "2022",
          color: "White",
          price: 5000,
          price_per_hour: 1000,
          image_url:
            "https://images.unsplash.com/photo-1623869675781-80aa31012a5a?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
          image_urls: [
            "https://images.unsplash.com/photo-1623869675781-80aa31012a5a?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
          ],
          transmission: "Automatic",
          seats: 5,
          fuel_type: "Petrol",
          description:
            "Reliable and fuel-efficient sedan, perfect for city driving and small families.",
        },
        {
          name: "Honda Civic",
          type: "Sedan",
          registration_number: "LEA-0002",
          model_year: "2023",
          color: "Black",
          price: 150000,
          price_per_hour: 10000,
          image_url:
            "https://images.unsplash.com/photo-1614200179396-2bdb77ebf81b?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0",
          image_urls: [
            "https://images.unsplash.com/photo-1614200179396-2bdb77ebf81b?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0",
          ],
          transmission: "Automatic",
          seats: 5,
          fuel_type: "Petrol",
          description:
            "Sporty and spacious sedan with advanced features and comfortable interior.",
        },
        {
          name: "Toyota Fortuner",
          type: "SUV",
          registration_number: "LEA-0003",
          model_year: "2021",
          color: "Graphite",
          price: 120000,
          price_per_hour: 15000,
          image_url:
            "https://qz.com/cdn-cgi/image/width=1920,quality=85,format=auto/https://assets.qz.com/media/8829c0e55f0522cea7b589fec420db88.jpg",
          image_urls: [
            "https://qz.com/cdn-cgi/image/width=1920,quality=85,format=auto/https://assets.qz.com/media/8829c0e55f0522cea7b589fec420db88.jpg",
          ],
          transmission: "Automatic",
          seats: 7,
          fuel_type: "Diesel",
          description:
            "Powerful SUV for off-road adventures and large groups. Luxury and performance combined.",
        },
        {
          name: "Suzuki Alto",
          type: "Hatchback",
          registration_number: "LEA-0004",
          model_year: "2022",
          color: "Silver",
          price: 30000,
          price_per_hour: 3000,
          image_url:
            "https://i.abcnewsfe.com/a/f43853f3-9eaf-4048-9ae7-757332c5787e/mclaren-1-ht-gmh-240412_1712928561648_hpMain_16x9.jpg?w=1600",
          image_urls: [
            "https://i.abcnewsfe.com/a/f43853f3-9eaf-4048-9ae7-757332c5787e/mclaren-1-ht-gmh-240412_1712928561648_hpMain_16x9.jpg?w=1600",
          ],
          transmission: "Manual",
          seats: 5,
          fuel_type: "Petrol",
          description:
            "Compact and economical hatchback, ideal for navigating tight city streets.",
        },
        {
          name: "Kia Sportage",
          type: "SUV",
          registration_number: "LEA-0005",
          model_year: "2024",
          color: "Blue",
          price: 90000,
          price_per_hour: 10000,
          image_url:
            "https://i.pinimg.com/736x/f4/62/d6/f462d6974bc5d34b1590334f46fe31ba.jpg",
          image_urls: [
            "https://i.pinimg.com/736x/f4/62/d6/f462d6974bc5d34b1590334f46fe31ba.jpg",
          ],
          transmission: "Automatic",
          seats: 5,
          fuel_type: "Petrol",
          description:
            "Modern SUV with sleek design and high-tech features for a premium driving experience.",
        },
      ];

      for (const v of vehicles) {
        await db.runAsync(
          "INSERT INTO vehicles (name, type, registration_number, model_year, color, price_per_day, price_per_hour, image_url, image_urls, transmission, seats, fuel_type, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            v.name,
            v.type,
            v.registration_number,
            v.model_year,
            v.color,
            v.price,
            v.price_per_hour,
            v.image_url,
            JSON.stringify(v.image_urls),
            v.transmission,
            v.seats,
            v.fuel_type,
            v.description,
          ],
        );
      }
    }
  } catch (e) {
    console.error("Seeding error", e);
  }
}
