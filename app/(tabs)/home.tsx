import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Armchair,
  BadgeIndianRupee,
  Calendar,
  CalendarPlus,
  CarFront,
  ChartNoAxesColumnIncreasing,
  EllipsisVertical,
  Settings2,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AppScreen } from "../../components/ui/primitives";
import {
  ResponsiveLayout,
  useResponsiveLayout,
} from "../../components/ui/responsive";
import { AppTheme, useAppTheme } from "../../components/ui/theme";
import { getNameInitials, UserAvatar } from "../../components/ui/user-avatar";
import { useAuth } from "../../context/auth";
import { Booking, BookingRepository } from "../../services/booking-repository";
import { CustomerRepository } from "../../services/customer-repository";
import {
  DashboardStats,
  StatsRepository,
} from "../../services/stats-repository";
import {
  getVehicleImageUris,
  Vehicle,
  VehicleRepository,
} from "../../services/vehicle-repository";

const purple = "#6d28f5";
const deepText = "#070b1a";

type HomeData = {
  stats: DashboardStats;
  todayRevenue: number;
  customers: number;
  recentBookings: Booking[];
  vehicles: Vehicle[];
};

type LucideIcon = typeof CarFront;

export default function OwnerDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const appTheme = useAppTheme();
  const layout = useResponsiveLayout();
  const styles = useMemo(
    () => createStyles(appTheme, layout),
    [appTheme, layout],
  );
  const [data, setData] = useState<HomeData>({
    stats: {
      totalVehicles: 0,
      activeBookings: 0,
      totalEarnings: 0,
    },
    todayRevenue: 0,
    customers: 0,
    recentBookings: [],
    vehicles: [],
  });

  const loadHome = useCallback(async () => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const stats = await StatsRepository.getDashboardStats();
    const todayStats = await StatsRepository.getDashboardStats({
      startDate: startOfDay.toISOString(),
      endDate: endOfDay.toISOString(),
    });
    const customers = await CustomerRepository.countCustomers();
    const recentBookings = await BookingRepository.getAllBookings({ limit: 3 });
    const vehicles = await VehicleRepository.getAllVehicles();

    setData({
      stats,
      todayRevenue: todayStats.totalEarnings,
      customers,
      recentBookings,
      vehicles: vehicles.slice(0, 4),
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHome();
    }, [loadHome]),
  );

  return (
    <AppScreen style={styles.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text numberOfLines={2} style={styles.greeting}>
              Good Morning, Admin 👋
            </Text>
            <Text numberOfLines={1} style={styles.subGreeting}>
              Here’s what’s happening today
            </Text>
          </View>
          <View style={styles.headerActions}>
            <UserAvatar
              name={user?.name || "Admin"}
              size={layout.isCompact ? 48 : 58}
            />
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon={CarFront}
            label="Total Vehicles"
            value={data.stats.totalVehicles.toLocaleString()}
            trend="+3 this week"
            tone="purple"
          />
          <StatCard
            icon={Calendar}
            label="Active Bookings"
            value={data.stats.activeBookings.toLocaleString()}
            trend="+4 today"
            tone="violet"
          />
          <StatCard
            icon={Users}
            label="Customers"
            value={data.customers.toLocaleString()}
            trend="+28 this week"
            tone="blue"
          />
          <StatCard
            icon={BadgeIndianRupee}
            label="Revenue Today"
            value={`${data.todayRevenue.toLocaleString()}`}
            trend="+12% vs yesterday"
            tone="green"
          />
        </View>

        <SectionCard title="Quick Actions">
          <View style={styles.quickActions}>
            <QuickAction
              icon={CarFront}
              label="Add Car"
              onPress={() => router.push("/owner/add-vehicle")}
            />
            <View style={styles.actionDivider} />
            <QuickAction
              icon={CalendarPlus}
              label="New Booking"
              onPress={() => router.push("/cars")}
            />
            <View style={styles.actionDivider} />
            <QuickAction
              icon={UserPlus}
              label="Add Customer"
              onPress={() => router.push("/customer/create")}
            />
            <View style={styles.actionDivider} />
            <QuickAction
              icon={ChartNoAxesColumnIncreasing}
              label="Reports"
              onPress={() => router.push("/reports")}
            />
          </View>
        </SectionCard>

        <SectionCard
          title="Recent Bookings"
          actionLabel="View All"
          onAction={() => router.push("/(tabs)/bookings")}
        >
          <View style={styles.bookingList}>
            {data.recentBookings.length > 0 ? (
              data.recentBookings.map((booking) => (
                <BookingRow key={booking.id} booking={booking} />
              ))
            ) : (
              <Text style={styles.emptyText}>No recent bookings yet.</Text>
            )}
          </View>
        </SectionCard>

        <SectionCard
          title="Available Cars"
          actionLabel="View All"
          onAction={() => router.push("/cars")}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carList}
          >
            {data.vehicles.length > 0 ? (
              data.vehicles.map((vehicle) => (
                <VehicleTile key={vehicle.id} vehicle={vehicle} />
              ))
            ) : (
              <Text style={styles.emptyText}>No available cars.</Text>
            )}
          </ScrollView>
        </SectionCard>
      </ScrollView>
    </AppScreen>
  );

  function SectionCard({
    title,
    actionLabel,
    onAction,
    children,
  }: {
    title: string;
    actionLabel?: string;
    onAction?: () => void;
    children: React.ReactNode;
  }) {
    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {actionLabel && onAction ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onAction}
              style={styles.viewAll}
            >
              <Text style={styles.viewAllText}>{actionLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {children}
      </View>
    );
  }

  function StatCard({
    icon: Icon,
    label,
    value,
    trend,
    tone,
  }: {
    icon: LucideIcon;
    label: string;
    value: string;
    trend: string;
    tone: "purple" | "violet" | "blue" | "green";
  }) {
    const palette = getStatPalette(tone, appTheme);
    return (
      <View
        style={[
          styles.statCard,
          {
            backgroundColor: palette.background,
            borderColor: palette.border,
          },
        ]}
      >
        <View style={[styles.statIcon, { backgroundColor: palette.iconBg }]}>
          <Icon color="#ffffff" size={23} strokeWidth={2.3} />
        </View>
        <Text numberOfLines={1} style={styles.statLabel}>
          {label}
        </Text>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.58}
          numberOfLines={1}
          style={styles.statValue}
        >
          {value}
        </Text>
        <View style={styles.trendRow}>
          <Text
            numberOfLines={1}
            style={[styles.trendText, { color: palette.text }]}
          >
            {trend}
          </Text>
          <TrendingUp color={palette.text} size={15} strokeWidth={2.5} />
        </View>
      </View>
    );
  }

  function QuickAction({
    icon: Icon,
    label,
    onPress,
  }: {
    icon: LucideIcon;
    label: string;
    onPress: () => void;
  }) {
    return (
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={onPress}
        style={styles.quickAction}
      >
        <View style={styles.quickIcon}>
          <Icon color={appTheme.colors.primary} size={30} strokeWidth={2.2} />
        </View>
        <Text numberOfLines={1} style={styles.quickLabel}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  function BookingRow({ booking }: { booking: Booking }) {
    const initials = getNameInitials(booking.customer_name || "NA");
    return (
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={() => router.push(`/booking/${booking.id}`)}
        style={styles.bookingRow}
      >
        <View style={styles.bookingMainLine}>
          <View style={styles.initialsCircle}>
            <Text style={styles.initialsText}>{initials}</Text>
          </View>
          <View style={styles.bookingCopy}>
            <Text numberOfLines={1} style={styles.bookingName}>
              {booking.customer_name || "Customer"}
            </Text>
            <Text numberOfLines={1} style={styles.bookingVehicle}>
              {booking.vehicle_name || "Vehicle"}
            </Text>
            <View style={styles.bookingDateRow}>
              <Calendar
                color={appTheme.colors.textMuted}
                size={13}
                strokeWidth={2.2}
              />
              <Text numberOfLines={1} style={styles.bookingDate}>
                {formatBookingDate(booking.start_date)}
              </Text>
            </View>
          </View>
          {layout.isNarrow ? null : <BookingAmount booking={booking} />}
          <EllipsisVertical
            color={appTheme.colors.slate}
            size={22}
            strokeWidth={2.2}
          />
        </View>
        {layout.isNarrow ? (
          <View style={styles.bookingCompactAmount}>
            <BookingAmount booking={booking} />
          </View>
        ) : null}
      </TouchableOpacity>
    );
  }

  function BookingAmount({ booking }: { booking: Booking }) {
    return (
      <View style={styles.bookingAmountColumn}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.65}
          numberOfLines={1}
          style={styles.bookingAmount}
        >
          PKR {booking.total_price.toLocaleString()}
        </Text>
        <View style={styles.badgeRow}>
          <StatusPill label={booking.payment_status} />
          <StatusPill label={booking.status} />
        </View>
      </View>
    );
  }

  function VehicleTile({ vehicle }: { vehicle: Vehicle }) {
    const imageUri = getVehicleImageUris(vehicle)[0];
    return (
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={() => router.push(`/cars/${vehicle.id}`)}
        style={styles.carCard}
      >
        <View style={styles.carImageFrame}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.carImage}
              contentFit="cover"
              transition={120}
            />
          ) : (
            <View style={styles.carImageEmpty}>
              <CarFront color={appTheme.colors.textSubtle} size={30} />
            </View>
          )}
          <View style={styles.availableBadge}>
            <Text style={styles.availableText}>Available</Text>
          </View>
        </View>
        <View style={styles.carBody}>
          <Text numberOfLines={1} style={styles.carName}>
            {vehicle.name}
          </Text>
          <Text numberOfLines={1} style={styles.carMeta}>
            {vehicle.type} • {vehicle.model_year || "2022"}
          </Text>
          <View style={styles.registrationRow}>
            <View style={styles.plateIcon} />
            <Text numberOfLines={1} style={styles.registrationText}>
              {vehicle.registration_number || "Not registered"}
            </Text>
          </View>
          <View style={styles.carDivider} />
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            numberOfLines={1}
            style={styles.dailyPrice}
          >
            PKR {vehicle.price_per_day.toLocaleString()}{" "}
            <Text style={styles.priceUnit}>/day</Text>
          </Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            numberOfLines={1}
            style={styles.hourlyPrice}
          >
            PKR {(vehicle.price_per_hour || 0).toLocaleString()} /hour
          </Text>
          <View style={styles.carFooter}>
            <View style={styles.carSpec}>
              <Armchair
                color={appTheme.colors.textMuted}
                size={14}
                strokeWidth={2}
              />
              <Text style={styles.carSpecText}>{vehicle.seats || 0} Seats</Text>
            </View>
            <View style={styles.carSpec}>
              <Settings2
                color={appTheme.colors.textMuted}
                size={14}
                strokeWidth={2}
              />
              <Text style={styles.carSpecText}>
                {vehicle.transmission || "Auto"}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  function StatusPill({ label }: { label: string }) {
    const status = label.toLowerCase();
    const palette = getStatusPalette(status, appTheme);
    return (
      <View
        style={[
          styles.statusPill,
          { backgroundColor: palette.bg, borderColor: palette.border },
        ]}
      >
        <View style={[styles.statusDot, { backgroundColor: palette.dot }]} />
        <Text
          numberOfLines={1}
          style={[styles.statusText, { color: palette.text }]}
        >
          {capitalize(label)}
        </Text>
      </View>
    );
  }
}

