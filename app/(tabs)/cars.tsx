import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Armchair,
  Calendar,
  CarFront,
  Circle,
  Fuel,
  MoreVertical,
  Plus,
  Search,
  Settings,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
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
import { AppScreen, EmptyState } from "../../components/ui/primitives";
import { useResponsiveLayout } from "../../components/ui/responsive";
import { AppTheme, useAppTheme } from "../../components/ui/theme";
import { CarCardSkeleton } from "../../components/ui/skeleton";
import {
  getVehicleImageUris,
  Vehicle,
  VehicleRepository,
} from "../../services/vehicle-repository";

type FleetStatusFilter = "all" | "available" | "booked";

type FleetFilter = {
  label: string;
  value: FleetStatusFilter;
  count: number;
  dotColor?: string;
};

function formatCurrency(value: number): string {
  return `PKR ${Math.round(value).toLocaleString()}`;
}

function normalizeSearchText(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

function getColorDot(color: string | null | undefined): string {
  const value = normalizeSearchText(color);

  if (value.includes("black")) return "#111827";
  if (value.includes("white")) return "#f8fafc";
  if (value.includes("silver")) return "#d1d5db";
  if (value.includes("gray") || value.includes("graphite")) return "#6b7280";
  if (value.includes("blue")) return "#2563eb";
  if (value.includes("red")) return "#dc2626";
  if (value.includes("green")) return "#16a34a";
  if (value.includes("gold")) return "#d97706";
  return "#cbd5e1";
}

function filterVehicles(
  vehicles: Vehicle[],
  query: string,
  statusFilter: FleetStatusFilter,
  typeFilter: string | null,
): Vehicle[] {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedTypeFilter = normalizeSearchText(typeFilter);

  let result = vehicles.filter((vehicle) => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "available" && Boolean(vehicle.is_available)) ||
      (statusFilter === "booked" && !vehicle.is_available);

    if (!matchesStatus) {
      return false;
    }

    if (
      normalizedTypeFilter &&
      normalizeSearchText(vehicle.type) !== normalizedTypeFilter
    ) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      vehicle.name,
      vehicle.type,
      vehicle.registration_number,
      vehicle.model_year,
      vehicle.color,
      vehicle.transmission,
      vehicle.fuel_type,
    ].some((value) => normalizeSearchText(value).includes(normalizedQuery));
  });

  if (normalizedQuery) {
    result = result.sort((left, right) => {
      const leftName = normalizeSearchText(left.name);
      const rightName = normalizeSearchText(right.name);
      const leftExact = leftName === normalizedQuery;
      const rightExact = rightName === normalizedQuery;
      if (leftExact && !rightExact) return -1;
      if (!leftExact && rightExact) return 1;

      const leftStarts = leftName.startsWith(normalizedQuery);
      const rightStarts = rightName.startsWith(normalizedQuery);
      if (leftStarts && !rightStarts) return -1;
      if (!leftStarts && rightStarts) return 1;

      return leftName.localeCompare(rightName);
    });
  }

  return result;
}

