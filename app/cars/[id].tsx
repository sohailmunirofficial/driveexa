import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import {
  ArrowLeft,
  Calendar,
  CarFront,
  CheckCircle,
  Edit,
  Fuel,
  Settings,
  Trash2,
  User,
} from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ActionSheet } from "../../components/ui/action-sheet";
import {
  AmountText,
  AppScreen,
  Button,
  Card,
  IconButton,
  SectionHeader,
  StatusBadge,
} from "../../components/ui/primitives";
import { AppTheme, useAppTheme } from "../../components/ui/theme";
import { Booking, BookingRepository } from "../../services/booking-repository";
import {
  getVehicleImageUris,
  Vehicle,
  VehicleRepository,
} from "../../services/vehicle-repository";

export default function CarDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);

  const alertSheetRef = useRef<BottomSheetModal>(null);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    status: "success" | "error" | "info" | "question";
    onConfirm?: () => void;
  }>({ title: "", message: "", status: "info" });

  const showAlert = (
    title: string,
    message: string,
    status: "success" | "error" | "info" | "question",
    onConfirm?: () => void,
  ) => {
    setAlertConfig({ title, message, status, onConfirm });
    alertSheetRef.current?.present();
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [vehicleData, bookingsData] = await Promise.all([
      VehicleRepository.getVehicleById(Number(id)),
      BookingRepository.getUpcomingBookings({
        vehicleId: Number(id),
      }),
    ]);
    setVehicle(vehicleData);
    setUpcomingBookings(bookingsData);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (id) {
        void loadData();
      }
    }, [id, loadData]),
  );

  const handleDelete = () => {
    showAlert(
      "Delete Vehicle",
      "Are you sure you want to remove this vehicle? This action cannot be undone.",
      "question",
      async () => {
        if (vehicle) {
          await VehicleRepository.deleteVehicle(vehicle.id);
          router.replace("/cars");
        }
      },
    );
  };

  if (loading) {
    return (
      <AppScreen style={styles.centered}>
        <ActivityIndicator size="large" color={appTheme.colors.primary} />
      </AppScreen>
    );
  }

  if (!vehicle) {
    return (
      <AppScreen style={styles.centered}>
        <Card style={styles.notFoundCard}>
          <Text style={styles.notFoundTitle}>Vehicle not found</Text>
          <Button
            title="Go Back"
            variant="secondary"
            onPress={() => router.back()}
          />
        </Card>
      </AppScreen>
    );
  }

  const imageUris = getVehicleImageUris(vehicle);
  const primaryImage = imageUris[0];

  return (
    <AppScreen>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          {primaryImage ? (
            <Image
              source={{ uri: primaryImage }}
              style={styles.heroImage}
              contentFit="cover"
              transition={180}
            />
          ) : (
            <View style={styles.heroEmpty}>
              <CarFront color={appTheme.colors.textSubtle} size={64} />
            </View>
          )}
          <LinearGradient
            colors={["rgba(7,17,31,0.1)", "rgba(7,17,31,0.8)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroTop}>
            <IconButton
              icon={ArrowLeft}
              color="#ffffff"
              backgroundColor="rgba(255,255,255,0.18)"
              borderColor="rgba(255,255,255,0.22)"
              onPress={() => router.back()}
            />
            <View style={styles.heroActions}>
              <IconButton
                icon={Edit}
                color="#ffffff"
                backgroundColor="rgba(255,255,255,0.18)"
                borderColor="rgba(255,255,255,0.22)"
                onPress={() =>
                  router.push({
                    pathname: "/owner/edit-vehicle",
                    params: { id: vehicle.id },
                  })
                }
              />
              <IconButton
                icon={Trash2}
                color="#ffffff"
                backgroundColor="rgba(220,38,38,0.72)"
                borderColor="rgba(255,255,255,0.18)"
                onPress={handleDelete}
              />
            </View>
          </View>
          <View style={styles.heroCopy}>
            <StatusBadge
              label={vehicle.is_available ? "Available" : "Booked"}
              tone={vehicle.is_available ? "success" : "danger"}
            />
            <Text numberOfLines={2} style={styles.heroTitle}>
              {vehicle.name}
            </Text>
            <Text numberOfLines={1} style={styles.heroMeta}>
              {[vehicle.type, vehicle.registration_number, vehicle.color]
                .filter(Boolean)
                .join(" • ")}
            </Text>
          </View>
        </View>

        <Card style={styles.rateCard}>
          <View style={styles.rateItem}>
            <Text style={styles.rateLabel}>Daily Rate</Text>
            <AmountText
              value={vehicle.price_per_day.toLocaleString()}
              prefix="Rs "
              style={styles.rateAmount}
            />
          </View>
          <View style={styles.rateDivider} />
          <View style={styles.rateItem}>
            <Text style={styles.rateLabel}>Hourly Rate</Text>
            <AmountText
              value={(vehicle.price_per_hour || 0).toLocaleString()}
              prefix="Rs "
              style={styles.rateAmount}
            />
          </View>
        </Card>

        <Card style={styles.specCard}>
          <SectionHeader
            title="Vehicle Profile"
            subtitle="Core fleet details"
          />
          <View style={styles.specGrid}>
            <SpecItem
              label="Registration"
              value={vehicle.registration_number || "Not set"}
            />
            <SpecItem
              label="Model Year"
              value={vehicle.model_year || "Not set"}
            />
            <SpecItem label="Color" value={vehicle.color || "Not set"} />
            <SpecItem label="Seats" value={`${vehicle.seats || 0}`} />
          </View>
          <View style={styles.featureGrid}>
            <Feature
              icon={Settings}
              label={vehicle.transmission || "Transmission"}
            />
            <Feature icon={Fuel} label={vehicle.fuel_type || "Fuel"} />
            <Feature icon={CheckCircle} label={`${vehicle.seats || 0} seats`} />
          </View>
        </Card>

        {imageUris.length > 1 ? (
          <Card style={styles.galleryCard}>
            <SectionHeader
              title="Gallery"
              subtitle={`${imageUris.length.toLocaleString()} vehicle photos`}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryList}
            >
              {imageUris.map((uri) => (
                <Image
                  key={uri}
                  source={{ uri }}
                  style={styles.galleryImage}
                  contentFit="cover"
                  transition={160}
                />
              ))}
            </ScrollView>
          </Card>
        ) : null}

        <Card style={styles.descriptionCard}>
          <SectionHeader title="Description" />
          <Text style={styles.descriptionText}>
            {vehicle.description ||
              "No description available for this vehicle."}
          </Text>
        </Card>

        <Card style={styles.upcomingCard}>
          <SectionHeader
            title="Upcoming Bookings"
            subtitle={`${upcomingBookings.length.toLocaleString()} scheduled rentals`}
          />
          {upcomingBookings.length === 0 ? (
            <View style={styles.emptySchedule}>
              <Calendar color={appTheme.colors.textSubtle} size={24} />
              <Text style={styles.emptyScheduleText}>
                No future rentals scheduled
              </Text>
            </View>
          ) : (
            <View style={styles.bookingStack}>
              {upcomingBookings.map((booking) => (
                <View key={booking.id} style={styles.bookingCard}>
                  <TouchableOpacity
                    activeOpacity={0.86}
                    style={styles.bookingTop}
                    onPress={() => router.push(`/booking/${booking.id}`)}
                  >
                    <View style={styles.bookingIcon}>
                      <Calendar size={19} color={appTheme.colors.success} />
                    </View>
                    <View style={styles.bookingCopy}>
                      <Text style={styles.bookingTitle}>Rental Duration</Text>
                      <Text numberOfLines={1} style={styles.bookingDate}>
                        {new Date(booking.start_date).toLocaleDateString()} -{" "}
                        {new Date(booking.end_date).toLocaleDateString()}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.86}
                    onPress={() =>
                      router.push(`/customer/${booking.customer_id}`)
                    }
                    style={styles.customerLink}
                  >
                    <View style={styles.customerIcon}>
                      <User size={16} color={appTheme.colors.primary} />
                    </View>
                    <View style={styles.bookingCopy}>
                      <Text style={styles.customerLabel}>Customer</Text>
                      <Text numberOfLines={1} style={styles.customerName}>
                        {booking.customer_name}
                      </Text>
                    </View>
                    <Text style={styles.profileLink}>Profile</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>

      <View style={styles.bottomAction}>
        <Button
          title="Book Now"
          onPress={() =>
            router.push({
              pathname: "/booking/create",
              params: { carId: vehicle.id },
            })
          }
        />
      </View>

      <ActionSheet
        sheetRef={alertSheetRef}
        title={alertConfig.title}
        message={alertConfig.message}
        status={alertConfig.status}
        actions={[
          {
            label: alertConfig.status === "question" ? "Delete" : "OK",
            type: alertConfig.status === "question" ? "destructive" : "default",
            onPress: () => alertConfig.onConfirm?.(),
          },
          ...(alertConfig.status === "question"
            ? [{ label: "Cancel", type: "cancel" as const, onPress: () => {} }]
            : []),
        ]}
      />
    </AppScreen>
  );

  function SpecItem({ label, value }: { label: string; value: string }) {
    return (
      <View style={styles.specItem}>
        <Text style={styles.specLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.specValue}>
          {value}
        </Text>
      </View>
    );
  }

  function Feature({
    icon: Icon,
    label,
  }: {
    icon: typeof Settings;
    label: string;
  }) {
    return (
      <View style={styles.featureItem}>
        <Icon size={19} color={appTheme.colors.slate} />
        <Text numberOfLines={1} style={styles.featureLabel}>
          {label}
        </Text>
      </View>
    );
  }
}

function createStyles(appTheme: AppTheme) {
  return StyleSheet.create({
    centered: {
      alignItems: "center",
      justifyContent: "center",
      padding: appTheme.spacing.screen,
    },
    notFoundCard: {
      width: "100%",
      gap: 16,
    },
    notFoundTitle: {
      color: appTheme.colors.text,
      fontSize: 18,
      fontWeight: "900",
      textAlign: "center",
    },
    content: {
      padding: appTheme.spacing.screen,
      paddingBottom: 140,
      gap: 18,
    },
    hero: {
      minHeight: 330,
      borderRadius: appTheme.radius.xl,
      overflow: "hidden",
      backgroundColor: appTheme.colors.surfaceMuted,
      boxShadow: appTheme.shadow.glow,
    },
    heroImage: {
      ...StyleSheet.absoluteFill,
    },
    heroEmpty: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: appTheme.colors.surfaceMuted,
    },
    heroTop: {
      position: "absolute",
      top: 16,
      left: 16,
      right: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    heroActions: {
      flexDirection: "row",
      gap: 10,
    },
    heroCopy: {
      position: "absolute",
      left: 18,
      right: 18,
      bottom: 18,
      gap: 8,
    },
    heroTitle: {
      color: "#ffffff",
      fontSize: 32,
      fontWeight: "900",
      letterSpacing: 0,
    },
    heroMeta: {
      color: "rgba(255,255,255,0.78)",
      fontSize: 14,
      fontWeight: "800",
    },
    rateCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    rateItem: {
      flex: 1,
      minWidth: 0,
      gap: 6,
    },
    rateLabel: {
      color: appTheme.colors.textMuted,
      fontSize: 12,
      fontWeight: "900",
    },
    rateAmount: {
      fontSize: 22,
    },
    rateDivider: {
      width: 1,
      alignSelf: "stretch",
      backgroundColor: appTheme.colors.borderSoft,
    },
    specCard: {
      gap: 16,
    },
    specGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    specItem: {
      width: "48%",
      minHeight: 70,
      borderRadius: appTheme.radius.md,
      backgroundColor: appTheme.colors.surfaceRaised,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      padding: 12,
      justifyContent: "center",
      gap: 5,
    },
    specLabel: {
      color: appTheme.colors.textMuted,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    specValue: {
      color: appTheme.colors.text,
      fontSize: 15,
      fontWeight: "900",
    },
    featureGrid: {
      flexDirection: "row",
      gap: 10,
    },
    featureItem: {
      flex: 1,
      minWidth: 0,
      minHeight: 74,
      borderRadius: appTheme.radius.md,
      backgroundColor: appTheme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
      padding: 10,
      gap: 7,
    },
    featureLabel: {
      color: appTheme.colors.textMuted,
      fontSize: 12,
      fontWeight: "900",
      textAlign: "center",
    },
    galleryCard: {
      gap: 12,
    },
    galleryList: {
      gap: 10,
    },
    galleryImage: {
      width: 118,
      height: 88,
      borderRadius: appTheme.radius.md,
      backgroundColor: appTheme.colors.surfaceMuted,
    },
    descriptionCard: {
      gap: 4,
    },
    descriptionText: {
      color: appTheme.colors.textMuted,
      fontSize: 15,
      lineHeight: 23,
      fontWeight: "600",
    },
    upcomingCard: {
      gap: 14,
    },
    emptySchedule: {
      minHeight: 112,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.surfaceRaised,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    emptyScheduleText: {
      color: appTheme.colors.textMuted,
      fontSize: 14,
      fontWeight: "800",
    },
    bookingStack: {
      gap: 12,
    },
    bookingCard: {
      borderRadius: appTheme.radius.lg,
      backgroundColor: appTheme.colors.surfaceRaised,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      padding: 14,
      gap: 12,
    },
    bookingTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    bookingIcon: {
      width: 42,
      height: 42,
      borderRadius: appTheme.radius.md,
      backgroundColor: appTheme.colors.successSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    bookingCopy: {
      flex: 1,
      minWidth: 0,
    },
    bookingTitle: {
      color: appTheme.colors.text,
      fontSize: 15,
      fontWeight: "900",
    },
    bookingDate: {
      color: appTheme.colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 3,
    },
    customerLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: appTheme.radius.md,
      backgroundColor: appTheme.colors.surfaceMuted,
      padding: 12,
    },
    customerIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: appTheme.colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    customerLabel: {
      color: appTheme.colors.textMuted,
      fontSize: 11,
      fontWeight: "800",
    },
    customerName: {
      color: appTheme.colors.text,
      fontSize: 14,
      fontWeight: "900",
      marginTop: 2,
    },
    profileLink: {
      color: appTheme.colors.primary,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    bottomAction: {
      position: "absolute",
      left: appTheme.spacing.screen,
      right: appTheme.spacing.screen,
      bottom: 26,
    },
  });
}