function getStatPalette(
  tone: "purple" | "violet" | "blue" | "green",
  appTheme: AppTheme,
) {
  if (appTheme.isDark) {
    switch (tone) {
      case "green":
        return {
          background: "rgba(54, 214, 173, 0.12)",
          border: "rgba(54, 214, 173, 0.28)",
          iconBg: "#119a78",
          text: "#68e2bf",
        };
      case "blue":
        return {
          background: "rgba(79, 140, 255, 0.14)",
          border: "rgba(122, 167, 255, 0.3)",
          iconBg: "#4f8cff",
          text: "#9cbeff",
        };
      case "violet":
        return {
          background: "rgba(139, 92, 246, 0.14)",
          border: "rgba(167, 139, 250, 0.32)",
          iconBg: "#7c3aed",
          text: "#c4b5fd",
        };
      case "purple":
      default:
        return {
          background: "rgba(109, 40, 245, 0.16)",
          border: "rgba(154, 103, 255, 0.34)",
          iconBg: "#6d28f5",
          text: "#c8b5ff",
        };
    }
  }

  switch (tone) {
    case "green":
      return {
        background: "#f4fffb",
        border: "#cdeee0",
        iconBg: "#23b978",
        text: "#079669",
      };
    case "blue":
      return {
        background: "#f6fbff",
        border: "#cbe5fb",
        iconBg: "#4d9df7",
        text: "#2f7de8",
      };
    case "violet":
      return {
        background: "#fbf8ff",
        border: "#e3d7fb",
        iconBg: "#7f67f2",
        text: purple,
      };
    case "purple":
    default:
      return {
        background: "#fbf7ff",
        border: "#e7d6fb",
        iconBg: "#7b35ef",
        text: purple,
      };
  }
}

