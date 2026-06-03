import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import DateTimePicker, {
  DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  CalendarPlus,
  CarFront,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  MoreHorizontal,
  Save,
  Search,
  ShieldCheck,
  UserPlus,
  WalletCards,
} from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionSheet } from "../../../components/ui/action-sheet";
import { AppScreen } from "../../../components/ui/primitives";
import { AppTheme, useAppTheme } from "../../../components/ui/theme";
import {
  calculateBookingPricing,
  calculateRentalQuantity,
  normalizeMoney,
} from "../../../services/booking-pricing";
import {
  Booking,
  BookingRepository,
} from "../../../services/booking-repository";
import {
  Customer,
  CustomerRepository,
} from "../../../services/customer-repository";
import {
  getVehicleImageUris,
  Vehicle,
  VehicleRepository,
} from "../../../services/vehicle-repository";

type PricingUnit = Booking["pricing_unit"];
type PickerTarget = "startDate" | "startTime" | "endDate" | "endTime";

type AlertConfig = {
  title: string;
  message: string;
  status: "success" | "error" | "info";
  onConfirm?: () => void;
};

const purple = "#6d28f5";

function parseAmountInput(value: string): number {
  const amount = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(amount) ? amount : 0;
}

function formatCurrency(value: number): string {
  return `PKR ${Math.round(value).toLocaleString()}`;
}