export default function CarsList() {
  const router = useRouter();
  const appTheme = useAppTheme();
  const layout = useResponsiveLayout();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => createStyles(appTheme, width, insets.bottom),
    [appTheme, insets.bottom, width],
  );
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FleetStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    const data = await VehicleRepository.getFleetVehicles();
    setVehicles(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadVehicles();
    }, [loadVehicles]),
  );

  const availableCount = useMemo(
    () => vehicles.filter((vehicle) => Boolean(vehicle.is_available)).length,
    [vehicles],
  );
  const bookedCount = vehicles.length - availableCount;
  const fleetFilters: FleetFilter[] = useMemo(
    () => [
      {
        label: "All",
        value: "all",
        count: vehicles.length,
        dotColor: appTheme.colors.primary,
      },
      {
        label: "Available",
        value: "available",
        count: availableCount,
        dotColor: appTheme.colors.success,
      },
      {
        label: "Booked",
        value: "booked",
        count: bookedCount,
        dotColor: appTheme.colors.warning,
      },
    ],
    [
      appTheme.colors.primary,
      appTheme.colors.success,
      appTheme.colors.warning,
      availableCount,
      bookedCount,
      vehicles.length,
    ],
  );

  const vehicleTypes = useMemo(() => {
    const typeSet = new Set<string>();
    vehicles.forEach((vehicle) => {
      const type = vehicle.type?.trim();
      if (type) {
        typeSet.add(type);
      }
    });

    return Array.from(typeSet).sort((left, right) => left.localeCompare(right));
  }, [vehicles]);

  const filteredVehicles = useMemo(
    () => filterVehicles(vehicles, searchQuery, statusFilter, typeFilter),
    [searchQuery, statusFilter, typeFilter, vehicles],
  );

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text numberOfLines={2} style={styles.title}>
          Cars
        </Text>
        <Text style={styles.subtitle}>Manage your premium car fleet</Text>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchField}>
          <Search
            color={appTheme.colors.textSubtle}
            size={styles.searchIcon.width}
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by car name, type, or registration..."
            placeholderTextColor={appTheme.colors.textSubtle}
            autoCapitalize="none"
            returnKeyType="search"
            style={styles.searchInput}
          />
        </View>
      </View>

      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusFilterContent}
        >
          {fleetFilters.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              activeOpacity={0.84}
              onPress={() => setStatusFilter(filter.value)}
              style={[
                styles.statusFilter,
                statusFilter === filter.value
                  ? styles.statusFilterActive
                  : null,
              ]}
            >
              {filter.dotColor ? (
                <View style={styles.statusDotWrap}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: filter.dotColor,
                      },
                    ]}
                  />
                </View>
              ) : null}
              <Text
                numberOfLines={1}
                style={[
                  styles.statusFilterText,
                  statusFilter === filter.value
                    ? styles.statusFilterTextActive
                    : null,
                ]}
              >
                {filter.label}
              </Text>
              <View
                style={[
                  styles.statusCountPill,
                  statusFilter === filter.value
                    ? styles.statusCountPillActive
                    : null,
                ]}
              >
                <Text
                  style={[
                    styles.statusFilterCount,
                    statusFilter === filter.value
                      ? styles.statusFilterTextActive
                      : null,
                  ]}
                >
                  {filter.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {vehicleTypes.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeFilterContent}
          >
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => setTypeFilter(null)}
              style={[
                styles.typeChip,
                !typeFilter ? styles.typeChipActive : null,
              ]}
            >
              <Text
                style={[
                  styles.typeChipText,
                  !typeFilter ? styles.typeChipTextActive : null,
                ]}
              >
                All Types
              </Text>
            </TouchableOpacity>
            {vehicleTypes.map((type) => (
              <TouchableOpacity
                key={type}
                activeOpacity={0.84}
                onPress={() => setTypeFilter(type)}
                style={[
                  styles.typeChip,
                  typeFilter === type ? styles.typeChipActive : null,
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.typeChipText,
                    typeFilter === type ? styles.typeChipTextActive : null,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loadingList}>
          <CarCardSkeleton />
          <CarCardSkeleton />
          <CarCardSkeleton />
        </View>
      ) : (
        <FlatList
          data={filteredVehicles}
          keyExtractor={(item) => item.id.toString()}
          numColumns={layout.isTablet ? 2 : 1}
          key={layout.isTablet ? "tablet" : "phone"}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={
            layout.isTablet ? styles.columnWrapper : undefined
          }
          renderItem={({ item }) => (
            <VehicleListCard
              appTheme={appTheme}
              vehicle={item}
              onPress={() => router.push(`/cars/${item.id}`)}
              styles={styles}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={CarFront}
              title="No cars found"
              message="Try changing your search or filter selection."
            />
          }
        />
      )}

      <TouchableOpacity
        activeOpacity={0.86}
        onPress={() => router.push("/owner/add-vehicle")}
        style={styles.floatingButton}
      >
        <LinearGradient
          colors={["#8a28ff", "#6d28f5", "#5b21d6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <CarFront
          color="#ffffff"
          size={styles.fabIcon.width}
          strokeWidth={2.3}
        />
        <View style={styles.fabPlus}>
          <Plus
            color="#ffffff"
            size={styles.fabPlusIcon.width}
            strokeWidth={2.7}
          />
        </View>
        <Text numberOfLines={1} style={styles.floatingButtonText}>
          Add Car
        </Text>
      </TouchableOpacity>
    </AppScreen>
  );
}

function VehicleListCard({
  appTheme,
  vehicle,
  onPress,
  styles,
}: {
  appTheme: AppTheme;
  vehicle: Vehicle;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const imageUris = getVehicleImageUris(vehicle);
  const primaryImage = imageUris[0];
  const colorName = vehicle.color || "Not set";
  const statusText = vehicle.is_available ? "Available" : "Booked";

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={styles.cardPress}
    >
      <View style={styles.vehicleCard}>
        <View style={styles.imageFrame}>
          {primaryImage ? (
            <Image
              source={{ uri: primaryImage }}
              style={styles.vehicleImage}
              contentFit="cover"
              transition={160}
            />
          ) : (
            <View style={styles.emptyImage}>
              <CarFront color={appTheme.colors.textSubtle} size={30} />
              <Text style={styles.emptyImageText}>No Image</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <View style={styles.titleBlock}>
              <Text numberOfLines={1} style={styles.vehicleTitle}>
                {vehicle.name}
              </Text>
              <Text numberOfLines={1} style={styles.vehicleSubtitle}>
                {[
                  vehicle.type,
                  vehicle.seats ? `${vehicle.seats} Seater` : null,
                ]
                  .filter(Boolean)
                  .join(" • ")}
              </Text>
              {vehicle.registration_number ? (
                <View style={styles.registrationRow}>
                  <Calendar
                    color={appTheme.colors.textMuted}
                    size={15}
                    strokeWidth={2.1}
                  />
                  <Text
                    selectable
                    numberOfLines={1}
                    style={styles.registrationText}
                  >
                    {vehicle.registration_number}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.cardActions}>
              <View
                style={[
                  styles.availabilityBadge,
                  vehicle.is_available
                    ? styles.availableBadge
                    : styles.bookedBadge,
                ]}
              >
                <Circle
                  color={
                    vehicle.is_available
                      ? appTheme.colors.success
                      : appTheme.colors.warning
                  }
                  fill={
                    vehicle.is_available
                      ? appTheme.colors.success
                      : appTheme.colors.warning
                  }
                  size={8}
                />
                <Text
                  style={[
                    styles.availabilityText,
                    vehicle.is_available
                      ? styles.availableText
                      : styles.bookedText,
                  ]}
                >
                  {statusText}
                </Text>
              </View>
              <MoreVertical
                color={appTheme.colors.slate}
                size={21}
                strokeWidth={2.4}
              />
            </View>
          </View>

          <View style={styles.infoPriceRow}>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text numberOfLines={1} style={styles.infoValue}>
                  {vehicle.model_year || "N/A"}
                </Text>
                <Text style={styles.infoLabel}>Year</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoItem}>
                <View style={styles.colorRow}>
                  <View
                    style={[
                      styles.colorDot,
                      {
                        backgroundColor: getColorDot(colorName),
                      },
                    ]}
                  />
                  <Text numberOfLines={1} style={styles.infoValue}>
                    {colorName}
                  </Text>
                </View>
                <Text style={styles.infoLabel}>Color</Text>
              </View>
            </View>

            <View style={styles.priceBlock}>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.64}
                numberOfLines={1}
                style={styles.dayPrice}
              >
                {formatCurrency(vehicle.price_per_day)}
                <Text style={styles.priceUnit}> /day</Text>
              </Text>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                numberOfLines={1}
                style={styles.hourPrice}
              >
                {formatCurrency(vehicle.price_per_hour || 0)} /hour
              </Text>
            </View>
          </View>

          <View style={styles.specRow}>
            <SpecItem
              icon={Settings}
              label={vehicle.transmission || "N/A"}
              styles={styles}
              color={appTheme.colors.textMuted}
            />
            <SpecItem
              icon={Armchair}
              label={`${vehicle.seats || 0} Seats`}
              styles={styles}
              color={appTheme.colors.textMuted}
            />
            <SpecItem
              icon={Fuel}
              label={vehicle.fuel_type || "N/A"}
              styles={styles}
              color={appTheme.colors.textMuted}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SpecItem({
  icon: Icon,
  label,
  styles,
  color,
}: {
  icon: typeof Settings;
  label: string;
  styles: ReturnType<typeof createStyles>;
  color: string;
}) {
  return (
    <View style={styles.specItem}>
      <Icon color={color} size={15} strokeWidth={2.1} />
      <Text numberOfLines={1} style={styles.specText}>
        {label}
      </Text>
    </View>
  );
}

function createStyles(appTheme: AppTheme, width: number, bottomInset: number) {
  const isTiny = width < 360;
  const isCompact = width < 380;
  const isNarrow = width < 520;
  const isTablet = width >= 768;
  const screenPadding = isTiny ? 14 : isCompact ? 16 : isTablet ? 28 : 20;
  const imageSize = isNarrow ? undefined : isTablet ? 210 : 255;
  const cardDirection = isNarrow ? "column" : "row";
  const floatingAction = getFloatingActionLayout(width, bottomInset);

  return StyleSheet.create({
    header: {
      paddingHorizontal: screenPadding,
      paddingTop: isCompact ? 16 : isTablet ? 28 : 22,
      paddingBottom: isCompact ? 12 : 16,
    },
    title: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 34 : isCompact ? 38 : isTablet ? 44 : 42,
      lineHeight: isTiny ? 40 : isCompact ? 46 : isTablet ? 52 : 50,
      fontWeight: "900",
      letterSpacing: 0,
    },
    subtitle: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 15 : isCompact ? 16 : isTablet ? 22 : 18,
      lineHeight: isTiny ? 21 : isCompact ? 23 : isTablet ? 30 : 25,
      fontWeight: "600",
      marginTop: 4,
    },
    searchWrap: {
      paddingHorizontal: screenPadding,
      paddingTop: 8,
    },
    searchField: {
      minHeight: isTiny ? 52 : isTablet ? 70 : 58,
      borderRadius: isTiny ? 18 : isTablet ? 24 : 20,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.glass,
      flexDirection: "row",
      alignItems: "center",
      gap: isTiny ? 10 : 14,
      paddingHorizontal: isTiny ? 14 : isTablet ? 24 : 18,
      boxShadow: appTheme.shadow.soft,
    },
    searchIcon: {
      width: isTiny ? 20 : isTablet ? 27 : 23,
      height: isTiny ? 20 : isTablet ? 27 : 23,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      color: appTheme.colors.text,
      fontSize: isTiny ? 14 : isTablet ? 20 : 16,
      fontWeight: "600",
      paddingVertical: 0,
    },
    filterSection: {
      paddingTop: isCompact ? 14 : 20,
      gap: isTiny ? 10 : 13,
    },
    statusFilterContent: {
      paddingHorizontal: screenPadding,
      paddingVertical: 2,
      gap: isTiny ? 9 : 12,
    },
    statusFilter: {
      minWidth: isTiny ? 126 : isTablet ? 188 : 156,
      minHeight: isTiny ? 52 : isTablet ? 68 : 58,
      borderRadius: isTiny ? 18 : 21,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.isDark
        ? "rgba(22, 33, 53, 0.84)"
        : "rgba(255, 255, 255, 0.88)",
      flexDirection: "row",
      alignItems: "center",
      gap: isTiny ? 7 : 9,
      paddingHorizontal: isTiny ? 12 : 16,
      boxShadow: appTheme.isDark
        ? "0 10px 24px rgba(0, 0, 0, 0.2)"
        : "0 10px 24px rgba(16, 24, 39, 0.07)",
    },
    statusFilterActive: {
      borderColor: appTheme.colors.primary,
      backgroundColor: appTheme.isDark
        ? "rgba(109, 40, 245, 0.22)"
        : "rgba(109, 40, 245, 0.08)",
      boxShadow: appTheme.isDark
        ? "0 14px 30px rgba(109, 40, 245, 0.18)"
        : "0 14px 30px rgba(109, 40, 245, 0.14)",
    },
    statusDotWrap: {
      width: isTiny ? 19 : 22,
      height: isTiny ? 19 : 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: appTheme.isDark
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(255, 255, 255, 0.9)",
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
    },
    statusDot: {
      width: isTiny ? 8 : 9,
      height: isTiny ? 8 : 9,
      borderRadius: 5,
    },
    statusFilterText: {
      flex: 1,
      minWidth: 0,
      color: appTheme.colors.slate,
      fontSize: isTiny ? 13 : isTablet ? 17 : 15,
      fontWeight: "800",
    },
    statusCountPill: {
      minWidth: isTiny ? 30 : 34,
      height: isTiny ? 26 : 28,
      borderRadius: 14,
      paddingHorizontal: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: appTheme.isDark
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(245, 247, 252, 0.95)",
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
    },
    statusCountPillActive: {
      backgroundColor: appTheme.isDark
        ? "rgba(109, 40, 245, 0.2)"
        : "rgba(109, 40, 245, 0.1)",
      borderColor: "rgba(109, 40, 245, 0.22)",
    },
    statusFilterCount: {
      color: appTheme.colors.slate,
      fontSize: isTiny ? 12 : isTablet ? 16 : 14,
      fontWeight: "900",
      fontVariant: ["tabular-nums"],
    },
    statusFilterTextActive: {
      color: "#6d28f5",
    },
    typeFilterContent: {
      paddingHorizontal: screenPadding,
      paddingVertical: 2,
      gap: isTiny ? 7 : 9,
    },
    typeChip: {
      minHeight: isTiny ? 38 : isTablet ? 46 : 42,
      borderRadius: appTheme.radius.pill,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.isDark
        ? "rgba(22, 33, 53, 0.84)"
        : "rgba(255, 255, 255, 0.9)",
      paddingHorizontal: isTiny ? 13 : isTablet ? 19 : 16,
      alignItems: "center",
      justifyContent: "center",
      boxShadow: appTheme.isDark
        ? "0 8px 18px rgba(0, 0, 0, 0.16)"
        : "0 8px 18px rgba(16, 24, 39, 0.05)",
    },
    typeChipActive: {
      borderColor: appTheme.colors.primary,
      backgroundColor: appTheme.colors.primary,
      boxShadow: "0 12px 24px rgba(109, 40, 245, 0.2)",
    },
    typeChipText: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 12 : isTablet ? 15 : 13,
      fontWeight: "800",
    },
    typeChipTextActive: {
      color: "#ffffff",
    },
    loadingList: {
      padding: screenPadding,
      gap: 14,
    },
    listContent: {
      paddingHorizontal: screenPadding,
      paddingTop: isCompact ? 14 : 18,
      paddingBottom: floatingAction.listBottomPadding,
      gap: isCompact ? 12 : 16,
    },
    columnWrapper: {
      gap: 16,
    },
    cardPress: {
      flex: 1,
      minWidth: 0,
    },
    vehicleCard: {
      flex: 1,
      flexDirection: cardDirection,
      overflow: "hidden",
      borderRadius: isTiny ? 18 : isTablet ? 24 : 21,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.glass,
      boxShadow: appTheme.shadow.card,
    },
    imageFrame: {
      width: imageSize,
      height: isNarrow ? (isTiny ? 178 : 210) : isTablet ? 180 : 216,
      borderRadius: isNarrow ? 0 : isTablet ? 20 : 18,
      margin: isNarrow ? 0 : isTablet ? 16 : 18,
      overflow: "hidden",
      backgroundColor: appTheme.colors.surfaceMuted,
    },
    vehicleImage: {
      width: "100%",
      height: "100%",
    },
    emptyImage: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    emptyImageText: {
      color: appTheme.colors.textSubtle,
      fontSize: 12,
      fontWeight: "800",
    },
    cardBody: {
      flex: 1,
      minWidth: 0,
      paddingHorizontal: isNarrow ? (isTiny ? 14 : 16) : 0,
      paddingTop: isNarrow ? 14 : isTablet ? 16 : 18,
      paddingRight: isNarrow ? (isTiny ? 14 : 16) : isTablet ? 16 : 18,
      paddingBottom: isTiny ? 14 : 16,
      gap: isTiny ? 12 : 14,
    },
    cardTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    titleBlock: {
      flex: 1,
      minWidth: 0,
    },
    vehicleTitle: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 19 : isTablet ? 22 : 22,
      lineHeight: isTiny ? 24 : isTablet ? 28 : 27,
      fontWeight: "900",
      letterSpacing: 0,
    },
    vehicleSubtitle: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 13 : isTablet ? 15 : 14,
      fontWeight: "700",
      marginTop: 3,
    },
    registrationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginTop: 9,
    },
    registrationText: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 13 : isTablet ? 15 : 14,
      fontWeight: "800",
    },
    cardActions: {
      alignItems: "flex-end",
      gap: 9,
    },
    availabilityBadge: {
      minHeight: isTiny ? 34 : 38,
      borderRadius: appTheme.radius.pill,
      paddingHorizontal: isTiny ? 10 : 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    availableBadge: {
      backgroundColor: appTheme.colors.successSoft,
    },
    bookedBadge: {
      backgroundColor: appTheme.colors.warningSoft,
    },
    availabilityText: {
      fontSize: isTiny ? 12 : 14,
      fontWeight: "900",
    },
    availableText: {
      color: appTheme.colors.success,
    },
    bookedText: {
      color: appTheme.colors.warning,
    },
    infoPriceRow: {
      flexDirection: isTiny ? "column" : "row",
      alignItems: isTiny ? "stretch" : "center",
      justifyContent: "space-between",
      gap: isTiny ? 12 : 16,
    },
    infoGrid: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: isTiny ? 10 : 16,
    },
    infoItem: {
      flex: 1,
      minWidth: 0,
    },
    infoValue: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 14 : 15,
      fontWeight: "800",
    },
    infoLabel: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 11 : 12,
      fontWeight: "700",
      marginTop: 4,
    },
    infoDivider: {
      width: 1,
      alignSelf: "stretch",
      backgroundColor: appTheme.colors.borderSoft,
    },
    colorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minWidth: 0,
    },
    colorDot: {
      width: 15,
      height: 15,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: appTheme.colors.borderSoft,
    },
    priceBlock: {
      minWidth: isTiny ? undefined : 138,
      maxWidth: isTiny ? undefined : 178,
      alignItems: isTiny ? "flex-start" : "flex-end",
    },
    dayPrice: {
      color: "#6d28f5",
      fontSize: isTiny ? 17 : isTablet ? 19 : 18,
      fontWeight: "900",
      fontVariant: ["tabular-nums"],
      textAlign: isTiny ? "left" : "right",
    },
    priceUnit: {
      fontSize: isTiny ? 12 : 13,
      fontWeight: "800",
    },
    hourPrice: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 13 : 14,
      fontWeight: "700",
      marginTop: 7,
      fontVariant: ["tabular-nums"],
      textAlign: isTiny ? "left" : "right",
    },
    specRow: {
      borderTopWidth: 1,
      borderTopColor: appTheme.colors.borderSoft,
      paddingTop: isTiny ? 10 : 12,
      flexDirection: "row",
      alignItems: "center",
      gap: isTiny ? 8 : 10,
    },
    specItem: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    specText: {
      flex: 1,
      minWidth: 0,
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 11 : 13,
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
      gap: isTiny ? 3 : 5,
      boxShadow: "0 20px 40px rgba(109, 40, 245, 0.34)",
    },
    fabIcon: {
      width: isTiny ? 25 : isTablet ? 34 : 29,
      height: isTiny ? 25 : isTablet ? 34 : 29,
    },
    fabPlus: {
      position: "absolute",
      top: isTiny ? 25 : isTablet ? 34 : 30,
      right: isTiny ? 25 : isTablet ? 34 : 28,
      width: isTiny ? 15 : isTablet ? 19 : 17,
      height: isTiny ? 15 : isTablet ? 19 : 17,
      borderRadius: 10,
      backgroundColor: "rgba(255, 255, 255, 0.16)",
      alignItems: "center",
      justifyContent: "center",
    },
    fabPlusIcon: {
      width: isTiny ? 12 : isTablet ? 16 : 14,
      height: isTiny ? 12 : isTablet ? 16 : 14,
    },
    floatingButtonText: {
      color: "#ffffff",
      fontSize: isTiny ? 12 : isTablet ? 16 : 14,
      fontWeight: "900",
    },
  });
}
