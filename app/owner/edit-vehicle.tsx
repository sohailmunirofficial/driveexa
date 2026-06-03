import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Save } from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  VehicleForm,
  VehicleFormState,
  validateVehicleForm,
} from "../../components/vehicle-form";
import { ActionSheet } from "../../components/ui/action-sheet";
import { AppScreen, Button, IconButton } from "../../components/ui/primitives";
import { AppTheme, useAppTheme } from "../../components/ui/theme";
import {
  getVehicleImageUris,
  VehicleRepository,
} from "../../services/vehicle-repository";

function getRouteId(id: string | string[] | undefined): number | null {
  const value = Array.isArray(id) ? id[0] : id;
  const numericId = Number(value);
  return Number.isFinite(numericId) ? numericId : null;
}

export default function EditVehicle() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const vehicleId = getRouteId(id);
  const appTheme = useAppTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(
    () => createStyles(appTheme, width),
    [appTheme, width],
  );
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [form, setForm] = useState<VehicleFormState>({
    name: "",
    type: "",
    registrationNumber: "",
    modelYear: new Date().getFullYear().toString(),
    color: "",
    price: "",
    pricePerHour: "",
    image_urls: [],
    transmission: "Automatic",
    seats: "5",
    fuel: "Petrol",
    description: "",
    isAvailable: true,
  });

  const alertSheetRef = useRef<BottomSheetModal>(null);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    status: "success" | "error" | "info";
    onConfirm?: () => void;
  }>({ title: "", message: "", status: "info" });

  const showAlert = (
    title: string,
    message: string,
    status: "success" | "error" | "info",
    onConfirm?: () => void,
  ) => {
    setAlertConfig({ title, message, status, onConfirm });
    alertSheetRef.current?.present();
  };

  const loadVehicle = useCallback(async () => {
    if (!vehicleId) {
      setInitialLoading(false);
      showAlert("Error", "Invalid vehicle selected.", "error", () =>
        router.back(),
      );
      return;
    }

    const data = await VehicleRepository.getVehicleById(vehicleId);
    if (data) {
      setForm({
        name: data.name,
        type: data.type,
        registrationNumber: data.registration_number || "",
        modelYear: data.model_year || new Date().getFullYear().toString(),
        color: data.color || "",
        price: data.price_per_day.toString(),
        pricePerHour: (data.price_per_hour || 0).toString(),
        image_urls: getVehicleImageUris(data),
        transmission: data.transmission || "Automatic",
        seats: (data.seats || 5).toString(),
        fuel: data.fuel_type || "Petrol",
        description: data.description || "",
        isAvailable: Boolean(data.is_available),
      });
    } else {
      showAlert("Error", "Vehicle not found.", "error", () => router.back());
    }
    setInitialLoading(false);
  }, [router, vehicleId]);

  useFocusEffect(
    useCallback(() => {
      void loadVehicle();
    }, [loadVehicle]),
  );

  const handleSave = async () => {
    if (!vehicleId) {
      showAlert("Error", "Invalid vehicle selected.", "error");
      return;
    }

    const validationError = validateVehicleForm(form);
    if (validationError) {
      showAlert("Missing Details", validationError, "error");
      return;
    }

    setLoading(true);

    const result = await VehicleRepository.updateVehicle(vehicleId, {
      name: form.name.trim(),
      type: form.type.trim(),
      registration_number: form.registrationNumber.trim(),
      model_year: form.modelYear,
      color: form.color.trim(),
      price_per_day: Number(form.price),
      price_per_hour: Number(form.pricePerHour),
      image_urls: form.image_urls,
      transmission: form.transmission,
      seats: Number(form.seats),
      fuel_type: form.fuel,
      description: form.description.trim(),
      is_available: form.isAvailable ? 1 : 0,
    });

    setLoading(false);
    if (result) {
      showAlert("Saved", "Vehicle updated successfully.", "success", () =>
        router.back(),
      );
    } else {
      showAlert("Error", "Failed to update vehicle.", "error");
    }
  };

  if (initialLoading) {
    return (
      <AppScreen style={styles.centered}>
        <ActivityIndicator color={appTheme.colors.primary} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View style={styles.topBar}>
        <IconButton
          icon={ArrowLeft}
          color={appTheme.colors.slate}
          backgroundColor={appTheme.colors.glass}
          borderColor={appTheme.colors.borderSoft}
          onPress={() => router.back()}
          size={styles.backIcon.width}
        />
        <Text numberOfLines={1} style={styles.brand}>
          Drive<Text style={styles.brandAccent}>x</Text>a
        </Text>
        <View style={styles.topSpacer} />
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <Text numberOfLines={2} style={styles.title}>
            Edit Vehicle
          </Text>
          <Text style={styles.subtitle}>
            Update accurate details for this fleet listing
          </Text>
        </View>

        <VehicleForm form={form} onChange={setForm} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          title="Save Vehicle"
          icon={Save}
          onPress={handleSave}
          loading={loading}
          disabled={loading}
          style={styles.saveButton}
        />
      </View>

      <ActionSheet
        sheetRef={alertSheetRef}
        title={alertConfig.title}
        message={alertConfig.message}
        status={alertConfig.status}
        actions={[
          {
            label: "OK",
            onPress: () => alertConfig.onConfirm?.(),
          },
        ]}
      />
    </AppScreen>
  );
}

