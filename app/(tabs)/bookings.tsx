import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Bell,
  Calendar,
  CarFront,
  Circle,
  Filter,
  IdCard,
  MapPin,
  MoreVertical,
  Plus,
  Search,
  XCircle,
} from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getFloatingActionLayout } from "../../components/ui/floating-action-layout";
import { AppScreen, Button, EmptyState } from "../../components/ui/primitives";
import { useResponsiveLayout } from "../../components/ui/responsive";
import { ListItemSkeleton } from "../../components/ui/skeleton";
import { AppTheme, useAppTheme } from "../../components/ui/theme";
import { getNameInitials, UserAvatar } from "../../components/ui/user-avatar";
import { useAuth } from "../../context/auth";
import { Booking, BookingRepository } from "../../services/booking-repository";

type BookingStatusFilter =
  | "all"
  | "active"
  | "upcoming"
  | "completed"
  | "cancelled";
type DatePreset = "all" | "today" | "tomorrow" | "week";

type BookingStatusOption = {
  label: string;
  value: BookingStatusFilter;
};

type DatePresetOption = {
  label: string;
  value: DatePreset;
};

const purple = "#6d28f5";
const deepText = "#070b1a";
const mutedText = "#68718a";

const statusOptions: BookingStatusOption[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const datePresetOptions: DatePresetOption[] = [
  { label: "All dates", value: "all" },
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" },
  { label: "Next 7 days", value: "week" },
];

function formatCurrency(value: number): string {
  return `PKR ${Math.round(value).toLocaleString()}`;
}

function formatBookingDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatBookingTime(value: string): string {
  const date = new Date(value);
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDateRange(preset: DatePreset): {
  startDate?: string;
  endDate?: string;
} {
  if (preset === "all") {
    return {};
  }

  const start = new Date();
  const end = new Date();

  if (preset === "tomorrow") {
    start.setDate(start.getDate() + 1);
    end.setDate(end.getDate() + 1);
  }

  start.setHours(0, 0, 0, 0);

  if (preset === "week") {
    end.setDate(end.getDate() + 7);
  }

  end.setHours(23, 59, 59, 999);

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

function getLocationLabel(booking: Booking): string {
  if (booking.pickup_location?.trim()) {
    return `Pickup: ${booking.pickup_location.trim()}`;
  }

  if (booking.dropoff_location?.trim()) {
    return `Drop-off: ${booking.dropoff_location.trim()}`;
  }

  return "Location not added";
}

function getStatusTone(status: Booking["status"]): {
  label: string;
  color: string;
  backgroundColor: string;
} {
  if (status === "completed") {
    return {
      label: "Completed",
      color: "#6d28f5",
      backgroundColor: "rgba(109, 40, 245, 0.1)",
    };
  }

  if (status === "cancelled") {
    return {
      label: "Cancelled",
      color: "#dc2626",
      backgroundColor: "rgba(220, 38, 38, 0.1)",
    };
  }

  return {
    label: "Active",
    color: "#079669",
    backgroundColor: "rgba(7, 150, 105, 0.1)",
  };
}

function getPaymentTone(status: Booking["payment_status"]): {
  label: string;
  color: string;
  backgroundColor: string;
} {
  if (status === "paid") {
    return {
      label: "Paid",
      color: "#079669",
      backgroundColor: "rgba(7, 150, 105, 0.1)",
    };
  }

  if (status === "partial") {
    return {
      label: "Partial",
      color: "#2563eb",
      backgroundColor: "rgba(37, 99, 235, 0.1)",
    };
  }

  return {
    label: "Pending",
    color: "#d97706",
    backgroundColor: "rgba(217, 119, 6, 0.1)",
  };
}

export default function BookingsListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const appTheme = useAppTheme();
  const layout = useResponsiveLayout();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => createStyles(appTheme, width, insets.bottom),
    [appTheme, insets.bottom, width],
  );

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatusFilter>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [paymentFilter, setPaymentFilter] = useState<
    Booking["payment_status"] | "all"
  >("all");

  const filterSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["62%"], []);
  const isFiltered =
    statusFilter !== "all" || datePreset !== "all" || paymentFilter !== "all";

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  const loadBookings = useCallback(async () => {
    setLoading(true);

    const dateRange = getDateRange(datePreset);
    const data = await BookingRepository.getAllBookings({
      limit: 80,
      searchQuery,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      status:
        statusFilter === "active" ||
        statusFilter === "completed" ||
        statusFilter === "cancelled"
          ? statusFilter
          : undefined,
      onlyUpcoming: statusFilter === "upcoming",
      paymentStatus: paymentFilter !== "all" ? paymentFilter : undefined,
    });

    setBookings(data);
    setLoading(false);
  }, [datePreset, paymentFilter, searchQuery, statusFilter]);

  useFocusEffect(
    useCallback(() => {
      void loadBookings();
    }, [loadBookings]),
  );

  const clearFilters = () => {
    setStatusFilter("all");
    setDatePreset("all");
    setPaymentFilter("all");
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text numberOfLines={2} style={styles.title}>
            Bookings
          </Text>
        </View>

        <View style={styles.headerActions}>
          <View style={styles.bellButton}>
            <Bell color={deepText} size={layout.isCompact ? 24 : 28} />
            <View style={styles.notificationDot} />
          </View>
          <UserAvatar
            name={user?.name || "Admin"}
            size={layout.isCompact ? 50 : 58}
          />
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <Search
            color={appTheme.colors.textSubtle}
            size={styles.searchIcon.width}
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by customer, vehicle or booking ID..."
            placeholderTextColor={appTheme.colors.textSubtle}
            autoCapitalize="none"
            returnKeyType="search"
            style={styles.searchInput}
          />
        </View>
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={() => filterSheetRef.current?.present()}
          style={[
            styles.filterButton,
            isFiltered ? styles.filterButtonActive : null,
          ]}
        >
          <Filter
            color={isFiltered ? purple : appTheme.colors.textMuted}
            size={styles.filterIcon.width}
            strokeWidth={2.2}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.statusWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusContent}
        >
          {statusOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              activeOpacity={0.84}
              onPress={() => setStatusFilter(option.value)}
              style={[
                styles.statusTab,
                statusFilter === option.value ? styles.statusTabActive : null,
              ]}
            >
              {statusFilter === option.value ? (
                <LinearGradient
                  colors={["#8a28ff", "#6d28f5", "#5b21d6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <Text
                numberOfLines={1}
                style={[
                  styles.statusTabText,
                  statusFilter === option.value
                    ? styles.statusTabTextActive
                    : null,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingList}>
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id.toString()}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              appTheme={appTheme}
              styles={styles}
              onPress={() => router.push(`/booking/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={Calendar}
              title="No bookings found"
              message="Try changing the search or filter selection."
            />
          }
        />
      )}

      <TouchableOpacity
        activeOpacity={0.86}
        onPress={() => router.push("/booking/create")}
        style={styles.floatingButton}
      >
        <LinearGradient
          colors={["#8a28ff", "#6d28f5", "#5b21d6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Plus color="#ffffff" size={styles.fabIcon.width} strokeWidth={2.4} />
        <Text numberOfLines={1} style={styles.floatingButtonText}>
          Add Booking
        </Text>
      </TouchableOpacity>

      <BottomSheetModal
        ref={filterSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetView style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Filters</Text>
              <Text style={styles.sheetSubtitle}>Refine booking records</Text>
            </View>
            {isFiltered ? (
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={clearFilters}
                style={styles.clearButton}
              >
                <XCircle color={appTheme.colors.danger} size={17} />
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.sheetSection}>
            <Text style={styles.sheetLabel}>Date range</Text>
            <View style={styles.sheetChipWrap}>
              {datePresetOptions.map((option) => (
                <SheetChip
                  key={option.value}
                  label={option.label}
                  selected={datePreset === option.value}
                  styles={styles}
                  onPress={() => setDatePreset(option.value)}
                />
              ))}
            </View>
          </View>

          <View style={styles.sheetSection}>
            <Text style={styles.sheetLabel}>Payment status</Text>
            <View style={styles.sheetChipWrap}>
              {(["all", "pending", "partial", "paid"] as const).map(
                (status) => (
                  <SheetChip
                    key={status}
                    label={status === "all" ? "All payments" : status}
                    selected={paymentFilter === status}
                    styles={styles}
                    onPress={() => setPaymentFilter(status)}
                  />
                ),
              )}
            </View>
          </View>

          <Button
            title="Apply Filters"
            icon={Filter}
            onPress={() => filterSheetRef.current?.dismiss()}
          />
        </BottomSheetView>
      </BottomSheetModal>
    </AppScreen>
  );
}

function BookingCard({
  booking,
  appTheme,
  styles,
  onPress,
}: {
  booking: Booking;
  appTheme: AppTheme;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  const paymentTone = getPaymentTone(booking.payment_status);
  const statusTone = getStatusTone(booking.status);
  const initials = getNameInitials(booking.customer_name || "Customer");
  const locationLabel = getLocationLabel(booking);

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
      <View style={styles.bookingCard}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.identityBlock}>
            <Text numberOfLines={1} style={styles.customerName}>
              {booking.customer_name || "Customer"}
            </Text>
            <View style={styles.metaLine}>
              <CarFront
                color={appTheme.colors.textMuted}
                size={15}
                strokeWidth={2.2}
              />
              <Text numberOfLines={1} style={styles.metaText}>
                {booking.vehicle_name || "Vehicle"}
              </Text>
            </View>
            {booking.vehicle_registration_number ? (
              <View style={styles.metaLine}>
                <IdCard
                  color={appTheme.colors.textMuted}
                  size={15}
                  strokeWidth={2.1}
                />
                <Text selectable numberOfLines={1} style={styles.metaText}>
                  {booking.vehicle_registration_number}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.priceBlock}>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.64}
              numberOfLines={1}
              style={styles.priceText}
            >
              {formatCurrency(booking.total_price)}
            </Text>
            <Text style={styles.unitText}>/ {booking.pricing_unit}</Text>
          </View>

          <MoreVertical
            color={appTheme.colors.slate}
            size={22}
            strokeWidth={2.4}
          />
        </View>

        <View style={styles.schedulePanel}>
          <DateBlock
            label="Start"
            value={`${formatBookingDate(booking.start_date)} • ${formatBookingTime(
              booking.start_date,
            )}`}
            styles={styles}
            color={appTheme.colors.textMuted}
          />
          <View style={styles.scheduleDivider} />
          <DateBlock
            label="End"
            value={`${formatBookingDate(booking.end_date)} • ${formatBookingTime(
              booking.end_date,
            )}`}
            styles={styles}
            color={appTheme.colors.textMuted}
          />
          <View style={styles.pillStack}>
            <StatusPill tone={paymentTone} styles={styles} />
            <StatusPill tone={statusTone} styles={styles} />
          </View>
        </View>

        <View style={styles.locationRow}>
          <MapPin
            color={appTheme.colors.textMuted}
            size={17}
            strokeWidth={2.2}
          />
          <Text numberOfLines={1} style={styles.locationText}>
            {locationLabel}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function DateBlock({
  label,
  value,
  styles,
  color,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
  color: string;
}) {
  return (
    <View style={styles.dateBlock}>
      <Calendar color={color} size={22} strokeWidth={2} />
      <View style={styles.dateTextBlock}>
        <Text style={styles.dateLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.dateValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function StatusPill({
  tone,
  styles,
}: {
  tone: ReturnType<typeof getStatusTone>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View
      style={[
        styles.statusPill,
        {
          backgroundColor: tone.backgroundColor,
        },
      ]}
    >
      <Circle color={tone.color} fill={tone.color} size={7} />
      <Text
        numberOfLines={1}
        style={[
          styles.statusPillText,
          {
            color: tone.color,
          },
        ]}
      >
        {tone.label}
      </Text>
    </View>
  );
}

function SheetChip({
  label,
  selected,
  styles,
  onPress,
}: {
  label: string;
  selected: boolean;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[styles.sheetChip, selected ? styles.sheetChipActive : null]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.sheetChipText,
          selected ? styles.sheetChipTextActive : null,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function createStyles(appTheme: AppTheme, width: number, bottomInset: number) {
  const isTiny = width < 360;
  const isCompact = width < 380;
  const isNarrow = width < 520;
  const isTablet = width >= 768;
  const screenPadding = isTiny ? 14 : isCompact ? 16 : isTablet ? 30 : 22;
  const floatingAction = getFloatingActionLayout(width, bottomInset);

  return StyleSheet.create({
    header: {
      paddingHorizontal: screenPadding,
      paddingTop: isCompact ? 16 : isTablet ? 28 : 22,
      paddingBottom: isCompact ? 18 : 24,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 34 : isCompact ? 38 : isTablet ? 44 : 42,
      lineHeight: isTiny ? 40 : isCompact ? 46 : isTablet ? 52 : 50,
      fontWeight: "900",
      letterSpacing: 0,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: isCompact ? 14 : 18,
    },
    bellButton: {
      width: isCompact ? 44 : 50,
      height: isCompact ? 44 : 50,
      alignItems: "center",
      justifyContent: "center",
    },
    notificationDot: {
      position: "absolute",
      top: isCompact ? 8 : 9,
      right: isCompact ? 8 : 9,
      width: isCompact ? 10 : 12,
      height: isCompact ? 10 : 12,
      borderRadius: 6,
      backgroundColor: purple,
      borderWidth: 2,
      borderColor: appTheme.colors.surface,
    },
    searchRow: {
      paddingHorizontal: screenPadding,
      flexDirection: "row",
      gap: isCompact ? 10 : 14,
      alignItems: "center",
    },
    searchField: {
      flex: 1,
      minWidth: 0,
      minHeight: isTiny ? 56 : isTablet ? 72 : 64,
      borderRadius: isTiny ? 24 : 28,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.glass,
      flexDirection: "row",
      alignItems: "center",
      gap: isTiny ? 10 : 14,
      paddingHorizontal: isTiny ? 16 : isTablet ? 24 : 20,
      boxShadow: appTheme.shadow.soft,
    },
    searchIcon: {
      width: isTiny ? 21 : isTablet ? 28 : 24,
      height: isTiny ? 21 : isTablet ? 28 : 24,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      color: appTheme.colors.text,
      fontSize: isTiny ? 14 : isTablet ? 20 : 16,
      fontWeight: "600",
      paddingVertical: 0,
    },
    filterButton: {
      width: isTiny ? 56 : isTablet ? 72 : 64,
      height: isTiny ? 56 : isTablet ? 72 : 64,
      borderRadius: isTiny ? 23 : 28,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.glass,
      alignItems: "center",
      justifyContent: "center",
      boxShadow: appTheme.shadow.soft,
    },
    filterButtonActive: {
      borderColor: "rgba(109, 40, 245, 0.32)",
      backgroundColor: appTheme.isDark
        ? "rgba(109, 40, 245, 0.18)"
        : "rgba(109, 40, 245, 0.08)",
    },
    filterIcon: {
      width: isTiny ? 22 : isTablet ? 28 : 24,
      height: isTiny ? 22 : isTablet ? 28 : 24,
    },
    statusWrap: {
      paddingTop: isCompact ? 18 : 24,
      paddingHorizontal: screenPadding,
    },
    statusContent: {
      minHeight: isTiny ? 64 : isTablet ? 82 : 72,
      borderRadius: isTiny ? 24 : 30,
      padding: isTiny ? 7 : 8,
      gap: isTiny ? 6 : 8,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.glass,
      boxShadow: appTheme.shadow.soft,
    },
    statusTab: {
      minWidth: isTiny ? 104 : isTablet ? 164 : 132,
      minHeight: isTiny ? 48 : isTablet ? 64 : 56,
      borderRadius: isTiny ? 19 : 24,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      paddingHorizontal: isTiny ? 12 : 18,
    },
    statusTabActive: {
      boxShadow: "0 12px 24px rgba(109, 40, 245, 0.26)",
    },
    statusTabText: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 13 : isTablet ? 17 : 15,
      fontWeight: "900",
    },
    statusTabTextActive: {
      color: "#ffffff",
    },
    loadingList: {
      padding: screenPadding,
      gap: 14,
    },
    listContent: {
      paddingHorizontal: screenPadding,
      paddingTop: isCompact ? 18 : 24,
      paddingBottom: floatingAction.listBottomPadding,
      gap: isCompact ? 14 : 18,
    },
    bookingCard: {
      borderRadius: isTiny ? 22 : isTablet ? 28 : 25,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.glass,
      padding: isTiny ? 14 : isTablet ? 24 : 18,
      gap: isTiny ? 14 : 18,
      boxShadow: appTheme.shadow.card,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: isTiny ? 10 : 14,
    },
    avatar: {
      width: isTiny ? 52 : isTablet ? 74 : 62,
      height: isTiny ? 52 : isTablet ? 74 : 62,
      borderRadius: isTiny ? 26 : isTablet ? 37 : 31,
      backgroundColor: appTheme.isDark ? "rgba(109, 40, 245, 0.2)" : "#f0e7ff",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      color: purple,
      fontSize: isTiny ? 20 : isTablet ? 28 : 23,
      fontWeight: "900",
      letterSpacing: 0,
    },
    identityBlock: {
      flex: 1,
      minWidth: 0,
      gap: isTiny ? 5 : 7,
    },
    customerName: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 19 : isTablet ? 25 : 22,
      lineHeight: isTiny ? 24 : isTablet ? 32 : 28,
      fontWeight: "900",
      letterSpacing: 0,
    },
    metaLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      minWidth: 0,
    },
    metaText: {
      flex: 1,
      minWidth: 0,
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 13 : isTablet ? 17 : 15,
      fontWeight: "800",
    },
    priceBlock: {
      width: isTiny ? 96 : isTablet ? 150 : 124,
      alignItems: "flex-start",
      paddingTop: 2,
    },
    priceText: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 16 : isTablet ? 23 : 20,
      fontWeight: "900",
      fontVariant: ["tabular-nums"],
    },
    unitText: {
      color: purple,
      fontSize: isTiny ? 14 : isTablet ? 19 : 17,
      fontWeight: "900",
      marginTop: 6,
    },
    schedulePanel: {
      borderRadius: isTiny ? 15 : 18,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      overflow: "hidden",
      flexDirection: isNarrow ? "column" : "row",
      alignItems: isNarrow ? "stretch" : "center",
    },
    dateBlock: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: isTiny ? 9 : 12,
      paddingHorizontal: isTiny ? 10 : isTablet ? 18 : 14,
      paddingVertical: isTiny ? 12 : isTablet ? 18 : 15,
    },
    dateTextBlock: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    dateLabel: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 12 : isTablet ? 16 : 14,
      fontWeight: "800",
    },
    dateValue: {
      color: appTheme.colors.slate,
      fontSize: isTiny ? 12 : isTablet ? 16 : 14,
      fontWeight: "800",
    },
    scheduleDivider: {
      width: isNarrow ? "100%" : 1,
      height: isNarrow ? 1 : "62%",
      backgroundColor: appTheme.colors.borderSoft,
    },
    pillStack: {
      width: isNarrow ? "100%" : isTablet ? 212 : 188,
      gap: isTiny ? 8 : 10,
      padding: isTiny ? 10 : 12,
    },
    statusPill: {
      minHeight: isTiny ? 30 : isTablet ? 38 : 34,
      borderRadius: 999,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: isTiny ? 10 : 14,
    },
    statusPillText: {
      fontSize: isTiny ? 12 : isTablet ? 16 : 14,
      fontWeight: "900",
    },
    locationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minWidth: 0,
    },
    locationText: {
      flex: 1,
      minWidth: 0,
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 13 : isTablet ? 17 : 15,
      fontWeight: "800",
    },
    floatingButton: {
      position: "absolute",
      right: isTiny ? 16 : isTablet ? 30 : 22,
      bottom: floatingAction.buttonBottom,
      width: floatingAction.buttonSize,
      height: floatingAction.buttonSize,
      borderRadius: floatingAction.buttonSize / 2,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      gap: isTiny ? 4 : 6,
      boxShadow: "0 20px 40px rgba(109, 40, 245, 0.34)",
    },
    fabIcon: {
      width: isTiny ? 30 : isTablet ? 42 : 36,
      height: isTiny ? 30 : isTablet ? 42 : 36,
    },
    floatingButtonText: {
      color: "#ffffff",
      fontSize: isTiny ? 11 : isTablet ? 15 : 13,
      fontWeight: "900",
      textAlign: "center",
      maxWidth: isTiny ? 66 : isTablet ? 88 : 78,
    },
    sheetBackground: {
      backgroundColor: appTheme.colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
    },
    sheetHandle: {
      backgroundColor: appTheme.colors.border,
      width: 48,
    },
    sheet: {
      paddingHorizontal: screenPadding,
      paddingTop: 12,
      paddingBottom: Math.max(bottomInset, 18),
      gap: 22,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
    },
    sheetTitle: {
      color: appTheme.colors.text,
      fontSize: 22,
      fontWeight: "900",
    },
    sheetSubtitle: {
      color: appTheme.colors.textMuted,
      fontSize: 13,
      fontWeight: "700",
      marginTop: 3,
    },
    clearButton: {
      minHeight: 36,
      borderRadius: 18,
      paddingHorizontal: 12,
      backgroundColor: appTheme.colors.dangerSoft,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    clearText: {
      color: appTheme.colors.danger,
      fontSize: 12,
      fontWeight: "900",
    },
    sheetSection: {
      gap: 11,
    },
    sheetLabel: {
      color: appTheme.colors.slate,
      fontSize: 14,
      fontWeight: "900",
    },
    sheetChipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 9,
    },
    sheetChip: {
      minHeight: 42,
      borderRadius: 21,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.surfaceRaised,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 15,
    },
    sheetChipActive: {
      borderColor: "rgba(109, 40, 245, 0.34)",
      backgroundColor: appTheme.isDark
        ? "rgba(109, 40, 245, 0.2)"
        : "rgba(109, 40, 245, 0.1)",
    },
    sheetChipText: {
      color: mutedText,
      fontSize: 13,
      fontWeight: "900",
      textTransform: "capitalize",
    },
    sheetChipTextActive: {
      color: purple,
    },
  });
}
