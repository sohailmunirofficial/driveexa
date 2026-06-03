import { db } from "./db";
import { derivePaymentStatus, normalizeMoney } from "./booking-pricing";

export interface Booking {
  id: number;
  customer_id: number;
  vehicle_id: number;
  start_date: string;
  end_date: string;
  total_price: number;
  advance_amount: number;
  balance_amount: number;
  security_deposit: number;
  base_unit_price?: number | null;
  negotiated_unit_price?: number | null;
  discount_amount?: number | null;
  discount_note?: string | null;
  payment_status: "pending" | "partial" | "paid";
  status: "active" | "completed" | "cancelled";
  pricing_unit: "day" | "hour";
  pickup_location?: string;
  dropoff_location?: string;
  notes?: string;
  created_at: string;
  vehicle_name?: string;
  vehicle_image?: string;
  vehicle_registration_number?: string | null;
  vehicle_type?: string | null;
  vehicle_transmission?: string | null;
  vehicle_fuel_type?: string | null;
  vehicle_price_per_day?: number | null;
  vehicle_price_per_hour?: number | null;
  customer_name?: string;
  customer_phone?: string;
  customer_cnic?: string;
  customer_license_image?: string;
  customer_license_back_image?: string;
  customer_cnic_image?: string;
  customer_cnic_back_image?: string;
}

type SqliteValue = string | number | null;
type BookingStatusFilter = Booking["status"];
export type BookingCreateInput = {
  customer_id: number;
  vehicle_id: number;
  start_date: string;
  end_date: string;
  total_price: number;
  advance_amount?: number;
  security_deposit?: number;
  base_unit_price?: number | null;
  negotiated_unit_price?: number | null;
  discount_amount?: number | null;
  discount_note?: string | null;
  status?: Booking["status"];
  pricing_unit?: Booking["pricing_unit"];
  pickup_location?: string;
  dropoff_location?: string;
  notes?: string;
};
type BookingQueryOptions = {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  status?: BookingStatusFilter;
  paymentStatus?: Booking["payment_status"];
  onlyUpcoming?: boolean;
  searchQuery?: string;
};

function buildBookingFilters(options?: BookingQueryOptions): {
  conditions: string[];
  params: SqliteValue[];
} {
  const conditions: string[] = [];
  const params: SqliteValue[] = [];

  if (options?.startDate && options?.endDate) {
    conditions.push("b.start_date <= ? AND b.end_date >= ?");
    params.push(options.endDate, options.startDate);
  } else if (options?.startDate) {
    conditions.push("b.start_date >= ?");
    params.push(options.startDate);
  }

  if (options?.status) {
    conditions.push("b.status = ?");
    params.push(options.status);
  }

  if (options?.paymentStatus) {
    conditions.push("b.payment_status = ?");
    params.push(options.paymentStatus);
  }

  if (options?.onlyUpcoming) {
    conditions.push(
      "b.status = 'active' AND b.start_date >= DATETIME('now', 'localtime')",
    );
  }

  const query = options?.searchQuery?.trim().toLowerCase();
  if (query) {
    conditions.push(
      `(LOWER(c.name) LIKE ? OR LOWER(v.name) LIKE ? OR LOWER(COALESCE(v.registration_number, '')) LIKE ? OR CAST(b.id AS TEXT) LIKE ?)`,
    );
    const likeQuery = `%${query}%`;
    params.push(likeQuery, likeQuery, likeQuery, likeQuery);
  }

  return { conditions, params };
}

type GroupedBookingRow = Booking & {
  group_id: number;
};

function normalizeIdList(ids: number[]): number[] {
  return [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))];
}

function normalizeGroupLimit(limit: number): number {
  return Math.max(1, Math.floor(limit));
}

function groupBookingsById(
  rows: GroupedBookingRow[],
): Record<number, Booking[]> {
  const grouped: Record<number, Booking[]> = {};

  rows.forEach((row) => {
    if (!grouped[row.group_id]) {
      grouped[row.group_id] = [];
    }
    grouped[row.group_id].push(row);
  });

  return grouped;
}

