import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  DollarSign,
  Edit,
  Phone,
  User,
  XCircle,
} from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ActionSheet } from "../../components/ui/action-sheet";
import {
  AppScreen,
  IconButton,
  ScreenHeader,
} from "../../components/ui/primitives";
import { AppTheme, useAppTheme } from "../../components/ui/theme";
import { Booking, BookingRepository } from "../../services/booking-repository";

type StatusInfo = {
  backgroundColor: string;
  borderColor: string;
  color: string;
  icon: React.ReactNode;
};

export default function BookingDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [refundAmount, setRefundAmount] = useState("");

  const alertSheetRef = useRef<BottomSheetModal>(null);
  const paymentSheetRef = useRef<BottomSheetModal>(null);
  const cancelSheetRef = useRef<BottomSheetModal>(null);
  const confirmSheetRef = useRef<BottomSheetModal>(null);

  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    status: "success" | "error" | "info";
    onConfirm?: () => void;
  }>({ title: "", message: "", status: "info" });

  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ title: "", message: "", onConfirm: () => {} });

  const snapPoints = useMemo(() => ["50%"], []);
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

  const showAlert = useCallback(
    (
      title: string,
      message: string,
      status: "success" | "error" | "info",
      onConfirm?: () => void,
    ) => {
      setAlertConfig({ title, message, status, onConfirm });
      alertSheetRef.current?.present();
    },
    [],
  );

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setConfirmConfig({ title, message, onConfirm });
    confirmSheetRef.current?.present();
  };

  const loadBooking = useCallback(async () => {
    setLoading(true);
    const data = await BookingRepository.getBookingById(Number(id));
    if (data) {
      setBooking(data);
    } else {
      showAlert("Error", "Booking not found", "error", () => router.back());
    }
    setLoading(false);
  }, [id, router, showAlert]);

  useFocusEffect(
    useCallback(() => {
      if (id) {
        void loadBooking();
      }
    }, [id, loadBooking]),
  );

  const handleCompleteBooking = () => {
    showConfirm(
      "Complete Booking",
      "Are you sure you want to mark this booking as completed? This will release the vehicle.",
      async () => {
        const success = await BookingRepository.completeBooking(Number(id));
        if (success) {
          showAlert("Success", "Booking completed", "success", loadBooking);
        } else {
          showAlert("Error", "Failed to complete booking", "error");
        }
      },
    );
  };

  const handleRefund = async () => {
    if (!booking) return;

    if (booking.advance_amount <= 0) {
      showAlert("Error", "Nothing to refund", "error");
      return;
    }

    showConfirm(
      "Refund Payment",
      `Are you sure you want to refund Rs ${booking.advance_amount}? This will set the total revenue for this booking to 0.`,
      async () => {
        const success = await BookingRepository.cancelBooking(
          Number(id),
          booking.advance_amount,
        );
        if (success) {
          showAlert("Success", "Payment refunded", "success", loadBooking);
        } else {
          showAlert("Error", "Failed to refund payment", "error");
        }
      },
    );
  };

  const handleCancelConfirm = async () => {
    if (!booking) return;

    const success = await BookingRepository.cancelBooking(
      Number(id),
      Number(refundAmount) || 0,
    );
    if (success) {
      cancelSheetRef.current?.dismiss();
      setRefundAmount("");
      showAlert("Success", "Booking cancelled", "success", loadBooking);
    } else {
      showAlert("Error", "Failed to cancel booking", "error");
    }
  };

  const handleAddPayment = async () => {
    if (
      !paymentAmount ||
      isNaN(Number(paymentAmount)) ||
      Number(paymentAmount) <= 0
    ) {
      showAlert("Error", "Please enter a valid amount", "error");
      return;
    }

    const success = await BookingRepository.updatePayment(
      Number(id),
      Number(paymentAmount),
    );
    if (success) {
      paymentSheetRef.current?.dismiss();
      setPaymentAmount("");
      showAlert("Success", "Payment recorded", "success", loadBooking);
    } else {
      showAlert("Error", "Failed to record payment", "error");
    }
  };

  const getStatusInfo = (status: string): StatusInfo => {
    switch (status) {
      case "active":
        return {
          color: appTheme.colors.primary,
          backgroundColor: appTheme.colors.primarySoft,
          borderColor: appTheme.isDark
            ? "rgba(122, 167, 255, 0.28)"
            : "#cbdcff",
          icon: <CheckCircle2 size={16} color={appTheme.colors.primary} />,
        };
      case "completed":
        return {
          color: appTheme.colors.success,
          backgroundColor: appTheme.colors.successSoft,
          borderColor: appTheme.isDark ? "rgba(66, 214, 159, 0.28)" : "#bff0da",
          icon: <CheckCircle2 size={16} color={appTheme.colors.success} />,
        };
      case "cancelled":
        return {
          color: appTheme.colors.danger,
          backgroundColor: appTheme.colors.dangerSoft,
          borderColor: appTheme.isDark ? "rgba(255, 123, 123, 0.3)" : "#ffc6c6",
          icon: <XCircle size={16} color={appTheme.colors.danger} />,
        };
      default:
        return {
          color: appTheme.colors.textMuted,
          backgroundColor: appTheme.colors.surfaceMuted,
          borderColor: appTheme.colors.border,
          icon: <AlertCircle size={16} color={appTheme.colors.textMuted} />,
        };
    }
  };

  if (loading) {
    return (
      <AppScreen style={styles.centered}>
        <ActivityIndicator size="large" color={appTheme.colors.primary} />
      </AppScreen>
    );
  }

  if (!booking) return null;

  const statusInfo = getStatusInfo(booking.status);
  const balanceColor =
    booking.status === "cancelled"
      ? appTheme.colors.text
      : booking.balance_amount > 0
        ? appTheme.colors.danger
        : appTheme.colors.success;

  return (
    <AppScreen>
      <ScreenHeader
        title="Booking Details"
        subtitle={`Booking #${booking.id}`}
        left={
          <IconButton
            icon={ArrowLeft}
            color={appTheme.colors.primary}
            onPress={() => router.back()}
          />
        }
        right={
          booking.status === "active" ? (
            <IconButton
              icon={Edit}
              color={appTheme.colors.primary}
              onPress={() => router.push(`/booking/edit/${id}`)}
            />
          ) : null
        }
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: statusInfo.backgroundColor,
              borderColor: statusInfo.borderColor,
            },
          ]}
        >
          <View style={styles.inlineRow}>
            {statusInfo.icon}
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              Status: {booking.status}
            </Text>
          </View>
          <Text style={styles.idText}>ID: #{booking.id}</Text>
        </View>

        <View style={styles.cardOverflow}>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => router.push(`/cars/${booking.vehicle_id}`)}
            style={styles.cardPressable}
          >
            <Text style={styles.sectionLabel}>Vehicle info</Text>
            <View style={styles.cardHeadingRow}>
              <View style={styles.flexContent}>
                <Text style={styles.primaryTitle}>{booking.vehicle_name}</Text>
                <View style={styles.inlineRow}>
                  <Calendar size={14} color={appTheme.colors.textMuted} />
                  <Text style={styles.metaText}>
                    {new Date(booking.start_date).toLocaleDateString()} -{" "}
                    {new Date(booking.end_date).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={appTheme.colors.textSubtle} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Customer info</Text>
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={() => router.push(`/customer/${booking.customer_id}`)}
            >
              <Text style={styles.linkText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoRowLarge}>
            <User size={18} color={appTheme.colors.primary} />
            <Text style={styles.customerName}>{booking.customer_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Phone size={16} color={appTheme.colors.textMuted} />
            <Text style={styles.bodyText}>{booking.customer_phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <CreditCard size={16} color={appTheme.colors.textMuted} />
            <Text style={styles.bodyText}>
              {booking.customer_cnic || "No CNIC recorded"}
            </Text>
          </View>

          <View style={styles.documentGrid}>
            <View style={styles.documentColumn}>
              <Text style={styles.documentLabel}>License image</Text>
              {booking.customer_license_image ? (
                <View style={styles.documentImageFrame}>
                  <Image
                    source={{ uri: booking.customer_license_image }}
                    style={styles.documentImage}
                    contentFit="cover"
                  />
                </View>
              ) : (
                <View style={styles.emptyDocumentFrame}>
                  <Text style={styles.emptyDocumentText}>No image</Text>
                </View>
              )}
            </View>
            <View style={styles.documentColumn}>
              <Text style={styles.documentLabel}>CNIC image</Text>
              {booking.customer_cnic_image ? (
                <View style={styles.documentImageFrame}>
                  <Image
                    source={{ uri: booking.customer_cnic_image }}
                    style={styles.documentImage}
                    contentFit="cover"
                  />
                </View>
              ) : (
                <View style={styles.emptyDocumentFrame}>
                  <Text style={styles.emptyDocumentText}>No image</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
            Handover details
          </Text>
          <View style={styles.detailStack}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Pickup</Text>
              <Text style={styles.detailValue}>
                {booking.pickup_location || "Not recorded"}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Drop-off</Text>
              <Text style={styles.detailValue}>
                {booking.dropoff_location || "Not recorded"}
              </Text>
            </View>
            <View style={styles.notesBlock}>
              <Text style={styles.detailLabel}>Notes</Text>
              <Text style={styles.notesText}>
                {booking.notes || "No notes recorded."}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.paymentCard}>
          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
            Payment details
          </Text>

          <View style={styles.paymentRow}>
            <View style={styles.flexContent}>
              <Text style={styles.detailLabel}>Total Amount</Text>
              <Text style={styles.microLabel}>
                Billed per {booking.pricing_unit}
              </Text>
            </View>
            <Text style={styles.amountText}>
              Rs {booking.total_price.toLocaleString()}
            </Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.detailLabel}>Paid Amount</Text>
            <Text
              style={[styles.amountText, { color: appTheme.colors.success }]}
            >
              Rs {booking.advance_amount.toLocaleString()}
            </Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.detailLabel}>Security Deposit</Text>
            <Text style={styles.amountText}>
              Rs {(booking.security_deposit || 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {booking.status === "cancelled" ? "Net Revenue" : "Balance Due"}
            </Text>
            <Text style={[styles.totalAmount, { color: balanceColor }]}>
              Rs{" "}
              {booking.status === "cancelled"
                ? booking.advance_amount.toLocaleString()
                : booking.balance_amount.toLocaleString()}
            </Text>
          </View>
        </View>

        {booking.status === "active" && (
          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={handleCompleteBooking}
              style={[styles.actionButton, styles.gradientButton]}
            >
              <LinearGradient
                colors={appTheme.gradients.emerald}
                style={StyleSheet.absoluteFill}
              />
              <CheckCircle2 size={20} color="#ffffff" />
              <Text style={styles.actionButtonText}>Mark as Completed</Text>
            </TouchableOpacity>

            {booking.balance_amount > 0 && (
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={() => paymentSheetRef.current?.present()}
                style={[styles.actionButton, styles.gradientButton]}
              >
                <LinearGradient
                  colors={appTheme.gradients.primary}
                  style={StyleSheet.absoluteFill}
                />
                <DollarSign size={20} color="#ffffff" />
                <Text style={styles.actionButtonText}>Record Payment</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => cancelSheetRef.current?.present()}
              style={[styles.actionButton, styles.cancelButton]}
            >
              <XCircle size={20} color={appTheme.colors.danger} />
              <Text
                style={[
                  styles.actionButtonText,
                  { color: appTheme.colors.danger },
                ]}
              >
                Cancel Booking
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {booking.status === "cancelled" && booking.advance_amount > 0 && (
          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={handleRefund}
              style={[styles.actionButton, styles.gradientButton]}
            >
              <LinearGradient
                colors={appTheme.gradients.amber}
                style={StyleSheet.absoluteFill}
              />
              <DollarSign size={20} color="#ffffff" />
              <Text style={styles.actionButtonText}>Refund Payment</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <BottomSheetModal
        ref={paymentSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: appTheme.colors.surface }}
        handleIndicatorStyle={{ backgroundColor: appTheme.colors.border }}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Record Payment</Text>
          <Text style={styles.sheetSubtitle}>
            Enter the amount received from the customer.
          </Text>

          <View style={styles.sheetField}>
            <Text style={styles.sheetLabel}>Amount (Rs)</Text>
            <TextInput
              style={styles.sheetInput}
              placeholder="e.g. 5000"
              placeholderTextColor={appTheme.colors.textSubtle}
              keyboardType="number-pad"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              autoFocus
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.86}
            onPress={handleAddPayment}
            style={[styles.sheetPrimaryButton, styles.gradientButton]}
          >
            <LinearGradient
              colors={appTheme.gradients.primary}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.sheetButtonText}>Confirm Payment</Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={cancelSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: appTheme.colors.surface }}
        handleIndicatorStyle={{ backgroundColor: appTheme.colors.border }}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Cancel Booking</Text>
          <Text style={styles.sheetSubtitle}>
            Are you sure? You can record a refund below if needed.
          </Text>

          <View style={styles.sheetField}>
            <Text style={styles.sheetLabel}>Refund Amount (Rs)</Text>
            <TextInput
              style={styles.sheetInput}
              placeholder="0 (None)"
              placeholderTextColor={appTheme.colors.textSubtle}
              keyboardType="number-pad"
              value={refundAmount}
              onChangeText={setRefundAmount}
            />
            <Text style={styles.helperText}>
              Total received so far: Rs {booking.advance_amount}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.86}
            onPress={handleCancelConfirm}
            style={[styles.sheetPrimaryButton, styles.dangerButton]}
          >
            <Text style={styles.sheetButtonText}>Confirm Cancellation</Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheetModal>

      <ActionSheet
        sheetRef={alertSheetRef}
        title={alertConfig.title}
        message={alertConfig.message}
        status={alertConfig.status}
        actions={[{ label: "OK", onPress: () => alertConfig.onConfirm?.() }]}
      />

      <ActionSheet
        sheetRef={confirmSheetRef}
        title={confirmConfig.title}
        message={confirmConfig.message}
        status="info"
        actions={[
          { label: "Close", type: "cancel", onPress: () => {} },
          { label: "Confirm", onPress: confirmConfig.onConfirm },
        ]}
      />
    </AppScreen>
  );
}

function createStyles(appTheme: AppTheme) {
  return StyleSheet.create({
    centered: {
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      padding: appTheme.spacing.screen,
      paddingBottom: 110,
    },
    statusCard: {
      minHeight: 58,
      borderWidth: 1,
      borderRadius: appTheme.radius.lg,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    inlineRow: {
      flexDirection: "row",
      alignItems: "center",
      flexShrink: 1,
    },
    statusText: {
      marginLeft: 8,
      fontSize: 14,
      fontWeight: "900",
      textTransform: "capitalize",
    },
    idText: {
      color: appTheme.colors.textSubtle,
      fontSize: 12,
      fontWeight: "800",
    },
    card: {
      backgroundColor: appTheme.colors.glass,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      borderRadius: appTheme.radius.xl,
      padding: 20,
      marginBottom: 20,
      boxShadow: appTheme.shadow.soft,
    },
    cardOverflow: {
      backgroundColor: appTheme.colors.glass,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      borderRadius: appTheme.radius.xl,
      marginBottom: 20,
      overflow: "hidden",
      boxShadow: appTheme.shadow.soft,
    },
    cardPressable: {
      padding: 20,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      marginBottom: 12,
    },
    sectionLabel: {
      color: appTheme.colors.textSubtle,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.2,
      textTransform: "uppercase",
    },
    sectionLabelSpaced: {
      marginBottom: 16,
    },
    cardHeadingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 16,
    },
    flexContent: {
      flex: 1,
      minWidth: 0,
    },
    primaryTitle: {
      color: appTheme.colors.text,
      fontSize: 21,
      fontWeight: "900",
      marginBottom: 8,
    },
    metaText: {
      color: appTheme.colors.textMuted,
      fontSize: 14,
      marginLeft: 8,
      flexShrink: 1,
    },
    linkText: {
      color: appTheme.colors.primary,
      fontSize: 12,
      fontWeight: "900",
      textDecorationLine: "underline",
    },
    infoRowLarge: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
    },
    customerName: {
      color: appTheme.colors.text,
      fontSize: 18,
      fontWeight: "900",
      marginLeft: 12,
      flexShrink: 1,
    },
    bodyText: {
      color: appTheme.colors.textMuted,
      fontSize: 15,
      marginLeft: 12,
      flexShrink: 1,
    },
    documentGrid: {
      flexDirection: "row",
      gap: 14,
      marginTop: 4,
    },
    documentColumn: {
      flex: 1,
      minWidth: 0,
    },
    documentLabel: {
      color: appTheme.colors.textSubtle,
      fontSize: 10,
      fontWeight: "900",
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    documentImageFrame: {
      height: 96,
      width: "100%",
      backgroundColor: appTheme.colors.surfaceMuted,
      borderRadius: appTheme.radius.md,
      overflow: "hidden",
    },
    emptyDocumentFrame: {
      height: 96,
      width: "100%",
      backgroundColor: appTheme.colors.surfaceMuted,
      borderRadius: appTheme.radius.md,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: appTheme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyDocumentText: {
      color: appTheme.colors.textSubtle,
      fontSize: 10,
      fontWeight: "800",
    },
    documentImage: {
      width: "100%",
      height: "100%",
    },
    detailStack: {
      gap: 14,
    },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 16,
    },
    detailLabel: {
      color: appTheme.colors.textMuted,
      fontSize: 15,
      fontWeight: "700",
    },
    detailValue: {
      color: appTheme.colors.text,
      fontSize: 15,
      fontWeight: "900",
      flex: 1,
      textAlign: "right",
    },
    notesBlock: {
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: appTheme.colors.borderSoft,
      gap: 6,
    },
    notesText: {
      color: appTheme.colors.textMuted,
      fontSize: 15,
      lineHeight: 23,
    },
    paymentCard: {
      backgroundColor: appTheme.colors.surface,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      borderRadius: appTheme.radius.xl,
      padding: 20,
      marginBottom: 20,
      boxShadow: appTheme.shadow.soft,
    },
    paymentRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 16,
      marginBottom: 12,
    },
    microLabel: {
      color: appTheme.colors.textSubtle,
      fontSize: 10,
      fontWeight: "900",
      marginTop: 4,
      textTransform: "uppercase",
    },
    amountText: {
      color: appTheme.colors.text,
      fontSize: 15,
      fontWeight: "900",
      textAlign: "right",
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 16,
      paddingTop: 16,
      marginTop: 4,
      borderTopWidth: 1,
      borderTopColor: appTheme.colors.borderSoft,
    },
    totalLabel: {
      color: appTheme.colors.text,
      fontSize: 18,
      fontWeight: "900",
      flexShrink: 1,
    },
    totalAmount: {
      fontSize: 18,
      fontWeight: "900",
      textAlign: "right",
    },
    actions: {
      gap: 12,
      marginBottom: 28,
    },
    actionButton: {
      minHeight: 56,
      borderRadius: appTheme.radius.lg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "transparent",
    },
    gradientButton: {
      boxShadow: appTheme.shadow.action,
    },
    cancelButton: {
      backgroundColor: appTheme.colors.dangerSoft,
      borderColor: appTheme.isDark ? "rgba(255, 123, 123, 0.26)" : "#ffd2d2",
    },
    dangerButton: {
      backgroundColor: appTheme.colors.danger,
      borderColor: appTheme.colors.danger,
    },
    actionButtonText: {
      color: "#ffffff",
      fontSize: 17,
      fontWeight: "900",
    },
    sheetContent: {
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 44,
      backgroundColor: appTheme.colors.surface,
    },
    sheetTitle: {
      color: appTheme.colors.text,
      fontSize: 24,
      fontWeight: "900",
      marginBottom: 8,
    },
    sheetSubtitle: {
      color: appTheme.colors.textMuted,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 24,
    },
    sheetField: {
      marginBottom: 24,
    },
    sheetLabel: {
      color: appTheme.colors.textMuted,
      fontSize: 14,
      fontWeight: "800",
      marginBottom: 8,
    },
    sheetInput: {
      minHeight: 56,
      backgroundColor: appTheme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      borderRadius: appTheme.radius.md,
      paddingHorizontal: 16,
      color: appTheme.colors.text,
      fontSize: 20,
      fontWeight: "900",
    },
    helperText: {
      color: appTheme.colors.textSubtle,
      fontSize: 12,
      marginTop: 8,
      fontWeight: "700",
    },
    sheetPrimaryButton: {
      minHeight: 56,
      borderRadius: appTheme.radius.lg,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    sheetButtonText: {
      color: "#ffffff",
      fontSize: 17,
      fontWeight: "900",
    },
  });
}
