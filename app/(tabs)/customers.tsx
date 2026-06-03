import { ListItemSkeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Calendar,
  CarFront,
  CheckCircle2,
  IdCard,
  MoreVertical,
  Phone,
  Search,
  SlidersHorizontal,
  User,
  WalletCards,
} from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppScreen, EmptyState } from "../../components/ui/primitives";
import { AppTheme, useAppTheme } from "../../components/ui/theme";
import {
  Customer,
  CustomerRepository,
} from "../../services/customer-repository";

const purple = "#6d28f5";
const purpleSoft = "#f0e8ff";

function formatCurrency(value?: number): string {
  return `PKR ${Math.round(value ?? 0).toLocaleString()}`;
}

function formatJoinedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Joined recently";
  }

  return `Joined ${date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
}

export default function CustomersScreen() {
  const router = useRouter();
  const appTheme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const styles = useMemo(
    () => createStyles(appTheme, width, insets.bottom),
    [appTheme, insets.bottom, width],
  );
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [onlyWithUpcoming, setOnlyWithUpcoming] = useState(false);
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);
  const filterSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["30%"], []);

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

  const loadCustomers = useCallback(
    async (query = searchQuery, upcomingOnly = onlyWithUpcoming) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);

      const [count, records] = await Promise.all([
        CustomerRepository.countCustomers({
          searchQuery: query,
          onlyWithUpcoming: upcomingOnly,
        }),
        CustomerRepository.getAllCustomers({
          limit: 100,
          searchQuery: query,
          onlyWithUpcoming: upcomingOnly,
        }),
      ]);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setTotalCustomers(count);
      setCustomers(records);
      setLoading(false);
    },
    [onlyWithUpcoming, searchQuery],
  );

  useFocusEffect(
    useCallback(() => {
      void loadCustomers();
    }, [loadCustomers]),
  );

  const handleSearch = useCallback(
    (value: string) => {
      setSearchQuery(value);
      void loadCustomers(value, onlyWithUpcoming);
    },
    [loadCustomers, onlyWithUpcoming],
  );

  const toggleUpcomingFilter = useCallback(() => {
    const nextValue = !onlyWithUpcoming;
    setOnlyWithUpcoming(nextValue);
    filterSheetRef.current?.dismiss();
    void loadCustomers(searchQuery, nextValue);
  }, [loadCustomers, onlyWithUpcoming, searchQuery]);

  const renderCustomerItem = useCallback(
    ({ item }: { item: Customer }) => (
      <CustomerCard
        customer={item}
        styles={styles}
        onPress={() => router.push(`/customer/${item.id}`)}
      />
    ),
    [router, styles],
  );

  return (
    <AppScreen style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text numberOfLines={2} style={styles.title}>
            Customers
          </Text>
          <Text numberOfLines={2} style={styles.subtitle}>
            Manage your customers and their details
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={() => router.push("/customer/create")}
          style={styles.headerAddButton}
        >
          <LinearGradient
            colors={["#fbf8ff", "#f0e7ff", "#e8dcff"]}
            style={StyleSheet.absoluteFill}
          />
          <User color={purple} size={25} strokeWidth={0} />
          <Text style={styles.addGlyph}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Search color={appTheme.colors.textSubtle} size={24} strokeWidth={2} />
        <TextInput
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Search customers by name, phone or CNIC..."
          placeholderTextColor={appTheme.colors.textSubtle}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.searchInput}
        />
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => filterSheetRef.current?.present()}
          style={styles.searchIconButton}
        >
          <SlidersHorizontal
            color={onlyWithUpcoming ? purple : appTheme.colors.textMuted}
            size={24}
            strokeWidth={2.1}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.countRow}>
        <Text style={styles.countLabel}>Total Customers</Text>
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>
            {totalCustomers.toLocaleString()}
          </Text>
        </View>
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
          data={customers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCustomerItem}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon={User}
              title="No customers found"
              message="Try a different search or add a new customer record."
            />
          }
        />
      )}

      <BottomSheetModal
        ref={filterSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: appTheme.colors.surface }}
        handleIndicatorStyle={{ backgroundColor: appTheme.colors.border }}
      >
        <BottomSheetView style={styles.sheet}>
          <Text style={styles.sheetTitle}>Filters</Text>
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={toggleUpcomingFilter}
            style={styles.filterOption}
          >
            <View>
              <Text style={styles.filterTitle}>
                Only with upcoming bookings
              </Text>
              <Text style={styles.filterSubtitle}>
                Show customers with active future rentals.
              </Text>
            </View>
            <View
              style={[
                styles.filterToggle,
                onlyWithUpcoming ? styles.filterToggleActive : null,
              ]}
            >
              {onlyWithUpcoming ? <View style={styles.filterDot} /> : null}
            </View>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
    </AppScreen>
  );
}

function CustomerCard({
  customer,
  styles,
  onPress,
}: {
  customer: Customer;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  const hasLicense = Boolean(
    customer.license_image_url && customer.license_back_image_url,
  );
  const hasCnic = Boolean(
    customer.cnic_image_url && customer.cnic_back_image_url,
  );

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.cardTop}>
        <UserAvatar name={customer.name} size={76} style={styles.avatar} />
        <View style={styles.identityColumn}>
          <Text numberOfLines={1} style={styles.customerName}>
            {customer.name}
          </Text>
          <View style={styles.metaLine}>
            <Phone color="#66748c" size={20} strokeWidth={2.1} />
            <Text numberOfLines={1} style={styles.metaText}>
              {customer.phone}
            </Text>
          </View>
          <View style={styles.metaLine}>
            <IdCard color="#66748c" size={20} strokeWidth={2.1} />
            <Text numberOfLines={1} style={styles.metaText}>
              CNIC: {customer.cnic || "Not added"}
            </Text>
          </View>
        </View>
        <View style={styles.badgeColumn}>
          <View style={styles.badgeRow}>
            <DocumentBadge
              label="License"
              complete={hasLicense}
              styles={styles}
            />
            <DocumentBadge label="CNIC" complete={hasCnic} styles={styles} />
          </View>
          <MoreVertical color="#263653" size={25} strokeWidth={2.6} />
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatItem
          icon={Calendar}
          label={formatJoinedDate(customer.created_at)}
          styles={styles}
        />
        <View style={styles.statDivider} />
        <StatItem
          icon={CarFront}
          label={`Total Bookings ${customer.total_bookings ?? 0}`}
          styles={styles}
        />
        <View style={styles.statDivider} />
        <StatItem
          icon={WalletCards}
          label={`Total Spent  ${formatCurrency(customer.total_spent)}`}
          styles={styles}
        />
      </View>
    </TouchableOpacity>
  );
}

function DocumentBadge({
  label,
  complete,
  styles,
}: {
  label: string;
  complete: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={[styles.docBadge, complete ? null : styles.docBadgeMissing]}>
      <IdCard
        color={complete ? "#078d61" : "#66748c"}
        size={17}
        strokeWidth={2}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.docBadgeText,
          complete ? null : styles.docBadgeTextMuted,
        ]}
      >
        {label}
      </Text>
      {complete ? (
        <CheckCircle2
          color="#10a56b"
          fill="#10a56b"
          size={16}
          strokeWidth={1.8}
        />
      ) : null}
    </View>
  );
}

function StatItem({
  icon: Icon,
  label,
  styles,
}: {
  icon: typeof Calendar;
  label: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.statItem}>
      <Icon color="#66748c" size={19} strokeWidth={2.1} />
      <Text numberOfLines={1} style={styles.statText}>
        {label}
      </Text>
    </View>
  );
}

function createStyles(appTheme: AppTheme, width: number, bottomInset: number) {
  const isTiny = width < 360;
  const isCompact = width < 420;
  const isNarrow = width < 760;
  const horizontalPadding = isTiny ? 14 : isCompact ? 16 : 28;
  const cardPadding = isTiny ? 14 : isCompact ? 16 : 24;

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: appTheme.colors.background,
      paddingTop: 12,
    },
    header: {
      paddingHorizontal: horizontalPadding,
      paddingTop: isCompact ? 8 : 18,
      paddingBottom: isCompact ? 18 : 26,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 16,
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
      gap: 8,
    },
    title: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 32 : isCompact ? 38 : 46,
      lineHeight: isTiny ? 39 : isCompact ? 45 : 54,
      fontWeight: "900",
      letterSpacing: 0,
    },
    subtitle: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 16 : isCompact ? 18 : 24,
      lineHeight: isTiny ? 22 : isCompact ? 24 : 31,
      fontWeight: "600",
    },
    headerAddButton: {
      width: isTiny ? 56 : isCompact ? 64 : 74,
      height: isTiny ? 56 : isCompact ? 64 : 74,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      boxShadow: appTheme.shadow.soft,
    },
    addGlyph: {
      position: "absolute",
      color: purple,
      fontSize: isTiny ? 35 : 40,
      lineHeight: isTiny ? 42 : 48,
      fontWeight: "300",
      marginTop: -1,
    },
    searchBar: {
      minHeight: isCompact ? 60 : 78,
      marginHorizontal: horizontalPadding,
      borderRadius: isCompact ? 22 : 28,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.glass,
      paddingLeft: isCompact ? 17 : 24,
      paddingRight: isCompact ? 8 : 12,
      flexDirection: "row",
      alignItems: "center",
      gap: isCompact ? 11 : 18,
      boxShadow: appTheme.shadow.soft,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      color: appTheme.colors.text,
      fontSize: isTiny ? 15 : isCompact ? 17 : 21,
      fontWeight: "600",
      paddingVertical: 0,
    },
    searchIconButton: {
      width: isCompact ? 44 : 54,
      height: isCompact ? 44 : 54,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    countRow: {
      paddingHorizontal: horizontalPadding + 4,
      paddingTop: isCompact ? 24 : 32,
      paddingBottom: isCompact ? 16 : 22,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    countLabel: {
      color: appTheme.colors.slate,
      fontSize: isTiny ? 16 : isCompact ? 18 : 21,
      fontWeight: "700",
    },
    countPill: {
      minWidth: isCompact ? 72 : 92,
      minHeight: isCompact ? 35 : 40,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      backgroundColor: purpleSoft,
    },
    countPillText: {
      color: purple,
      fontSize: isTiny ? 16 : isCompact ? 18 : 20,
      fontWeight: "900",
    },
    loadingList: {
      paddingHorizontal: horizontalPadding,
      gap: 14,
    },
    listContent: {
      paddingHorizontal: horizontalPadding,
      paddingBottom: Math.max(bottomInset, 16) + 106,
      gap: isCompact ? 14 : 18,
    },
    card: {
      borderRadius: isCompact ? 22 : 26,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.glass,
      padding: cardPadding,
      gap: isCompact ? 16 : 22,
      boxShadow: appTheme.shadow.card,
    },
    cardTop: {
      flexDirection: isNarrow ? "column" : "row",
      alignItems: isNarrow ? "stretch" : "center",
      gap: isCompact ? 16 : 22,
    },
    avatar: {
      alignSelf: isNarrow ? "flex-start" : "center",
      borderColor: "#e2d4ff",
    },
    identityColumn: {
      flex: 1,
      minWidth: 0,
      gap: isCompact ? 8 : 10,
    },
    customerName: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 22 : isCompact ? 24 : 29,
      lineHeight: isTiny ? 29 : isCompact ? 32 : 37,
      fontWeight: "900",
      letterSpacing: 0,
    },
    metaLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      minWidth: 0,
    },
    metaText: {
      flex: 1,
      minWidth: 0,
      color: appTheme.colors.slate,
      fontSize: isTiny ? 15 : isCompact ? 17 : 20,
      lineHeight: isTiny ? 22 : isCompact ? 24 : 27,
      fontWeight: "600",
    },
    badgeColumn: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 14,
      minWidth: isNarrow ? 0 : 320,
    },
    badgeRow: {
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: isNarrow ? "flex-start" : "flex-end",
      gap: 12,
    },
    docBadge: {
      minHeight: isCompact ? 39 : 43,
      maxWidth: isCompact ? 126 : 150,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: "#cbeadd",
      backgroundColor: "#eaf9f1",
      paddingHorizontal: isCompact ? 10 : 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    docBadgeMissing: {
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.surfaceMuted,
    },
    docBadgeText: {
      color: "#078d61",
      fontSize: isTiny ? 13 : isCompact ? 14 : 17,
      fontWeight: "800",
      minWidth: 0,
    },
    docBadgeTextMuted: {
      color: appTheme.colors.textMuted,
    },
    statsRow: {
      borderTopWidth: 1,
      borderTopColor: appTheme.colors.borderSoft,
      paddingTop: isCompact ? 14 : 18,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: isCompact ? 10 : 16,
    },
    statItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minWidth: isNarrow ? "44%" : 0,
      flexShrink: 1,
    },
    statText: {
      color: appTheme.colors.slate,
      fontSize: isTiny ? 12 : isCompact ? 13 : 16,
      fontWeight: "600",
      minWidth: 0,
      flexShrink: 1,
    },
    statDivider: {
      width: 1,
      height: 20,
      backgroundColor: appTheme.colors.border,
      display: isNarrow ? "none" : "flex",
    },
    sheet: {
      paddingHorizontal: horizontalPadding,
      paddingTop: 8,
      gap: 18,
    },
    sheetTitle: {
      color: appTheme.colors.text,
      fontSize: 22,
      fontWeight: "900",
    },
    filterOption: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.surfaceRaised,
      padding: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 18,
    },
    filterTitle: {
      color: appTheme.colors.text,
      fontSize: 16,
      fontWeight: "900",
    },
    filterSubtitle: {
      color: appTheme.colors.textMuted,
      fontSize: 13,
      fontWeight: "600",
      marginTop: 4,
    },
    filterToggle: {
      width: 27,
      height: 27,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: appTheme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    filterToggleActive: {
      borderColor: purple,
      backgroundColor: purple,
    },
    filterDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      backgroundColor: "#ffffff",
    },
  });
}