function getStatusPalette(status: string, appTheme: AppTheme) {
  if (status === "paid" || status === "active") {
    return {
      bg: appTheme.colors.successSoft,
      text: appTheme.colors.success,
      dot: appTheme.colors.success,
      border: appTheme.isDark ? "rgba(66, 214, 159, 0.28)" : "#c9efd8",
    };
  }

  if (status === "completed") {
    return {
      bg: appTheme.colors.primarySoft,
      text: appTheme.colors.primary,
      dot: appTheme.colors.primary,
      border: appTheme.isDark ? "rgba(122, 167, 255, 0.3)" : "#e1d2fb",
    };
  }

  if (status === "partial") {
    return {
      bg: appTheme.isDark ? "rgba(79, 140, 255, 0.14)" : "#edf4ff",
      text: appTheme.isDark ? appTheme.colors.primary : "#2563eb",
      dot: appTheme.isDark ? appTheme.colors.primary : "#2563eb",
      border: appTheme.isDark ? "rgba(122, 167, 255, 0.28)" : "#d5e5ff",
    };
  }

  return {
    bg: appTheme.colors.warningSoft,
    text: appTheme.colors.warning,
    dot: appTheme.colors.warning,
    border: appTheme.isDark ? "rgba(247, 186, 67, 0.28)" : "#fde7bf",
  };
}

