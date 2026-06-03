import { db } from "./db";

export interface Customer {
  id: number;
  name: string;
  phone: string;
  cnic?: string;
  license_image_url?: string;
  license_back_image_url?: string;
  cnic_image_url?: string;
  cnic_back_image_url?: string;
  created_at: string;
  total_bookings?: number;
  total_spent?: number;
}

type SqliteValue = string | number | null;
type CustomerWriteInput = Omit<
  Customer,
  "id" | "created_at" | "total_bookings" | "total_spent"
>;

type CustomerQueryOptions = {
  limit?: number;
  offset?: number;
  onlyWithUpcoming?: boolean;
  searchQuery?: string;
};

function buildCustomerFilters(options?: CustomerQueryOptions): {
  conditions: string[];
  params: SqliteValue[];
} {
  const conditions: string[] = [];
  const params: SqliteValue[] = [];

  if (options?.onlyWithUpcoming) {
    conditions.push(`EXISTS (
      SELECT 1
      FROM bookings upcoming
      WHERE upcoming.customer_id = c.id
        AND upcoming.status = 'active'
        AND upcoming.start_date >= DATETIME('now', 'localtime')
    )`);
  }

  const query = options?.searchQuery?.trim().toLowerCase();
  if (query) {
    conditions.push(
      "(LOWER(c.name) LIKE ? OR LOWER(c.phone) LIKE ? OR LOWER(COALESCE(c.cnic, '')) LIKE ?)",
    );
    const likeQuery = `%${query}%`;
    params.push(likeQuery, likeQuery, likeQuery);
  }

  return { conditions, params };
}

export const CustomerRepository = {
  async createCustomer(customer: CustomerWriteInput): Promise<Customer | null> {
    try {
      const result = await db.runAsync(
        "INSERT INTO customers (name, phone, cnic, license_image_url, license_back_image_url, cnic_image_url, cnic_back_image_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          customer.name.trim(),
          customer.phone.trim(),
          customer.cnic || null,
          customer.license_image_url || null,
          customer.license_back_image_url || null,
          customer.cnic_image_url || null,
          customer.cnic_back_image_url || null,
        ],
      );
      return {
        id: result.lastInsertRowId,
        created_at: new Date().toISOString(),
        ...customer,
      };
    } catch (error) {
      console.error("Error creating customer:", error);
      return null;
    }
  },

  async getAllCustomers(options?: CustomerQueryOptions): Promise<Customer[]> {
    try {
      let query = `SELECT c.*,
                          COUNT(b.id) as total_bookings,
                          COALESCE(SUM(CASE WHEN b.status != 'cancelled' THEN b.total_price ELSE b.advance_amount END), 0) as total_spent
                   FROM customers c
                   LEFT JOIN bookings b ON b.customer_id = c.id`;
      const { conditions, params } = buildCustomerFilters(options);

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      query += " GROUP BY c.id ORDER BY c.created_at DESC";

      if (options?.limit) {
        query += " LIMIT ?";
        params.push(options.limit);
        if (options?.offset) {
          query += " OFFSET ?";
          params.push(options.offset);
        }
      }
      return await db.getAllAsync<Customer>(query, params);
    } catch (error) {
      console.error("Error fetching customers:", error);
      return [];
    }
  },

  async countCustomers(options?: CustomerQueryOptions): Promise<number> {
    try {
      let query = "SELECT COUNT(*) as count FROM customers c";
      const { conditions, params } = buildCustomerFilters(options);

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      const result = await db.getFirstAsync<{ count: number }>(query, params);
      return result?.count || 0;
    } catch (error) {
      console.error("Error counting customers:", error);
      return 0;
    }
  },

  async checkDuplicate(phone: string, cnic?: string): Promise<Customer | null> {
    try {
      const query = cnic
        ? "SELECT * FROM customers WHERE phone = ? OR cnic = ? LIMIT 1"
        : "SELECT * FROM customers WHERE phone = ? LIMIT 1";
      const params = cnic ? [phone, cnic] : [phone];
      return await db.getFirstAsync<Customer>(query, params);
    } catch (error) {
      console.error("Error checking duplicate customer:", error);
      return null;
    }
  },

  async searchCustomers(query: string): Promise<Customer[]> {
    try {
      return await CustomerRepository.getAllCustomers({
        searchQuery: query,
        limit: 20,
      });
    } catch (error) {
      console.error("Error searching customers:", error);
      return [];
    }
  },

  async getCustomerById(id: number): Promise<Customer | null> {
    try {
      const result = await db.getFirstAsync<Customer>(
        "SELECT * FROM customers WHERE id = ?",
        [id],
      );
      return result || null;
    } catch (error) {
      console.error("Error getting customer by id", error);
      return null;
    }
  },

  async updateCustomer(id: number, data: Partial<Customer>): Promise<boolean> {
    try {
      const sets: string[] = [];
      const params: SqliteValue[] = [];
      if (data.name) {
        sets.push("name = ?");
        params.push(data.name);
      }
      if (data.phone) {
        sets.push("phone = ?");
        params.push(data.phone);
      }
      if (data.cnic !== undefined) {
        sets.push("cnic = ?");
        params.push(data.cnic);
      }
      if (data.license_image_url !== undefined) {
        sets.push("license_image_url = ?");
        params.push(data.license_image_url);
      }
      if (data.license_back_image_url !== undefined) {
        sets.push("license_back_image_url = ?");
        params.push(data.license_back_image_url);
      }
      if (data.cnic_image_url !== undefined) {
        sets.push("cnic_image_url = ?");
        params.push(data.cnic_image_url);
      }
      if (data.cnic_back_image_url !== undefined) {
        sets.push("cnic_back_image_url = ?");
        params.push(data.cnic_back_image_url);
      }

      if (sets.length === 0) return true;

      params.push(id);
      await db.runAsync(
        `UPDATE customers SET ${sets.join(", ")} WHERE id = ?`,
        params,
      );
      return true;
    } catch (error) {
      console.error("Error updating customer:", error);
      return false;
    }
  },
};
