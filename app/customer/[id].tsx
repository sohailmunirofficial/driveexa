import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import {
  createEmptyCustomerForm,
  customerToForm,
  CustomerDetailsForm,
  CustomerFormData,
} from "../../components/customer-details-form";
import { ActionSheet } from "../../components/ui/action-sheet";
import { AppScreen } from "../../components/ui/primitives";
import { theme } from "../../components/ui/theme";
import { CustomerRepository } from "../../services/customer-repository";

type AlertStatus = "success" | "error" | "info";

function getParamId(id: string | string[] | undefined): number | null {
  const rawId = Array.isArray(id) ? id[0] : id;
  const numericId = Number(rawId);
  return Number.isFinite(numericId) ? numericId : null;
}

function validateCustomerForm(form: CustomerFormData): string | null {
  if (!form.name.trim()) {
    return "Full name is required.";
  }

  if (!form.phone.trim()) {
    return "Phone number is required.";
  }

  if (!form.cnic.trim()) {
    return "CNIC number is required.";
  }

  if (
    (form.license_image_url || form.license_back_image_url) &&
    (!form.license_image_url || !form.license_back_image_url)
  ) {
    return "Please upload both front and back license images.";
  }

  if (
    (form.cnic_image_url || form.cnic_back_image_url) &&
    (!form.cnic_image_url || !form.cnic_back_image_url)
  ) {
    return "Please upload both front and back CNIC images.";
  }

  return null;
}

export default function EditCustomer() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const customerId = getParamId(id);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CustomerFormData>(createEmptyCustomerForm);
  const alertSheetRef = useRef<BottomSheetModal>(null);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    status: AlertStatus;
    onConfirm?: () => void;
  }>({ title: "", message: "", status: "info" });

  const showAlert = useCallback(
    (
      title: string,
      message: string,
      status: AlertStatus,
      onConfirm?: () => void,
    ) => {
      setAlertConfig({ title, message, status, onConfirm });
      alertSheetRef.current?.present();
    },
    [],
  );

  const loadCustomer = useCallback(async () => {
    if (customerId === null) {
      showAlert(
        "Invalid Customer",
        "Customer record was not found.",
        "error",
        () => router.back(),
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    const customer = await CustomerRepository.getCustomerById(customerId);

    if (customer) {
      setForm(customerToForm(customer));
    } else {
      showAlert("Not Found", "Customer record was not found.", "error", () =>
        router.back(),
      );
    }

    setLoading(false);
  }, [customerId, router, showAlert]);

  useFocusEffect(
    useCallback(() => {
      void loadCustomer();
    }, [loadCustomer]),
  );

  const updateField = useCallback(
    (field: keyof CustomerFormData, value: string) => {
      setForm((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (customerId === null) {
      showAlert("Invalid Customer", "Customer record was not found.", "error");
      return;
    }

    const validationError = validateCustomerForm(form);
    if (validationError) {
      showAlert("Missing Details", validationError, "error");
      return;
    }

    setSaving(true);
    try {
      const existing = await CustomerRepository.checkDuplicate(
        form.phone.trim(),
        form.cnic.trim(),
      );

      if (existing && existing.id !== customerId) {
        showAlert(
          "Customer Exists",
          `A customer with this ${existing.phone === form.phone.trim() ? "phone number" : "CNIC"} already exists: ${existing.name}.`,
          "info",
          () => router.replace(`/customer/${existing.id}`),
        );
        return;
      }

      const success = await CustomerRepository.updateCustomer(customerId, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        cnic: form.cnic.trim(),
        license_image_url: form.license_image_url,
        license_back_image_url: form.license_back_image_url,
        cnic_image_url: form.cnic_image_url,
        cnic_back_image_url: form.cnic_back_image_url,
      });

      if (success) {
        showAlert(
          "Saved",
          "Customer details updated successfully.",
          "success",
          () => router.back(),
        );
      } else {
        showAlert("Save Failed", "Failed to update customer.", "error");
      }
    } finally {
      setSaving(false);
    }
  }, [customerId, form, router, showAlert]);

  if (loading) {
    return (
      <AppScreen style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </AppScreen>
    );
  }

  return (
    <>
      <CustomerDetailsForm
        form={form}
        title="Customer Details"
        subtitle="Add or update customer information and documents."
        saveLabel="Save Customer"
        saving={saving}
        onBack={() => router.back()}
        onChange={updateField}
        onSave={handleSave}
      />

      <ActionSheet
        sheetRef={alertSheetRef}
        title={alertConfig.title}
        message={alertConfig.message}
        status={alertConfig.status}
        actions={[{ label: "OK", onPress: () => alertConfig.onConfirm?.() }]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
});