function formatBookingDate(date: string): string {
  const parsedDate = new Date(date);
  return `${parsedDate.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} • ${parsedDate.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function createStyles(appTheme: AppTheme, layout: ResponsiveLayout) {
  const isDark = appTheme.isDark;
  const statCardWidth = Math.floor(
    (layout.contentWidth - layout.cardGap * (layout.statColumns - 1)) /
      layout.statColumns,
  );
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: appTheme.colors.background,
    },
    content: {
      paddingHorizontal: layout.contentPadding,
      paddingTop: layout.isCompact ? 12 : 18,
      paddingBottom: layout.isCompact ? 122 : 142,
      gap: layout.isCompact ? 12 : 14,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: layout.isCompact ? 8 : 14,
      marginTop: 2,
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
    },
    greeting: {
      color: isDark ? appTheme.colors.text : deepText,
      fontSize: layout.isCompact ? 23 : layout.isTablet ? 31 : 28,
      lineHeight: layout.isCompact ? 29 : layout.isTablet ? 38 : 34,
      fontWeight: "900",
      letterSpacing: 0,
    },
    subGreeting: {
      color: isDark ? appTheme.colors.textMuted : "#7a849d",
      fontSize: layout.isCompact ? 15 : layout.isTablet ? 20 : 18,
      lineHeight: layout.isCompact ? 21 : 26,
      fontWeight: "600",
      marginTop: 4,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: layout.isCompact ? 8 : 14,
    },
    searchBar: {
      minHeight: layout.isCompact ? 58 : 70,
      borderRadius: layout.isCompact ? 20 : 24,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.glass,
      flexDirection: "row",
      alignItems: "center",
      gap: layout.isCompact ? 10 : 18,
      paddingHorizontal: layout.isCompact ? 16 : 22,
      marginTop: layout.isCompact ? 10 : 16,
    },
    searchText: {
      flex: 1,
      minWidth: 0,
      color: appTheme.colors.textMuted,
      fontSize: layout.isCompact ? 15 : 18,
      fontWeight: "500",
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: layout.cardGap,
      marginTop: layout.isCompact ? 8 : 12,
    },
    statCard: {
      width: statCardWidth,
      minHeight: layout.isCompact ? 124 : 142,
      borderRadius: layout.isCompact ? 20 : 24,
      borderWidth: 1,
      padding: layout.isCompact ? 11 : 14,
      justifyContent: "space-between",
    },
    statIcon: {
      width: layout.isCompact ? 38 : 45,
      height: layout.isCompact ? 38 : 45,
      borderRadius: layout.isCompact ? 11 : 12,
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 10px 18px rgba(109, 40, 245, 0.22)",
    },
    statLabel: {
      color: isDark ? appTheme.colors.textMuted : "#313a66",
      fontSize: layout.isCompact ? 12 : 14,
      fontWeight: "700",
      marginTop: 8,
    },
    statValue: {
      color: appTheme.colors.text,
      fontSize: layout.isCompact ? 20 : 24,
      fontWeight: "900",
      letterSpacing: 0,
      fontVariant: ["tabular-nums"],
    },
    trendRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      minWidth: 0,
    },
    trendText: {
      flexShrink: 1,
      fontSize: layout.isCompact ? 10 : 12,
      fontWeight: "800",
    },
    sectionCard: {
      borderRadius: layout.isCompact ? 20 : 24,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.glass,
      padding: layout.isCompact ? 12 : 16,
      marginTop: layout.isCompact ? 10 : 14,
      boxShadow: appTheme.shadow.card,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: layout.isCompact ? 12 : 16,
      gap: 12,
    },
    sectionTitle: {
      color: appTheme.colors.text,
      fontSize: layout.isCompact ? 17 : 20,
      fontWeight: "900",
      letterSpacing: 0,
    },
    viewAll: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    viewAllText: {
      color: appTheme.colors.primary,
      fontSize: layout.isCompact ? 14 : 16,
      fontWeight: "800",
    },
    quickActions: {
      minHeight: layout.isCompact ? 162 : 110,
      flexDirection: "row",
      flexWrap: layout.isCompact ? "wrap" : "nowrap",
      alignItems: "center",
      justifyContent: "space-between",
      rowGap: layout.isCompact ? 14 : 0,
    },
    quickAction: {
      flex: layout.isCompact ? 0 : 1,
      width: layout.isCompact ? "47%" : undefined,
      alignItems: "center",
      gap: layout.isCompact ? 8 : 10,
      minWidth: 0,
    },
    quickIcon: {
      width: layout.isCompact ? 56 : 66,
      height: layout.isCompact ? 56 : 66,
      borderRadius: layout.isCompact ? 18 : 22,
      backgroundColor: appTheme.colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    quickLabel: {
      color: appTheme.colors.text,
      fontSize: layout.isCompact ? 13 : 15,
      fontWeight: "600",
      textAlign: "center",
    },
    actionDivider: {
      width: 1,
      height: 58,
      backgroundColor: appTheme.colors.borderSoft,
      display: layout.isCompact ? "none" : "flex",
    },
    bookingList: {
      gap: 12,
    },
    bookingRow: {
      minHeight: layout.isNarrow ? 122 : 94,
      borderRadius: layout.isCompact ? 15 : 17,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.surfaceRaised,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: layout.isCompact ? 9 : 12,
    },
    bookingMainLine: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "stretch",
      gap: layout.isCompact ? 9 : 12,
    },
    initialsCircle: {
      width: layout.isCompact ? 48 : 58,
      height: layout.isCompact ? 48 : 58,
      borderRadius: layout.isCompact ? 24 : 29,
      backgroundColor: appTheme.colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    initialsText: {
      color: appTheme.colors.primary,
      fontSize: layout.isCompact ? 17 : 20,
      fontWeight: "900",
    },
    bookingCopy: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    bookingName: {
      color: appTheme.colors.text,
      fontSize: layout.isCompact ? 15 : 17,
      fontWeight: "900",
    },
    bookingVehicle: {
      color: appTheme.colors.textMuted,
      fontSize: layout.isCompact ? 13 : 15,
      fontWeight: "600",
    },
    bookingDateRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    bookingDate: {
      flex: 1,
      minWidth: 0,
      color: appTheme.colors.textMuted,
      fontSize: layout.isCompact ? 11 : 13,
      fontWeight: "600",
    },
    bookingAmountColumn: {
      width: layout.isNarrow ? "100%" : 176,
      alignItems: "flex-start",
      gap: layout.isCompact ? 7 : 9,
    },
    bookingCompactAmount: {
      alignSelf: "stretch",
      paddingLeft: layout.isCompact ? 57 : 70,
    },
    bookingAmount: {
      alignSelf: "stretch",
      color: appTheme.colors.text,
      fontSize: layout.isCompact ? 15 : 17,
      fontWeight: "900",
      textAlign: "left",
      fontVariant: ["tabular-nums"],
    },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      maxWidth: "100%",
    },
    statusPill: {
      minHeight: 31,
      borderRadius: 16,
      borderWidth: 1,
      paddingHorizontal: layout.isCompact ? 9 : 11,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      maxWidth: layout.isCompact ? 84 : 92,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    statusText: {
      fontSize: layout.isCompact ? 11 : 13,
      fontWeight: "800",
      flexShrink: 1,
    },
    carList: {
      gap: layout.isCompact ? 10 : 16,
      paddingBottom: 8,
    },
    carCard: {
      width: layout.carCardWidth,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.surfaceRaised,
      overflow: "hidden",
    },
    carImageFrame: {
      height: layout.isCompact ? 96 : 110,
      backgroundColor: appTheme.colors.surfaceMuted,
      position: "relative",
    },
    carImage: {
      width: "100%",
      height: "100%",
    },
    carImageEmpty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    availableBadge: {
      position: "absolute",
      top: 8,
      right: 8,
      borderRadius: 14,
      backgroundColor: appTheme.colors.successSoft,
      paddingHorizontal: 9,
      paddingVertical: 6,
    },
    availableText: {
      color: appTheme.colors.success,
      fontSize: 11,
      fontWeight: "900",
    },
    carBody: {
      padding: 11,
      gap: layout.isCompact ? 4 : 5,
    },
    carName: {
      color: appTheme.colors.text,
      fontSize: layout.isCompact ? 16 : 18,
      fontWeight: "900",
    },
    carMeta: {
      color: appTheme.colors.textMuted,
      fontSize: layout.isCompact ? 12 : 13,
      fontWeight: "600",
    },
    registrationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 5,
    },
    plateIcon: {
      width: 14,
      height: 10,
      borderRadius: 2,
      borderWidth: 1,
      borderColor: appTheme.colors.textMuted,
    },
    registrationText: {
      flex: 1,
      color: appTheme.colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
    },
    carDivider: {
      height: 1,
      backgroundColor: appTheme.colors.borderSoft,
      marginVertical: 4,
    },
    dailyPrice: {
      color: appTheme.colors.primary,
      fontSize: layout.isCompact ? 14 : 16,
      fontWeight: "900",
      fontVariant: ["tabular-nums"],
    },
    priceUnit: {
      fontSize: 11,
      fontWeight: "700",
    },
    hourlyPrice: {
      color: appTheme.colors.textMuted,
      fontSize: layout.isCompact ? 12 : 13,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    carFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      flexWrap: "wrap",
      paddingTop: 5,
    },
    carSpec: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      minWidth: 0,
    },
    carSpecText: {
      color: appTheme.colors.textMuted,
      fontSize: layout.isCompact ? 10 : 11,
      fontWeight: "700",
    },
    emptyText: {
      color: appTheme.colors.textMuted,
      fontSize: 15,
      fontWeight: "700",
      paddingVertical: 16,
    },
  });
}