function createStyles(appTheme: AppTheme, width: number) {
  const isTiny = width < 360;
  const isCompact = width < 380;
  const isTablet = width >= 768;
  const screenPadding = isTiny ? 14 : isCompact ? 18 : isTablet ? 34 : 22;

  return StyleSheet.create({
    centered: {
      alignItems: "center",
      justifyContent: "center",
    },
    topBar: {
      paddingHorizontal: screenPadding,
      paddingTop: isCompact ? 12 : isTablet ? 20 : 16,
      paddingBottom: isCompact ? 12 : 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
    },
    backIcon: {
      width: isTiny ? 19 : isTablet ? 26 : 22,
      height: isTiny ? 19 : isTablet ? 26 : 22,
    },
    brand: {
      flex: 1,
      color: appTheme.colors.text,
      textAlign: "center",
      fontSize: isTiny ? 27 : isTablet ? 42 : 32,
      lineHeight: isTiny ? 34 : isTablet ? 50 : 39,
      fontWeight: "900",
      letterSpacing: 0,
    },
    brandAccent: {
      color: "#6d28f5",
    },
    topSpacer: {
      width: isTiny ? 42 : 48,
      height: isTiny ? 42 : 48,
    },
    content: {
      paddingHorizontal: screenPadding,
      paddingTop: isCompact ? 10 : 16,
      paddingBottom: isCompact ? 132 : 150,
      gap: isCompact ? 18 : isTablet ? 28 : 22,
    },
    hero: {
      alignItems: "center",
      gap: isCompact ? 8 : 10,
      paddingHorizontal: isCompact ? 4 : 12,
    },
    title: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 30 : isTablet ? 46 : 38,
      lineHeight: isTiny ? 38 : isTablet ? 56 : 47,
      fontWeight: "900",
      letterSpacing: 0,
      textAlign: "center",
    },
    subtitle: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 14 : isTablet ? 22 : 17,
      lineHeight: isTiny ? 20 : isTablet ? 30 : 24,
      fontWeight: "600",
      textAlign: "center",
    },
    bottomBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: screenPadding,
      paddingTop: isCompact ? 14 : 18,
      paddingBottom: isCompact ? 16 : 24,
      backgroundColor: appTheme.colors.glass,
      borderTopLeftRadius: isCompact ? 24 : 30,
      borderTopRightRadius: isCompact ? 24 : 30,
      borderTopWidth: 1,
      borderTopColor: appTheme.colors.borderSoft,
      boxShadow: appTheme.shadow.soft,
    },
    saveButton: {
      minHeight: isTiny ? 54 : isTablet ? 72 : 60,
      borderRadius: isTiny ? 16 : isTablet ? 22 : 18,
    },
  });
}
