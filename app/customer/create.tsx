import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  createEmptyCustomerForm,
  CustomerDetailsForm,
  CustomerFormData,
} from "../../components/customer-details-form";
import { ActionSheet } from "../../components/ui/action-sheet";
import { CustomerRepository } from "../../services/customer-repository";

type AlertStatus = "success" | "error" | "info";

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

export default function CreateCustomer() {
  const router = useRouter();
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

  const updateField = useCallback(
    (field: keyof CustomerFormData, value: string) => {
      setForm((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
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

      if (existing) {
        showAlert(
          "Customer Exists",
          `A customer with this ${existing.phone === form.phone.trim() ? "phone number" : "CNIC"} already exists: ${existing.name}.`,
          "info",
          () => router.replace(`/customer/${existing.id}`),
        );
        return;
      }

      const created = await CustomerRepository.createCustomer({
        name: form.name.trim(),
        phone: form.phone.trim(),
        cnic: form.cnic.trim(),
        license_image_url: form.license_image_url,
        license_back_image_url: form.license_back_image_url,
        cnic_image_url: form.cnic_image_url,
        cnic_back_image_url: form.cnic_back_image_url,
      });

      if (created) {
        showAlert("Saved", "Customer created successfully.", "success", () =>
          router.back(),
        );
      } else {
        showAlert("Save Failed", "Failed to create customer.", "error");
      }
    } finally {
      setSaving(false);
    }
  }, [form, router, showAlert]);

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