async function syncVehicleAvailability(vehicleId: number): Promise<void> {
  const activeBookings = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM bookings WHERE vehicle_id = ? AND status = 'active'",
    [vehicleId],
  );

  await db.runAsync("UPDATE vehicles SET is_available = ? WHERE id = ?", [
    (activeBookings?.count ?? 0) > 0 ? 0 : 1,
    vehicleId,
  ]);
}

export const BookingRepository = {
  async checkAvailability(
    vehicleId: number,
    startDate: string,
    endDate: string,
    excludeBookingId?: number,
  ): Promise<boolean> {
    try {
      // Check for overlaps:
      // (StartB <= EndA) AND (EndB >= StartA)
      const params: SqliteValue[] = [vehicleId, endDate, startDate];
      let query = `SELECT id FROM bookings
                   WHERE vehicle_id = ?
                   AND status = 'active'
                   AND (start_date <= ? AND end_date >= ?)`;

      if (excludeBookingId) {
        query += " AND id != ?";
        params.push(excludeBookingId);
      }

      const result = await db.getAllAsync(query, params);
      return result.length === 0;
    } catch (error) {
      console.error("Error checking availability:", error);
      return false;
    }
  },

  async createBooking(booking: BookingCreateInput): Promise<Booking | null> {
    try {
      // Calculate balance and payment status automatically
      const total = normalizeMoney(booking.total_price);
      const advance = Math.min(total, normalizeMoney(booking.advance_amount));
      const balance = normalizeMoney(total - advance);
      const paymentStatus = derivePaymentStatus(total, advance);
      const status = booking.status || "active";

      let insertedBookingId = 0;

      await db.withTransactionAsync(async () => {
        const result = await db.runAsync(
          `INSERT INTO bookings (
            customer_id, vehicle_id, start_date, end_date, 
            total_price, advance_amount, balance_amount, security_deposit,
            base_unit_price, negotiated_unit_price, discount_amount, discount_note,
            payment_status, status, pricing_unit, pickup_location,
            dropoff_location, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            booking.customer_id,
            booking.vehicle_id,
            booking.start_date,
            booking.end_date,
            total,
            advance,
            balance,
            normalizeMoney(booking.security_deposit),
            booking.base_unit_price ?? null,
            booking.negotiated_unit_price ?? null,
            normalizeMoney(booking.discount_amount),
            booking.discount_note?.trim() || "",
            paymentStatus,
            status,
            booking.pricing_unit || "day",
            booking.pickup_location?.trim() || "",
            booking.dropoff_location?.trim() || "",
            booking.notes?.trim() || "",
          ],
        );
        insertedBookingId = result.lastInsertRowId;

        await syncVehicleAvailability(booking.vehicle_id);
      });

      return {
        ...booking,
        id: insertedBookingId,
        status,
        payment_status: paymentStatus,
        balance_amount: balance,
        security_deposit: normalizeMoney(booking.security_deposit),
        created_at: new Date().toISOString(),
        total_price: total,
        advance_amount: advance,
        discount_amount: normalizeMoney(booking.discount_amount),
        pricing_unit: booking.pricing_unit || "day",
      };
    } catch (error) {
      console.error("Error creating booking:", error);
      return null;
    }
  },

  async getCustomerBookings(customerId: number): Promise<Booking[]> {
    try {
      const bookings = await db.getAllAsync<Booking>(
        `SELECT b.*, v.name as vehicle_name, v.image_url as vehicle_image 
         FROM bookings b 
         JOIN vehicles v ON b.vehicle_id = v.id 
         WHERE b.customer_id = ? 
         ORDER BY b.created_at DESC`,
        [customerId],
      );
      return bookings;
    } catch (error) {
      console.error("Error fetching bookings:", error);
      return [];
    }
  },

  async getAllBookings(options?: BookingQueryOptions): Promise<Booking[]> {
    try {
      let query = `SELECT b.*,
                          v.name as vehicle_name,
                          v.image_url as vehicle_image,
                          v.registration_number as vehicle_registration_number,
                          v.type as vehicle_type,
                          v.transmission as vehicle_transmission,
                          v.fuel_type as vehicle_fuel_type,
                          v.price_per_day as vehicle_price_per_day,
                          v.price_per_hour as vehicle_price_per_hour,
                          c.name as customer_name,
                          c.phone as customer_phone
                    FROM bookings b
                    JOIN vehicles v ON b.vehicle_id = v.id
                    JOIN customers c ON b.customer_id = c.id`;
      const { conditions, params } = buildBookingFilters(options);

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      query += " ORDER BY b.created_at DESC";

      if (options?.limit) {
        query += " LIMIT ?";
        params.push(options.limit);
        if (options?.offset) {
          query += " OFFSET ?";
          params.push(options.offset);
        }
      }

      return await db.getAllAsync<Booking>(query, params);
    } catch (error) {
      console.error("Error fetching all bookings:", error);
      return [];
    }
  },

  async countBookings(options?: BookingQueryOptions): Promise<number> {
    try {
      let query = `SELECT COUNT(*) as count
                   FROM bookings b
                   JOIN vehicles v ON b.vehicle_id = v.id
                   JOIN customers c ON b.customer_id = c.id`;
      const { conditions, params } = buildBookingFilters(options);

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      const result = await db.getFirstAsync<{ count: number }>(query, params);
      return result?.count || 0;
    } catch (error) {
      console.error("Error counting bookings:", error);
      return 0;
    }
  },

  async getBookingById(id: number): Promise<Booking | null> {
    try {
      const result = await db.getFirstAsync<Booking>(
        `SELECT b.*,
                v.name as vehicle_name,
                v.image_url as vehicle_image,
                v.registration_number as vehicle_registration_number,
                v.type as vehicle_type,
                v.transmission as vehicle_transmission,
                v.fuel_type as vehicle_fuel_type,
                v.price_per_day as vehicle_price_per_day,
                v.price_per_hour as vehicle_price_per_hour,
                c.name as customer_name, c.phone as customer_phone, c.cnic as customer_cnic,
                c.license_image_url as customer_license_image,
                c.license_back_image_url as customer_license_back_image,
                c.cnic_image_url as customer_cnic_image,
                c.cnic_back_image_url as customer_cnic_back_image
         FROM bookings b
         JOIN vehicles v ON b.vehicle_id = v.id
         JOIN customers c ON b.customer_id = c.id
         WHERE b.id = ?`,
        [id],
      );
      return result;
    } catch (error) {
      console.error("Error fetching booking by id:", error);
      return null;
    }
  },

  async completeBooking(id: number): Promise<boolean> {
    try {
      const booking = await db.getFirstAsync<Booking>(
        "SELECT vehicle_id FROM bookings WHERE id = ?",
        [id],
      );
      if (!booking) return false;

      await db.withTransactionAsync(async () => {
        await db.runAsync(
          "UPDATE bookings SET status = 'completed' WHERE id = ?",
          [id],
        );
        await syncVehicleAvailability(booking.vehicle_id);
      });
      return true;
    } catch (error) {
      console.error("Error completing booking:", error);
      return false;
    }
  },

  async cancelBooking(id: number, refundAmount: number = 0): Promise<boolean> {
    try {
      const booking = await db.getFirstAsync<Booking>(
        "SELECT vehicle_id, advance_amount FROM bookings WHERE id = ?",
        [id],
      );

      if (!booking) return false;

      await db.withTransactionAsync(async () => {
        // 1. Update booking status and refund
        // If we refund, we subtract from advance_amount (or however we want to track 'kept' money)
        // User said: "if I cancel a booking, it does not ask me to refund payment"
        // and "reports page shows the correct total revenue".
        // So we should probably record the final money kept.
        const newAdvance = Math.max(0, booking.advance_amount - refundAmount);

        await db.runAsync(
          "UPDATE bookings SET status = 'cancelled', advance_amount = ?, balance_amount = 0, payment_status = 'paid' WHERE id = ?",
          [newAdvance, id],
        );
        await syncVehicleAvailability(booking.vehicle_id);
      });
      return true;
    } catch (error) {
      console.error("Error cancelling booking:", error);
      return false;
    }
  },

  async updateBooking(id: number, data: Partial<Booking>): Promise<boolean> {
    try {
      const sets: string[] = [];
      const params: SqliteValue[] = [];
      let currentPaymentData: Pick<
        Booking,
        "total_price" | "advance_amount"
      > | null = null;
      let currentStatusData: Pick<Booking, "vehicle_id"> | null = null;

      if (data.total_price !== undefined || data.advance_amount !== undefined) {
        currentPaymentData = await db.getFirstAsync<
          Pick<Booking, "total_price" | "advance_amount">
        >("SELECT total_price, advance_amount FROM bookings WHERE id = ?", [
          id,
        ]);

        if (!currentPaymentData) {
          return false;
        }
      }

      if (data.status !== undefined || data.vehicle_id !== undefined) {
        currentStatusData = await db.getFirstAsync<Pick<Booking, "vehicle_id">>(
          "SELECT vehicle_id FROM bookings WHERE id = ?",
          [id],
        );

        if (!currentStatusData) {
          return false;
        }
      }

      if (data.start_date) {
        sets.push("start_date = ?");
        params.push(data.start_date);
      }
      if (data.customer_id !== undefined) {
        sets.push("customer_id = ?");
        params.push(data.customer_id);
      }
      if (data.vehicle_id !== undefined) {
        sets.push("vehicle_id = ?");
        params.push(data.vehicle_id);
      }
      if (data.end_date) {
        sets.push("end_date = ?");
        params.push(data.end_date);
      }
      if (currentPaymentData) {
        const total = normalizeMoney(
          data.total_price ?? currentPaymentData.total_price,
        );
        const advance = Math.min(
          total,
          normalizeMoney(
            data.advance_amount ?? currentPaymentData.advance_amount,
          ),
        );
        const balance = normalizeMoney(total - advance);
        const paymentStatus = derivePaymentStatus(total, advance);

        if (data.total_price !== undefined) {
          sets.push("total_price = ?");
          params.push(total);
        }
        if (data.advance_amount !== undefined) {
          sets.push("advance_amount = ?");
          params.push(advance);
        }
        sets.push("balance_amount = ?");
        params.push(balance);
        sets.push("payment_status = ?");
        params.push(paymentStatus);
      }
      if (data.pricing_unit) {
        sets.push("pricing_unit = ?");
        params.push(data.pricing_unit);
      }
      if (data.status) {
        sets.push("status = ?");
        params.push(data.status);
      }
      if (data.security_deposit !== undefined) {
        sets.push("security_deposit = ?");
        params.push(normalizeMoney(data.security_deposit));
      }
      if (data.base_unit_price !== undefined) {
        sets.push("base_unit_price = ?");
        params.push(data.base_unit_price);
      }
      if (data.negotiated_unit_price !== undefined) {
        sets.push("negotiated_unit_price = ?");
        params.push(data.negotiated_unit_price);
      }
      if (data.discount_amount !== undefined) {
        sets.push("discount_amount = ?");
        params.push(normalizeMoney(data.discount_amount));
      }
      if (data.discount_note !== undefined) {
        sets.push("discount_note = ?");
        params.push(data.discount_note);
      }
      if (data.pickup_location !== undefined) {
        sets.push("pickup_location = ?");
        params.push(data.pickup_location);
      }
      if (data.dropoff_location !== undefined) {
        sets.push("dropoff_location = ?");
        params.push(data.dropoff_location);
      }
      if (data.notes !== undefined) {
        sets.push("notes = ?");
        params.push(data.notes);
      }

      if (sets.length === 0) return true;

      params.push(id);
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `UPDATE bookings SET ${sets.join(", ")} WHERE id = ?`,
          params,
        );

        if (currentStatusData) {
          await syncVehicleAvailability(currentStatusData.vehicle_id);
          if (
            data.vehicle_id !== undefined &&
            data.vehicle_id !== currentStatusData.vehicle_id
          ) {
            await syncVehicleAvailability(data.vehicle_id);
          }
        }
      });
      return true;
    } catch (error) {
      console.error("Error updating booking:", error);
      return false;
    }
  },

  async updatePayment(
    bookingId: number,
    newAmountPaid: number,
  ): Promise<boolean> {
    try {
      const booking = await db.getFirstAsync<Booking>(
        "SELECT * FROM bookings WHERE id = ?",
        [bookingId],
      );
      if (!booking) return false;

      const newAdvance = Math.min(
        booking.total_price,
        normalizeMoney(booking.advance_amount + newAmountPaid),
      );
      const newBalance = normalizeMoney(booking.total_price - newAdvance);
      const newStatus = derivePaymentStatus(booking.total_price, newAdvance);

      await db.runAsync(
        "UPDATE bookings SET advance_amount = ?, balance_amount = ?, payment_status = ? WHERE id = ?",
        [newAdvance, newBalance, newStatus, bookingId],
      );
      return true;
    } catch (error) {
      console.error("Error updating payment:", error);
      return false;
    }
  },

  async getUpcomingBookings(options: {
    customerId?: number;
    vehicleId?: number;
    limit?: number;
  }): Promise<Booking[]> {
    try {
      let query = `SELECT b.*, v.name as vehicle_name, c.name as customer_name
                    FROM bookings b
                    JOIN vehicles v ON b.vehicle_id = v.id
                    JOIN customers c ON b.customer_id = c.id
                    WHERE b.status = 'active' AND b.start_date >= DATETIME('now', 'localtime')`;
      const params: SqliteValue[] = [];

      if (options.customerId) {
        query += " AND b.customer_id = ?";
        params.push(options.customerId);
      }
      if (options.vehicleId) {
        query += " AND b.vehicle_id = ?";
        params.push(options.vehicleId);
      }

      query += " ORDER BY b.start_date ASC";

      if (options.limit) {
        query += " LIMIT ?";
        params.push(options.limit);
      }

      return await db.getAllAsync<Booking>(query, params);
    } catch (error) {
      console.error("Error fetching upcoming bookings:", error);
      return [];
    }
  },

  async getUpcomingBookingsByVehicleIds(
    vehicleIds: number[],
    limitPerVehicle: number = 3,
  ): Promise<Record<number, Booking[]>> {
    const ids = normalizeIdList(vehicleIds);
    if (ids.length === 0) return {};

    try {
      const placeholders = ids.map(() => "?").join(", ");
      const limit = normalizeGroupLimit(limitPerVehicle);
      const rows = await db.getAllAsync<GroupedBookingRow>(
        `SELECT *
         FROM (
           SELECT b.*, b.vehicle_id as group_id,
                  v.name as vehicle_name,
                  c.name as customer_name,
                  ROW_NUMBER() OVER (
                    PARTITION BY b.vehicle_id
                    ORDER BY b.start_date ASC
                  ) as upcoming_rank
           FROM bookings b
           JOIN vehicles v ON b.vehicle_id = v.id
           JOIN customers c ON b.customer_id = c.id
           WHERE b.status = 'active'
             AND b.start_date >= DATETIME('now', 'localtime')
             AND b.vehicle_id IN (${placeholders})
         )
         WHERE upcoming_rank <= ?
         ORDER BY group_id ASC, start_date ASC`,
        [...ids, limit],
      );

      return groupBookingsById(rows);
    } catch (error) {
      console.error("Error fetching upcoming bookings by vehicle:", error);
      return {};
    }
  },

  async getUpcomingBookingsByCustomerIds(
    customerIds: number[],
    limitPerCustomer: number = 3,
  ): Promise<Record<number, Booking[]>> {
    const ids = normalizeIdList(customerIds);
    if (ids.length === 0) return {};

    try {
      const placeholders = ids.map(() => "?").join(", ");
      const limit = normalizeGroupLimit(limitPerCustomer);
      const rows = await db.getAllAsync<GroupedBookingRow>(
        `SELECT *
         FROM (
           SELECT b.*, b.customer_id as group_id,
                  v.name as vehicle_name,
                  c.name as customer_name,
                  ROW_NUMBER() OVER (
                    PARTITION BY b.customer_id
                    ORDER BY b.start_date ASC
                  ) as upcoming_rank
           FROM bookings b
           JOIN vehicles v ON b.vehicle_id = v.id
           JOIN customers c ON b.customer_id = c.id
           WHERE b.status = 'active'
             AND b.start_date >= DATETIME('now', 'localtime')
             AND b.customer_id IN (${placeholders})
         )
         WHERE upcoming_rank <= ?
         ORDER BY group_id ASC, start_date ASC`,
        [...ids, limit],
      );

      return groupBookingsById(rows);
    } catch (error) {
      console.error("Error fetching upcoming bookings by customer:", error);
      return {};
    }
  },
};