function formatDate(value: Date): string {
  return value.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: Date): string {
  return value.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mergeDatePart(current: Date, selected: Date): Date {
  const next = new Date(current);
  next.setFullYear(
    selected.getFullYear(),
    selected.getMonth(),
    selected.getDate(),
  );
  return next;
}

function mergeTimePart(current: Date, selected: Date): Date {
  const next = new Date(current);
  next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
  return next;
}

function addRentalUnit(date: Date, unit: PricingUnit): Date {
  const next = new Date(date);
  if (unit === "day") {
    next.setDate(next.getDate() + 1);
  } else {
    next.setHours(next.getHours() + 1);
  }
  return next;
}

function getVehicleBaseRate(
  booking: Booking | null,
  vehicle: Vehicle | null,
  unit: PricingUnit,
): number {
  const isOriginalVehicle = Boolean(
    booking && vehicle && booking.vehicle_id === vehicle.id,
  );

  if (
    isOriginalVehicle &&
    booking?.negotiated_unit_price &&
    booking.pricing_unit === unit
  ) {
    return booking.negotiated_unit_price;
  }

  if (
    isOriginalVehicle &&
    booking?.base_unit_price &&
    booking.pricing_unit === unit
  ) {
    return booking.base_unit_price;
  }

  if (!vehicle) {
    return 0;
  }

  return unit === "day" ? vehicle.price_per_day : vehicle.price_per_hour;
}

function getVehicleLabel(vehicle: Vehicle): string {
  return [
    vehicle.registration_number,
    vehicle.type,
    vehicle.transmission,
    vehicle.fuel_type,
  ]
    .filter(Boolean)
    .join("  •  ");
}

export default function EditBookingScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const appTheme = useAppTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => createStyles(appTheme, width, insets.bottom),
    [appTheme, insets.bottom, width],
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [activePicker, setActivePicker] = useState<PickerTarget | null>(null);
  const [pickerDraftDate, setPickerDraftDate] = useState(new Date());
  const [pricingUnit, setPricingUnit] = useState<PricingUnit>("day");
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountNote, setDiscountNote] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingStatus, setBookingStatus] =
    useState<Booking["status"]>("active");

  const alertSheetRef = useRef<BottomSheetModal>(null);
  const customerSheetRef = useRef<BottomSheetModal>(null);
  const vehicleSheetRef = useRef<BottomSheetModal>(null);
  const datePickerSheetRef = useRef<BottomSheetModal>(null);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    title: "",
    message: "",
    status: "info",
  });

  const isIos = process.env.EXPO_OS === "ios";
  const sheetSnapPoints = useMemo(() => ["65%", "88%"], []);
  const dateSheetSnapPoints = useMemo(() => ["42%"], []);
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    [],
  );
  const baseUnitPrice = getVehicleBaseRate(booking, vehicle, pricingUnit);
  const quantity = calculateRentalQuantity(startDate, endDate, pricingUnit);
  const pricing = calculateBookingPricing({
    baseUnitPrice,
    negotiatedUnitPrice: baseUnitPrice,
    quantity,
    discountAmount: parseAmountInput(discountAmount),
    advanceAmount: parseAmountInput(advanceAmount),
  });

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();

    if (!query) {
      return customers;
    }

    return customers.filter((customer) =>
      [customer.name, customer.phone, customer.cnic].some((value) =>
        (value || "").toLowerCase().includes(query),
      ),
    );
  }, [customerSearch, customers]);

  const filteredVehicles = useMemo(() => {
    const query = vehicleSearch.trim().toLowerCase();

    if (!query) {
      return vehicles;
    }

    return vehicles.filter((fleetVehicle) =>
      [
        fleetVehicle.name,
        fleetVehicle.type,
        fleetVehicle.registration_number,
        fleetVehicle.transmission,
        fleetVehicle.fuel_type,
      ].some((value) => (value || "").toLowerCase().includes(query)),
    );
  }, [vehicleSearch, vehicles]);

  const showAlert = useCallback(
    (
      title: string,
      message: string,
      status: AlertConfig["status"],
      onConfirm?: () => void,
    ) => {
      setAlertConfig({ title, message, status, onConfirm });
      alertSheetRef.current?.present();
    },
    [],
  );

  const loadBooking = useCallback(async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    const data = await BookingRepository.getBookingById(Number(id));
    if (!data) {
      setLoading(false);
      showAlert(
        "Booking not found",
        "Unable to load this booking.",
        "error",
        () => router.back(),
      );
      return;
    }

    const [vehicleData, savedCustomers, fleetVehicles, customerData] =
      await Promise.all([
        VehicleRepository.getVehicleById(data.vehicle_id),
        CustomerRepository.getAllCustomers(),
        VehicleRepository.getFleetVehicles(),
        CustomerRepository.getCustomerById(data.customer_id),
      ]);
    const unit = data.pricing_unit || "day";

    setBooking(data);
    setCustomers(savedCustomers);
    setVehicles(fleetVehicles);
    setSelectedCustomer(
      customerData ?? {
        id: data.customer_id,
        name: data.customer_name || "Customer",
        phone: data.customer_phone || "",
        cnic: data.customer_cnic || "",
        created_at: data.created_at,
      },
    );
    setVehicle(vehicleData);
    setStartDate(new Date(data.start_date));
    setEndDate(new Date(data.end_date));
    setPricingUnit(unit);
    setDiscountAmount(
      data.discount_amount ? String(Math.round(data.discount_amount)) : "",
    );
    setDiscountNote(data.discount_note || "");
    setAdvanceAmount(String(Math.round(data.advance_amount || 0)));
    setSecurityDeposit(String(Math.round(data.security_deposit || 0)));
    setPickupLocation(data.pickup_location || "");
    setDropoffLocation(data.dropoff_location || "");
    setNotes(data.notes || "");
    setBookingStatus(data.status || "active");
    setLoading(false);
  }, [id, router, showAlert]);

  useFocusEffect(
    useCallback(() => {
      void loadBooking();
    }, [loadBooking]),
  );

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch("");
    customerSheetRef.current?.dismiss();
  };

  const selectVehicle = (selectedVehicle: Vehicle) => {
    setVehicle(selectedVehicle);
    setVehicleSearch("");
    vehicleSheetRef.current?.dismiss();
  };

  const getPickerValue = (target: PickerTarget): Date =>
    target === "startDate" || target === "startTime" ? startDate : endDate;

  const openDateTimePicker = (target: PickerTarget) => {
    setActivePicker(target);
    setPickerDraftDate(getPickerValue(target));
    if (isIos) {
      datePickerSheetRef.current?.present();
    }
  };

  const closeDateTimePicker = () => {
    setActivePicker(null);
    datePickerSheetRef.current?.dismiss();
  };

  const confirmDateTimePicker = () => {
    if (activePicker) {
      updateDateTime(activePicker, pickerDraftDate);
    }
    closeDateTimePicker();
  };

  const updateDateTime = (target: PickerTarget, selected: Date) => {
    if (target === "startDate" || target === "startTime") {
      const nextStart =
        target === "startDate"
          ? mergeDatePart(startDate, selected)
          : mergeTimePart(startDate, selected);
      setStartDate(nextStart);
      if (endDate <= nextStart) {
        setEndDate(addRentalUnit(nextStart, pricingUnit));
      }
      return;
    }

    const nextEnd =
      target === "endDate"
        ? mergeDatePart(endDate, selected)
        : mergeTimePart(endDate, selected);
    setEndDate(
      nextEnd <= startDate ? addRentalUnit(startDate, pricingUnit) : nextEnd,
    );
  };

  const handlePickerValueChange = (
    _event: DateTimePickerChangeEvent,
    selected: Date,
  ) => {
    if (!activePicker) {
      return;
    }

    if (isIos) {
      setPickerDraftDate(selected);
      return;
    }

    updateDateTime(activePicker, selected);
    setActivePicker(null);
  };

  const handleSave = async () => {
    if (!booking || !id) {
      return;
    }

    if (!selectedCustomer) {
      showAlert("Customer required", "Please select a customer.", "error");
      return;
    }

    if (!vehicle) {
      showAlert("Vehicle required", "Please select a vehicle.", "error");
      return;
    }

    if (quantity <= 0 || endDate <= startDate) {
      showAlert(
        "Invalid schedule",
        "End date and time must be after the start date and time.",
        "error",
      );
      return;
    }

    if (pricing.unitPrice <= 0) {
      showAlert(
        "Invalid rate",
        "Please select a vehicle with a valid rental rate.",
        "error",
      );
      return;
    }

    if (parseAmountInput(discountAmount) > pricing.grossAmount) {
      showAlert(
        "Invalid discount",
        "Discount cannot be greater than the gross rental amount.",
        "error",
      );
      return;
    }

    setSaving(true);
    try {
      if (bookingStatus === "active") {
        const available = await BookingRepository.checkAvailability(
          vehicle.id,
          startDate.toISOString(),
          endDate.toISOString(),
          Number(id),
        );

        if (!available) {
          showAlert(
            "Vehicle unavailable",
            "This vehicle is already booked for the selected schedule.",
            "error",
          );
          setSaving(false);
          return;
        }
      }

      const success = await BookingRepository.updateBooking(Number(id), {
        customer_id: selectedCustomer.id,
        vehicle_id: vehicle.id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        total_price: pricing.totalPrice,
        advance_amount: pricing.advanceAmount,
        security_deposit: normalizeMoney(parseAmountInput(securityDeposit)),
        base_unit_price: baseUnitPrice,
        negotiated_unit_price: null,
        discount_amount: pricing.discountAmount,
        discount_note: discountNote.trim(),
        pickup_location: pickupLocation.trim(),
        dropoff_location: dropoffLocation.trim(),
        notes: notes.trim(),
        pricing_unit: pricingUnit,
        status: bookingStatus,
      });

      if (!success) {
        showAlert("Save failed", "Failed to update booking.", "error");
        return;
      }

      showAlert(
        "Booking updated",
        "Booking details were saved.",
        "success",
        () => router.back(),
      );
    } catch (error) {
      console.error("Update booking error:", error);
      showAlert("Save failed", "An unexpected error occurred.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppScreen style={styles.centered}>
        <ActivityIndicator color={purple} size="large" />
      </AppScreen>
    );
  }

  if (!booking) {
    return null;
  }

  return (
    <AppScreen>
      <View style={styles.pageHeader}>
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft
            color={appTheme.colors.slate}
            size={24}
            strokeWidth={2.3}
          />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            Booking Details
          </Text>
          <Text numberOfLines={1} style={styles.headerSubtitle}>
            Update booking #{booking.id}
          </Text>
        </View>
        <TouchableOpacity activeOpacity={0.84} style={styles.moreButton}>
          <MoreHorizontal
            color={appTheme.colors.textMuted}
            size={24}
            strokeWidth={2.2}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <SectionCard title="Customer" styles={styles}>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => customerSheetRef.current?.present()}
          >
            <SelectedCustomerCard
              customer={selectedCustomer}
              booking={booking}
              styles={styles}
            />
          </TouchableOpacity>
        </SectionCard>

        <SectionCard title="Vehicle" styles={styles}>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => vehicleSheetRef.current?.present()}
          >
            <SelectedVehicleCard
              vehicle={vehicle}
              booking={booking}
              styles={styles}
            />
          </TouchableOpacity>
        </SectionCard>

        <SectionCard title="Pricing Unit" styles={styles}>
          <View style={styles.unitGrid}>
            <UnitButton
              icon={Calendar}
              label="Day"
              selected={pricingUnit === "day"}
              styles={styles}
              onPress={() => {
                setPricingUnit("day");
                if (endDate <= startDate) {
                  setEndDate(addRentalUnit(startDate, "day"));
                }
              }}
            />
            <UnitButton
              icon={Clock}
              label="Hour"
              selected={pricingUnit === "hour"}
              styles={styles}
              onPress={() => {
                setPricingUnit("hour");
                if (endDate <= startDate) {
                  setEndDate(addRentalUnit(startDate, "hour"));
                }
              }}
            />
          </View>
          <Text style={styles.helperText}>
            Update how this rental price is calculated.
          </Text>
        </SectionCard>

        <SectionCard title="Schedule" styles={styles}>
          <View style={styles.dateGrid}>
            <DateTimeGroup
              title="Start Date & Time"
              date={startDate}
              dateTarget="startDate"
              timeTarget="startTime"
              styles={styles}
              onOpenPicker={openDateTimePicker}
            />
            <DateTimeGroup
              title="End Date & Time"
              date={endDate}
              dateTarget="endDate"
              timeTarget="endTime"
              styles={styles}
              onOpenPicker={openDateTimePicker}
            />
          </View>
        </SectionCard>

        <SectionCard title="Notes" subtitle="Optional" styles={styles}>
          <View style={styles.notesField}>
            <FileText color={purple} size={20} strokeWidth={2.2} />
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Driver, route, fuel, or handover notes"
              placeholderTextColor={appTheme.colors.textSubtle}
              multiline
              maxLength={250}
              style={styles.notesInput}
            />
            <Text style={styles.counter}>{notes.length}/250</Text>
          </View>
        </SectionCard>

        <SectionCard title="Pricing & Payments" styles={styles}>
          <View style={styles.priceGrid}>
            <ReadonlyMetric
              label={`Rate / ${pricingUnit}`}
              value={formatCurrency(baseUnitPrice)}
              styles={styles}
            />
            <ReadonlyMetric
              label={pricingUnit === "day" ? "Days" : "Hours"}
              value={quantity.toLocaleString()}
              styles={styles}
            />
            <FormInput
              label="Discount"
              value={discountAmount}
              placeholder="0"
              keyboardType="number-pad"
              styles={styles}
              onChangeText={setDiscountAmount}
            />
          </View>
          <FormInput
            label="Discount Reason"
            value={discountNote}
            placeholder="Customer discount reason"
            styles={styles}
            onChangeText={setDiscountNote}
          />
          <View style={styles.priceGrid}>
            <FormInput
              label="Advance Amount"
              value={advanceAmount}
              placeholder="0"
              keyboardType="number-pad"
              styles={styles}
              onChangeText={setAdvanceAmount}
            />
            <FormInput
              label="Security Deposit"
              value={securityDeposit}
              placeholder="0"
              keyboardType="number-pad"
              styles={styles}
              onChangeText={setSecurityDeposit}
            />
          </View>

          <View style={styles.summaryPanel}>
            <SummaryTile
              icon={WalletCards}
              label="Total Price"
              value={formatCurrency(pricing.totalPrice)}
              helper="After discount"
              tone="purple"
              styles={styles}
            />
            <SummaryTile
              icon={CheckCircle}
              label="Advance Amount"
              value={formatCurrency(pricing.advanceAmount)}
              helper="Paid by customer"
              tone="blue"
              styles={styles}
            />
            <SummaryTile
              icon={CreditCard}
              label="Balance Amount"
              value={formatCurrency(pricing.balanceAmount)}
              helper="Due at pickup"
              tone="green"
              styles={styles}
            />
            <SummaryTile
              icon={ShieldCheck}
              label="Security Deposit"
              value={formatCurrency(parseAmountInput(securityDeposit))}
              helper="Refundable"
              tone="amber"
              styles={styles}
            />
          </View>

          <View style={styles.statusGrid}>
            <StatusGroup
              title="Payment Status"
              value={pricing.paymentStatus}
              options={[
                { label: "Pending", value: "pending" },
                { label: "Partial", value: "partial" },
                { label: "Paid", value: "paid" },
              ]}
              styles={styles}
            />
            <StatusGroup
              title="Booking Status"
              value={bookingStatus}
              options={[
                { label: "Active", value: "active" },
                { label: "Completed", value: "completed" },
                { label: "Cancelled", value: "cancelled" },
              ]}
              styles={styles}
              onChange={(value) => setBookingStatus(value as Booking["status"])}
            />
          </View>
        </SectionCard>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.referenceBlock}>
          <View style={styles.referenceIcon}>
            <CalendarPlus color={purple} size={28} strokeWidth={2.2} />
          </View>
          <View style={styles.referenceTextBlock}>
            <Text style={styles.referenceLabel}>Booking Reference</Text>
            <Text style={styles.referenceValue}>
              BOOK-{String(booking.id).padStart(4, "0")}
            </Text>
            <Text style={styles.referenceHelper}>Saved booking record</Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.86}
          disabled={saving}
          onPress={handleSave}
          style={[styles.saveButton, saving ? styles.disabled : null]}
        >
          <LinearGradient
            colors={["#8a28ff", "#6d28f5", "#5b21d6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Save color="#ffffff" size={22} strokeWidth={2.4} />
              <Text style={styles.saveButtonText}>Save Booking</Text>
              <ChevronRight color="#ffffff" size={24} strokeWidth={2.4} />
            </>
          )}
        </TouchableOpacity>
      </View>

      <BottomSheetModal
        ref={customerSheetRef}
        index={0}
        snapPoints={sheetSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: appTheme.colors.surface }}
        handleIndicatorStyle={{ backgroundColor: appTheme.colors.border }}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Select Customer</Text>
          <SearchInput
            icon={Search}
            value={customerSearch}
            placeholder="Search by name, phone, or CNIC"
            styles={styles}
            onChangeText={setCustomerSearch}
          />
          <View style={styles.resultList}>
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <TouchableOpacity
                  key={customer.id}
                  activeOpacity={0.84}
                  onPress={() => selectCustomer(customer)}
                  style={styles.resultRow}
                >
                  <View style={styles.resultIcon}>
                    <UserPlus color={purple} size={21} strokeWidth={2.2} />
                  </View>
                  <View style={styles.resultText}>
                    <Text numberOfLines={1} style={styles.resultTitle}>
                      {customer.name}
                    </Text>
                    <Text numberOfLines={1} style={styles.resultSubtitle}>
                      CUST-{String(customer.id).padStart(4, "0")} •{" "}
                      {customer.phone}
                    </Text>
                  </View>
                  <ChevronRight
                    color={appTheme.colors.textMuted}
                    size={20}
                    strokeWidth={2.2}
                  />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptySheetText}>No customers found.</Text>
            )}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={vehicleSheetRef}
        index={0}
        snapPoints={sheetSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: appTheme.colors.surface }}
        handleIndicatorStyle={{ backgroundColor: appTheme.colors.border }}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Select Vehicle</Text>
          <SearchInput
            icon={CarFront}
            value={vehicleSearch}
            placeholder="Search by name, type, or registration"
            styles={styles}
            onChangeText={setVehicleSearch}
          />
          <View style={styles.resultList}>
            {filteredVehicles.length > 0 ? (
              filteredVehicles.map((fleetVehicle) => (
                <TouchableOpacity
                  key={fleetVehicle.id}
                  activeOpacity={0.84}
                  onPress={() => selectVehicle(fleetVehicle)}
                  style={styles.vehicleResultRow}
                >
                  <VehicleThumb vehicle={fleetVehicle} styles={styles} />
                  <View style={styles.resultText}>
                    <Text numberOfLines={1} style={styles.resultTitle}>
                      {fleetVehicle.name}
                    </Text>
                    <Text numberOfLines={1} style={styles.resultSubtitle}>
                      {getVehicleLabel(fleetVehicle)}
                    </Text>
                  </View>
                  <ChevronRight
                    color={appTheme.colors.textMuted}
                    size={20}
                    strokeWidth={2.2}
                  />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptySheetText}>No vehicles found.</Text>
            )}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={datePickerSheetRef}
        index={0}
        snapPoints={dateSheetSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: appTheme.colors.surface }}
        handleIndicatorStyle={{ backgroundColor: appTheme.colors.border }}
        onDismiss={() => setActivePicker(null)}
      >
        <BottomSheetScrollView contentContainerStyle={styles.dateSheetContent}>
          <Text style={styles.sheetTitle}>
            {activePicker?.endsWith("Time") ? "Select Time" : "Select Date"}
          </Text>
          {activePicker ? (
            <DateTimePicker
              value={pickerDraftDate}
              mode={activePicker.endsWith("Time") ? "time" : "date"}
              display="spinner"
              themeVariant={appTheme.isDark ? "dark" : "light"}
              minimumDate={
                activePicker.endsWith("Time")
                  ? undefined
                  : activePicker === "endDate"
                    ? startDate
                    : undefined
              }
              onValueChange={handlePickerValueChange}
              onDismiss={closeDateTimePicker}
            />
          ) : null}
          <View style={styles.dateSheetActions}>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={closeDateTimePicker}
              style={styles.sheetSecondaryButton}
            >
              <Text style={styles.sheetSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={confirmDateTimePicker}
              style={styles.sheetPrimaryButton}
            >
              <Text style={styles.sheetPrimaryText}>Done</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>

      {!isIos && activePicker ? (
        <DateTimePicker
          value={
            activePicker === "startDate" || activePicker === "startTime"
              ? startDate
              : endDate
          }
          mode={activePicker.endsWith("Time") ? "time" : "date"}
          minimumDate={
            activePicker.endsWith("Time")
              ? undefined
              : activePicker === "endDate"
                ? startDate
                : undefined
          }
          display="default"
          themeVariant={appTheme.isDark ? "dark" : "light"}
          onValueChange={handlePickerValueChange}
          onDismiss={() => setActivePicker(null)}
        />
      ) : null}

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

type IconComponent = typeof Calendar;

function SectionCard({
  title,
  subtitle,
  styles,
  children,
}: {
  title: string;
  subtitle?: string;
  styles: ReturnType<typeof createStyles>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? (
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function SearchInput({
  icon: Icon,
  value,
  placeholder,
  styles,
  onChangeText,
}: {
  icon: IconComponent;
  value: string;
  placeholder: string;
  styles: ReturnType<typeof createStyles>;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.selectField}>
      <Icon color={purple} size={22} strokeWidth={2.2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8992aa"
        style={styles.selectInput}
      />
      <ChevronDown color="#49536a" size={21} strokeWidth={2.2} />
    </View>
  );
}

function SelectedCustomerCard({
  customer,
  booking,
  styles,
}: {
  customer: Customer | null;
  booking: Booking;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.selectedRow}>
      <View style={styles.selectedIcon}>
        <UserPlus color={purple} size={24} strokeWidth={2.2} />
      </View>
      <View style={styles.selectedText}>
        <Text numberOfLines={1} style={styles.selectedTitle}>
          {customer?.name || booking.customer_name || "Customer"}
        </Text>
        <Text numberOfLines={1} style={styles.selectedSubtitle}>
          CUST-{String(customer?.id || booking.customer_id).padStart(4, "0")} •{" "}
          {customer?.phone || booking.customer_phone || "No phone"}
        </Text>
      </View>
      <ChevronDown color="#49536a" size={21} strokeWidth={2.2} />
    </View>
  );
}

function SelectedVehicleCard({
  vehicle,
  booking,
  styles,
}: {
  vehicle: Vehicle | null;
  booking: Booking;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.vehicleSelected}>
      <VehicleThumb vehicle={vehicle} booking={booking} styles={styles} />
      <View style={styles.selectedText}>
        <Text numberOfLines={1} style={styles.selectedTitle}>
          {vehicle?.name || booking.vehicle_name || "Vehicle"}
        </Text>
        <Text numberOfLines={1} style={styles.selectedSubtitle}>
          {vehicle
            ? getVehicleLabel(vehicle)
            : [booking.vehicle_registration_number, booking.vehicle_type]
                .filter(Boolean)
                .join("  •  ")}
        </Text>
      </View>
      <ChevronDown color="#49536a" size={21} strokeWidth={2.2} />
    </View>
  );
}

function VehicleThumb({
  vehicle,
  booking,
  styles,
}: {
  vehicle: Vehicle | null;
  booking?: Booking;
  styles: ReturnType<typeof createStyles>;
}) {
  const imageUri = vehicle
    ? getVehicleImageUris(vehicle)[0]
    : booking?.vehicle_image;

  return (
    <View style={styles.vehicleThumb}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={140}
        />
      ) : (
        <CarFront color="#8992aa" size={24} />
      )}
    </View>
  );
}

