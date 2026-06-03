import { db } from "./db";

export interface DashboardStats {
  totalVehicles: number;
  activeBookings: number;
  totalEarnings: number;
}

type SqliteValue = string | number;

export const StatsRepository = {
  async getDashboardStats(options?: {
    startDate?: string;
    endDate?: string;
  }): Promise<DashboardStats> {
    try {
      let dateFilter = "";
      const params: SqliteValue[] = [];

      if (options?.startDate && options?.endDate) {
        dateFilter = " WHERE created_at BETWEEN ? AND ?";
        params.push(options.startDate, options.endDate);
      } else if (options?.startDate) {
        dateFilter = " WHERE created_at >= ?";
        params.push(options.startDate);
      }

      // 1. Total Vehicles
      const vehicleResult = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM vehicles",
      );
      const totalVehicles = vehicleResult?.count || 0;

      // 2. Active Bookings
      const bookingResult = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM bookings 
         WHERE status = 'active' ${dateFilter.replace("WHERE", "AND")}`,
        params,
      );
      const activeBookings = bookingResult?.count || 0;

      // 3. Total Earnings
      const earningsResult = await db.getFirstAsync<{ earnings: number }>(
        `SELECT SUM(advance_amount) as earnings FROM bookings
         ${dateFilter}`,
        params,
      );
      const totalEarnings = earningsResult?.earnings || 0;

      return {
        totalVehicles,
        activeBookings,
        totalEarnings,
      };
    } catch (error) {
      console.error("Error fetching stats:", error);
      return { totalVehicles: 0, activeBookings: 0, totalEarnings: 0 };
    }
  },
};
