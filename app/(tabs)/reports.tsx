import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ArrowLeft,
  BarChart2,
  Calendar,
  DollarSign,
  Filter,
  TrendingUp,
  Users,
  X,
} from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AppScreen,
  Button,
  Card,
  EmptyState,
  FilterChip,
  IconButton,
  MetricCard,
  ScreenHeader,
  SectionHeader,
  StatusBadge,
} from "../../components/ui/primitives";
import { PaginationFooter } from "../../components/ui/pagination-footer";
import { TableRowSkeleton } from "../../components/ui/skeleton";
import { theme } from "../../components/ui/theme";
import { Booking, BookingRepository } from "../../services/booking-repository";
import {
  DashboardStats,
  StatsRepository,
} from "../../services/stats-repository";

export default function Reports() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Booking["status"] | "all">(
    "all",
  );

  // Filtering
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedRange, setSelectedRange] = useState<string>("all");

  const filterSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["85%"], []);
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    [],
  );

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalBookingsCount, setTotalBookingsCount] = useState(0);

  const setRange = (range: string) => {
    const now = new Date();
    setSelectedRange(range);
    setCurrentPage(1);

    switch (range) {
      case "today": {
        const start = new Date(now.setHours(0, 0, 0, 0));
        const end = new Date(now.setHours(23, 59, 59, 999));
        setStartDate(start);
        setEndDate(end);
        setShowStartPicker(false);
        setShowEndPicker(false);
        break;
      }
      case "yesterday": {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const start = new Date(yesterday.setHours(0, 0, 0, 0));
        const end = new Date(yesterday.setHours(23, 59, 59, 999));
        setStartDate(start);
        setEndDate(end);
        setShowStartPicker(false);
        setShowEndPicker(false);
        break;
      }
      case "week": {
        const start = new Date(now);
        start.setDate(
          now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1),
        ); // Monday
        start.setHours(0, 0, 0, 0);
        setStartDate(start);
        setEndDate(new Date());
        setShowStartPicker(false);
        setShowEndPicker(false);
        break;
      }
      case "custom":
        // Auto-open start picker when custom is selected
        setShowStartPicker(true);
        setShowEndPicker(false);
        break;
      case "all":
        setStartDate(null);
        setEndDate(null);
        setShowStartPicker(false);
        setShowEndPicker(false);
        break;
      default:
        break;
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const dateOptions = {
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    };
    const bookingOptions = {
      ...dateOptions,
      status: statusFilter !== "all" ? statusFilter : undefined,
    };

    const [s, paginatedBookings, totalBookings] = await Promise.all([
      StatsRepository.getDashboardStats(dateOptions),
      BookingRepository.getAllBookings({
        ...bookingOptions,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      }),
      BookingRepository.countBookings(bookingOptions),
    ]);

    setStats(s);
    setTotalBookingsCount(totalBookings);
    setBookings(paginatedBookings);
    setLoading(false);
  }, [currentPage, endDate, pageSize, startDate, statusFilter]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const clearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const getStatusTone = (status: string) => {
    switch (status) {
      case "active":
        return "info" as const;
      case "completed":
        return "success" as const;
      case "cancelled":
        return "danger" as const;
      default:
        return "neutral" as const;
    }
  };

  const isFiltered = startDate || endDate || statusFilter !== "all";

  return (
    <AppScreen>
      <ScreenHeader
        title="Reports"
        subtitle={startDate ? "Filtered performance" : "All time performance"}
        left={
          <IconButton
            icon={ArrowLeft}
            color={theme.colors.primary}
            onPress={() => router.back()}
          />
        }
        right={
          <>
            {isFiltered ? (
              <IconButton
                icon={X}
                color={theme.colors.danger}
                backgroundColor={theme.colors.dangerSoft}
                borderColor="#fecaca"
                onPress={clearFilters}
              />
            ) : null}
            <IconButton
              icon={Filter}
              color={isFiltered ? theme.colors.primary : theme.colors.slate}
              backgroundColor={
                isFiltered ? theme.colors.primarySoft : theme.colors.surface
              }
              borderColor={isFiltered ? "#bfdbfe" : theme.colors.borderSoft}
              onPress={() => filterSheetRef.current?.present()}
            />
          </>
        }
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        {loading ? (
          <Card style={styles.skeletonCard}>
            <TableRowSkeleton />
            <TableRowSkeleton />
            <TableRowSkeleton />
            <TableRowSkeleton />
            <TableRowSkeleton />
          </Card>
        ) : (
          <>
            <SectionHeader
              title="Earnings Overview"
              subtitle={startDate ? "Filtered range" : "All records"}
            />
            <Card style={styles.revenueCard}>
              <View style={styles.revenueTop}>
                <View style={styles.revenueIcon}>
                  <DollarSign color="#ffffff" size={21} />
                </View>
                <Text style={styles.revenueLabel}>Total Revenue</Text>
              </View>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.55}
                numberOfLines={1}
                style={styles.revenueValue}
              >
                Rs {stats?.totalEarnings.toLocaleString()}
              </Text>
              <View style={styles.revenueFoot}>
                <TrendingUp color="#86efac" size={16} />
                <Text style={styles.revenueMeta}>
                  {startDate ? "Filtered View" : "All Time Records"}
                </Text>
              </View>
            </Card>

            <View style={styles.metricGrid}>
              <MetricCard
                label="Total Vehicles"
                value={(stats?.totalVehicles || 0).toLocaleString()}
                icon={Users}
                tone="dark"
              />
              <MetricCard
                label={startDate ? "Period Bookings" : "Active Bookings"}
                value={(stats?.activeBookings || 0).toLocaleString()}
                icon={Calendar}
                tone="accent"
              />
            </View>

            <SectionHeader
              title={`Bookings (${totalBookingsCount.toLocaleString()})`}
              subtitle="Revenue-linked rental records"
              action={
                <View style={styles.statusTabs}>
                  {(["all", "active", "completed", "cancelled"] as const).map(
                    (s) => (
                      <TouchableOpacity
                        key={s}
                        activeOpacity={0.86}
                        onPress={() => {
                          setStatusFilter(s);
                          setCurrentPage(1);
                        }}
                        style={[
                          styles.statusTab,
                          statusFilter === s ? styles.statusTabSelected : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusTabText,
                            statusFilter === s
                              ? styles.statusTabTextSelected
                              : null,
                          ]}
                        >
                          {s}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              }
            />

            {bookings.length === 0 ? (
              <EmptyState
                icon={BarChart2}
                title="No bookings found"
                message="Try another date range or booking status."
              />
            ) : (
              bookings.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  activeOpacity={0.86}
                  onPress={() => router.push(`/booking/${b.id}`)}
                >
                  <Card style={styles.bookingRow}>
                    <View style={styles.bookingTop}>
                      <View style={styles.bookingCopy}>
                        <Text numberOfLines={1} style={styles.bookingTitle}>
                          {b.vehicle_name}
                        </Text>
                        <Text numberOfLines={1} style={styles.bookingCustomer}>
                          {b.customer_name}
                        </Text>
                      </View>
                      <StatusBadge
                        label={b.status}
                        tone={getStatusTone(b.status)}
                      />
                    </View>
                    <View style={styles.bookingBottom}>
                      <Text style={styles.bookingDates}>
                        {new Date(b.start_date).toLocaleDateString()} -{" "}
                        {new Date(b.end_date).toLocaleDateString()}
                      </Text>
                      <Text
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                        numberOfLines={1}
                        style={styles.bookingPrice}
                      >
                        Rs {b.total_price.toLocaleString()}
                      </Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))
            )}

            {totalBookingsCount > pageSize && (
              <View style={styles.paginationWrap}>
                <PaginationFooter
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItems={totalBookingsCount}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(s) => {
                    setPageSize(s);
                    setCurrentPage(1);
                  }}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>

      <BottomSheetModal
        ref={filterSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
      >
        <BottomSheetScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 40,
          }}
        >
          <SectionHeader
            title="Report Filters"
            subtitle="Tune the report view"
          />

          <View style={styles.sheetSection}>
            <Text style={styles.sheetLabel}>Select Range</Text>
            <View style={styles.chipWrap}>
              {[
                { label: "All Time", value: "all" },
                { label: "Today", value: "today" },
                { label: "Yesterday", value: "yesterday" },
                { label: "This Week", value: "week" },
                { label: "Custom", value: "custom" },
              ].map((r) => (
                <FilterChip
                  key={r.value}
                  label={r.label}
                  selected={selectedRange === r.value}
                  onPress={() => setRange(r.value)}
                />
              ))}
            </View>
          </View>

          <View style={styles.sheetSection}>
            <View style={styles.datePickerBlock}>
              <Text style={styles.datePickerLabel}>Start Date</Text>
              {selectedRange === "custom" && showStartPicker && (
                <DateTimePicker
                  value={startDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(_event: DateTimePickerEvent, d?: Date) => {
                    if (d) {
                      setStartDate(d);
                    }
                  }}
                />
              )}
              <TouchableOpacity
                onPress={() => setShowStartPicker(!showStartPicker)}
                style={styles.dateButton}
              >
                <Text style={styles.dateButtonText}>
                  {startDate
                    ? startDate.toLocaleDateString()
                    : "Select Start Date"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerBlock}>
              <Text style={styles.datePickerLabel}>End Date</Text>
              {selectedRange === "custom" && showEndPicker && (
                <DateTimePicker
                  value={endDate || startDate || new Date()}
                  mode="date"
                  display="spinner"
                  minimumDate={startDate || undefined}
                  onChange={(_event: DateTimePickerEvent, d?: Date) => {
                    if (d) {
                      setEndDate(d);
                    }
                  }}
                />
              )}
              <TouchableOpacity
                onPress={() => setShowEndPicker(!showEndPicker)}
                style={styles.dateButton}
              >
                <Text style={styles.dateButtonText}>
                  {endDate ? endDate.toLocaleDateString() : "Select End Date"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sheetSection}>
            <Text style={styles.sheetLabel}>Booking Status</Text>
            <View style={styles.chipWrap}>
              {(["all", "active", "completed", "cancelled"] as const).map(
                (s) => (
                  <FilterChip
                    key={s}
                    label={s}
                    selected={statusFilter === s}
                    onPress={() => setStatusFilter(s)}
                  />
                ),
              )}
            </View>
          </View>

          <Button
            title="Apply Filters"
            onPress={() => filterSheetRef.current?.dismiss()}
          />
        </BottomSheetScrollView>
      </BottomSheetModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing.screen,
    paddingBottom: 110,
    gap: 20,
  },
  skeletonCard: {
    padding: 0,
    overflow: "hidden",
  },
  revenueCard: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    padding: 22,
    gap: 14,
  },
  revenueTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  revenueIcon: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  revenueLabel: {
    color: "#dbeafe",
    fontSize: 14,
    fontWeight: "800",
  },
  revenueValue: {
    color: "#ffffff",
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 0,
    fontVariant: ["tabular-nums"],
  },
  revenueFoot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  revenueMeta: {
    color: "#bbf7d0",
    fontSize: 13,
    fontWeight: "800",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statusTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "flex-end",
  },
  statusTab: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
  },
  statusTabSelected: {
    backgroundColor: theme.colors.primary,
  },
  statusTabText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  statusTabTextSelected: {
    color: "#ffffff",
  },
  bookingRow: {
    gap: 13,
  },
  bookingTop: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  bookingCopy: {
    flex: 1,
    minWidth: 160,
  },
  bookingTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  bookingCustomer: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 3,
  },
  bookingBottom: {
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSoft,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  bookingDates: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  bookingPrice: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    maxWidth: 160,
  },
  paginationWrap: {
    marginBottom: 20,
  },
  sheetSection: {
    marginBottom: 22,
    gap: 10,
  },
  sheetLabel: {
    color: theme.colors.slate,
    fontSize: 13,
    fontWeight: "800",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  datePickerBlock: {
    gap: 8,
    marginBottom: 12,
  },
  datePickerLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  dateButton: {
    backgroundColor: theme.colors.surface,
    padding: 13,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
  },
  dateButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
});