function UnitButton({
  icon: Icon,
  label,
  selected,
  styles,
  onPress,
}: {
  icon: IconComponent;
  label: string;
  selected: boolean;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={[styles.unitButton, selected ? styles.unitButtonActive : null]}
    >
      <Icon color={selected ? purple : "#667085"} size={22} strokeWidth={2.2} />
      <Text style={[styles.unitText, selected ? styles.unitTextActive : null]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function DateTimeGroup({
  title,
  date,
  dateTarget,
  timeTarget,
  styles,
  onOpenPicker,
}: {
  title: string;
  date: Date;
  dateTarget: PickerTarget;
  timeTarget: PickerTarget;
  styles: ReturnType<typeof createStyles>;
  onOpenPicker: (target: PickerTarget) => void;
}) {
  return (
    <View style={styles.dateGroup}>
      <Text style={styles.groupTitle}>{title}</Text>
      <TouchableOpacity
        activeOpacity={0.84}
        onPress={() => onOpenPicker(dateTarget)}
        style={styles.dateField}
      >
        <Calendar color={purple} size={20} strokeWidth={2.2} />
        <Text numberOfLines={1} style={styles.dateFieldText}>
          {formatDate(date)}
        </Text>
        <ChevronDown color="#49536a" size={18} />
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.84}
        onPress={() => onOpenPicker(timeTarget)}
        style={styles.dateField}
      >
        <Clock color={purple} size={20} strokeWidth={2.2} />
        <Text numberOfLines={1} style={styles.dateFieldText}>
          {formatTime(date)}
        </Text>
        <ChevronDown color="#49536a" size={18} />
      </TouchableOpacity>
    </View>
  );
}

function FormInput({
  label,
  value,
  placeholder,
  keyboardType,
  styles,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  keyboardType?: "default" | "number-pad" | "phone-pad";
  styles: ReturnType<typeof createStyles>;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8992aa"
        keyboardType={keyboardType}
        style={styles.textInput}
      />
    </View>
  );
}

function ReadonlyMetric({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.readonlyMetric}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.readonlyValue}>
        {value}
      </Text>
    </View>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  helper,
  tone,
  styles,
}: {
  icon: IconComponent;
  label: string;
  value: string;
  helper: string;
  tone: "purple" | "blue" | "green" | "amber";
  styles: ReturnType<typeof createStyles>;
}) {
  const toneStyle = getSummaryToneStyle(tone, styles);

  return (
    <View style={styles.summaryTile}>
      <View style={[styles.summaryIcon, toneStyle.icon]}>
        <Icon color={toneStyle.color} size={22} />
      </View>
      <Text numberOfLines={1} style={styles.summaryLabel}>
        {label}
      </Text>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.68}
        numberOfLines={1}
        style={styles.summaryValue}
      >
        {value}
      </Text>
      <Text numberOfLines={1} style={styles.summaryHelper}>
        {helper}
      </Text>
    </View>
  );
}

function getSummaryToneStyle(
  tone: "purple" | "blue" | "green" | "amber",
  styles: ReturnType<typeof createStyles>,
): { icon: StyleProp<ViewStyle>; color: string } {
  switch (tone) {
    case "blue":
      return { icon: styles.blueSummaryIcon, color: "#2563eb" };
    case "green":
      return { icon: styles.greenSummaryIcon, color: "#079669" };
    case "amber":
      return { icon: styles.amberSummaryIcon, color: "#d97706" };
    case "purple":
    default:
      return { icon: styles.purpleSummaryIcon, color: purple };
  }
}

function StatusGroup({
  title,
  value,
  options,
  styles,
  onChange,
}: {
  title: string;
  value: string;
  options: { label: string; value: string }[];
  styles: ReturnType<typeof createStyles>;
  onChange?: (value: string) => void;
}) {
  return (
    <View style={styles.statusGroup}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.statusButtonRow}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <TouchableOpacity
              key={option.value}
              activeOpacity={onChange ? 0.84 : 1}
              disabled={!onChange}
              onPress={() => onChange?.(option.value)}
              style={[
                styles.statusButton,
                selected ? styles.statusButtonActive : null,
              ]}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  selected ? styles.statusButtonTextActive : null,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(appTheme: AppTheme, width: number, bottomInset: number) {
  const isTiny = width < 360;
  const isCompact = width < 390;
  const isNarrow = width < 680;
  const isTablet = width >= 768;
  const screenPadding = isTiny ? 14 : isCompact ? 16 : isTablet ? 32 : 20;
  const footerPaddingBottom = Math.max(bottomInset, 14);
  const footerHeight = isNarrow ? 148 : 120;
  const fieldHeight = isTiny ? 54 : isTablet ? 64 : 58;

  return StyleSheet.create({
    centered: {
      alignItems: "center",
      justifyContent: "center",
    },
    pageHeader: {
      paddingHorizontal: screenPadding,
      paddingTop: isCompact ? 12 : 18,
      paddingBottom: isCompact ? 12 : 18,
      flexDirection: "row",
      alignItems: "center",
      gap: isCompact ? 12 : 16,
    },
    backButton: {
      width: isCompact ? 48 : 56,
      height: isCompact ? 48 : 56,
      borderRadius: isCompact ? 17 : 20,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.glass,
      alignItems: "center",
      justifyContent: "center",
      boxShadow: appTheme.shadow.soft,
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
    },
    headerTitle: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 27 : isTablet ? 34 : 30,
      lineHeight: isTiny ? 34 : isTablet ? 41 : 37,
      fontWeight: "900",
      letterSpacing: 0,
    },
    headerSubtitle: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 14 : isTablet ? 19 : 16,
      fontWeight: "700",
      marginTop: 2,
    },
    moreButton: {
      width: isCompact ? 44 : 50,
      height: isCompact ? 44 : 50,
      borderRadius: 25,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.glass,
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      paddingHorizontal: screenPadding,
      paddingTop: 4,
      paddingBottom: footerHeight + footerPaddingBottom + 24,
      gap: isCompact ? 12 : 14,
    },
    sectionCard: {
      borderRadius: isCompact ? 20 : 24,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.glass,
      padding: isTiny ? 14 : isTablet ? 24 : 18,
      gap: isTiny ? 13 : 16,
      boxShadow: appTheme.shadow.card,
    },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 6,
      flexWrap: "wrap",
    },
    sectionTitle: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 17 : isTablet ? 22 : 19,
      fontWeight: "900",
    },
    sectionSubtitle: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 13 : 15,
      fontWeight: "700",
    },
    selectedRow: {
      minHeight: fieldHeight + 10,
      borderRadius: isCompact ? 17 : 20,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.surfaceRaised,
      paddingHorizontal: isTiny ? 12 : 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    selectedIcon: {
      width: isTiny ? 46 : 54,
      height: isTiny ? 46 : 54,
      borderRadius: isTiny ? 17 : 20,
      backgroundColor: appTheme.isDark ? "rgba(109, 40, 245, 0.2)" : "#f0e7ff",
      alignItems: "center",
      justifyContent: "center",
    },
    selectedText: {
      flex: 1,
      minWidth: 0,
      gap: 5,
    },
    selectedTitle: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 15 : isTablet ? 19 : 17,
      fontWeight: "900",
    },
    selectedSubtitle: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 12 : isTablet ? 15 : 13,
      fontWeight: "700",
    },
    selectField: {
      minHeight: fieldHeight,
      borderRadius: isCompact ? 17 : 20,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.surfaceRaised,
      paddingHorizontal: isTiny ? 13 : 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    selectInput: {
      flex: 1,
      minWidth: 0,
      color: appTheme.colors.text,
      fontSize: isTiny ? 14 : isTablet ? 18 : 16,
      fontWeight: "800",
      paddingVertical: 0,
    },
    resultList: {
      borderRadius: 18,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.surfaceRaised,
    },
    emptySheetText: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 13 : 15,
      fontWeight: "800",
      padding: 18,
      textAlign: "center",
    },
    resultRow: {
      minHeight: 62,
      paddingHorizontal: 13,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: appTheme.colors.borderSoft,
    },
    vehicleResultRow: {
      minHeight: 72,
      paddingHorizontal: 13,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: appTheme.colors.borderSoft,
    },
    resultIcon: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: appTheme.isDark ? "rgba(109, 40, 245, 0.2)" : "#f0e7ff",
      alignItems: "center",
      justifyContent: "center",
    },
    resultText: {
      flex: 1,
      minWidth: 0,
    },
    resultTitle: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 14 : 16,
      fontWeight: "900",
    },
    resultSubtitle: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 11 : 13,
      fontWeight: "700",
      marginTop: 4,
    },
    vehicleSelected: {
      minHeight: 78,
      borderRadius: isCompact ? 17 : 20,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.surfaceRaised,
      paddingHorizontal: isTiny ? 12 : 16,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    vehicleThumb: {
      width: isTiny ? 70 : isTablet ? 104 : 86,
      height: isTiny ? 48 : isTablet ? 66 : 56,
      borderRadius: 13,
      overflow: "hidden",
      backgroundColor: appTheme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    unitGrid: {
      flexDirection: isNarrow ? "column" : "row",
      gap: 10,
    },
    unitButton: {
      flex: 1,
      minHeight: fieldHeight,
      borderRadius: isCompact ? 17 : 20,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.surfaceRaised,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 10,
    },
    unitButtonActive: {
      borderColor: "rgba(109, 40, 245, 0.48)",
      backgroundColor: appTheme.isDark
        ? "rgba(109, 40, 245, 0.18)"
        : "rgba(109, 40, 245, 0.08)",
    },
    unitText: {
      color: appTheme.colors.slate,
      fontSize: isTiny ? 14 : 16,
      fontWeight: "900",
    },
    unitTextActive: {
      color: purple,
    },
    helperText: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 12 : 14,
      fontWeight: "700",
    },
    dateGrid: {
      flexDirection: isNarrow ? "column" : "row",
      gap: isNarrow ? 14 : 18,
    },
    dateGroup: {
      flex: 1,
      minWidth: 0,
      gap: 9,
    },
    groupTitle: {
      color: appTheme.colors.slate,
      fontSize: isTiny ? 14 : 16,
      fontWeight: "900",
    },
    dateField: {
      minHeight: isTiny ? 48 : 54,
      borderRadius: isCompact ? 15 : 17,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.surfaceRaised,
      paddingHorizontal: isTiny ? 12 : 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
    },
    dateFieldText: {
      flex: 1,
      minWidth: 0,
      color: appTheme.colors.text,
      fontSize: isTiny ? 14 : 16,
      fontWeight: "800",
    },
    locationField: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minHeight: 64,
    },
    locationIcon: {
      width: 46,
      height: 46,
      borderRadius: 17,
      backgroundColor: appTheme.isDark ? "rgba(109, 40, 245, 0.2)" : "#f0e7ff",
      alignItems: "center",
      justifyContent: "center",
    },
    locationTextBlock: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    locationLabel: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 14 : 16,
      fontWeight: "900",
    },
    locationInput: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 13 : 15,
      fontWeight: "700",
      padding: 0,
    },
    thinDivider: {
      height: 1,
      backgroundColor: appTheme.colors.borderSoft,
    },
    notesField: {
      minHeight: 58,
      borderRadius: isCompact ? 17 : 20,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.surfaceRaised,
      paddingHorizontal: 13,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 11,
    },
    notesInput: {
      flex: 1,
      minHeight: 42,
      color: appTheme.colors.text,
      fontSize: isTiny ? 14 : 16,
      fontWeight: "700",
      padding: 0,
    },
    counter: {
      color: appTheme.colors.textMuted,
      fontSize: 12,
      fontWeight: "800",
      alignSelf: "flex-end",
    },
    priceGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    inputWrap: {
      flex: 1,
      minWidth: isNarrow ? "100%" : 220,
      gap: 7,
    },
    inputLabel: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 12 : 13,
      fontWeight: "900",
    },
    textInput: {
      minHeight: fieldHeight,
      borderRadius: isCompact ? 17 : 20,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.surfaceRaised,
      paddingHorizontal: isTiny ? 13 : 16,
      color: appTheme.colors.text,
      fontSize: isTiny ? 14 : isTablet ? 18 : 16,
      fontWeight: "800",
    },
    readonlyMetric: {
      flex: 1,
      minWidth: isNarrow ? "100%" : 220,
      minHeight: fieldHeight,
      borderRadius: isCompact ? 17 : 20,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.surfaceRaised,
      paddingHorizontal: isTiny ? 13 : 16,
      justifyContent: "center",
      gap: 6,
    },
    readonlyValue: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 15 : 17,
      fontWeight: "900",
      fontVariant: ["tabular-nums"],
    },
    summaryPanel: {
      borderRadius: isCompact ? 18 : 22,
      backgroundColor: appTheme.isDark
        ? "rgba(109, 40, 245, 0.14)"
        : "rgba(109, 40, 245, 0.05)",
      padding: isTiny ? 12 : 16,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: isTiny ? 10 : 14,
    },
    summaryTile: {
      flex: 1,
      minWidth: isNarrow ? "46%" : 150,
      alignItems: "center",
      gap: 5,
      paddingVertical: 6,
    },
    summaryIcon: {
      width: isTiny ? 42 : 50,
      height: isTiny ? 42 : 50,
      borderRadius: 25,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    purpleSummaryIcon: {
      backgroundColor: "rgba(109, 40, 245, 0.16)",
    },
    blueSummaryIcon: {
      backgroundColor: "rgba(37, 99, 235, 0.14)",
    },
    greenSummaryIcon: {
      backgroundColor: "rgba(7, 150, 105, 0.14)",
    },
    amberSummaryIcon: {
      backgroundColor: "rgba(217, 119, 6, 0.14)",
    },
    summaryLabel: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 12 : 14,
      fontWeight: "800",
      textAlign: "center",
    },
    summaryValue: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 15 : 18,
      fontWeight: "900",
      fontVariant: ["tabular-nums"],
      textAlign: "center",
    },
    summaryHelper: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 11 : 12,
      fontWeight: "700",
      textAlign: "center",
    },
    statusGrid: {
      borderTopWidth: 1,
      borderTopColor: appTheme.colors.borderSoft,
      paddingTop: 14,
      flexDirection: isNarrow ? "column" : "row",
      gap: 14,
    },
    statusGroup: {
      flex: 1,
      minWidth: 0,
      gap: 10,
    },
    statusButtonRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    statusButton: {
      minHeight: 40,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.surfaceRaised,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    statusButtonActive: {
      borderColor: "rgba(109, 40, 245, 0.42)",
      backgroundColor: appTheme.isDark
        ? "rgba(109, 40, 245, 0.2)"
        : "rgba(109, 40, 245, 0.1)",
    },
    statusButtonText: {
      color: appTheme.colors.slate,
      fontSize: 13,
      fontWeight: "900",
    },
    statusButtonTextActive: {
      color: purple,
    },
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      minHeight: footerHeight,
      paddingHorizontal: screenPadding,
      paddingTop: 14,
      paddingBottom: footerPaddingBottom,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderTopWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.glass,
      flexDirection: isNarrow ? "column" : "row",
      alignItems: isNarrow ? "stretch" : "center",
      gap: 14,
      boxShadow: "0 -12px 34px rgba(16, 24, 39, 0.12)",
    },
    referenceBlock: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    referenceIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor: appTheme.isDark ? "rgba(109, 40, 245, 0.2)" : "#f0e7ff",
      alignItems: "center",
      justifyContent: "center",
    },
    referenceTextBlock: {
      flex: 1,
      minWidth: 0,
    },
    referenceLabel: {
      color: appTheme.colors.textMuted,
      fontSize: 13,
      fontWeight: "800",
    },
    referenceValue: {
      color: appTheme.colors.text,
      fontSize: 19,
      fontWeight: "900",
      marginTop: 2,
    },
    referenceHelper: {
      color: appTheme.colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 2,
    },
    saveButton: {
      flex: isNarrow ? undefined : 1,
      minHeight: isTiny ? 56 : 64,
      maxWidth: isNarrow ? undefined : 440,
      borderRadius: isTiny ? 18 : 22,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 12,
      boxShadow: "0 16px 30px rgba(109, 40, 245, 0.28)",
    },
    saveButtonText: {
      color: "#ffffff",
      fontSize: isTiny ? 16 : 20,
      fontWeight: "900",
    },
    disabled: {
      opacity: 0.7,
    },
    sheetContent: {
      paddingHorizontal: screenPadding,
      paddingTop: 12,
      paddingBottom: 44,
      gap: 14,
      backgroundColor: appTheme.colors.surface,
    },
    dateSheetContent: {
      paddingHorizontal: screenPadding,
      paddingTop: 12,
      paddingBottom: 34,
      gap: 12,
      backgroundColor: appTheme.colors.surface,
    },
    sheetTitle: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 20 : 24,
      fontWeight: "900",
    },
    dateSheetActions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 4,
    },
    sheetSecondaryButton: {
      flex: 1,
      minHeight: 52,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.surfaceRaised,
      alignItems: "center",
      justifyContent: "center",
    },
    sheetSecondaryText: {
      color: appTheme.colors.textMuted,
      fontSize: 16,
      fontWeight: "900",
    },
    sheetPrimaryButton: {
      flex: 1,
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: purple,
      alignItems: "center",
      justifyContent: "center",
    },
    sheetPrimaryText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "900",
    },
  });
}
