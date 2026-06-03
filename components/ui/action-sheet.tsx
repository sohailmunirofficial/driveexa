import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Info,
} from "lucide-react-native";
import React, { useCallback, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppTheme, useAppTheme } from "./theme";

export interface ActionSheetAction {
  label: string;
  onPress: () => void;
  type?: "default" | "destructive" | "cancel";
}

interface ActionSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  title?: string;
  message?: string;
  actions: ActionSheetAction[];
  status?: "success" | "error" | "info" | "question";
}

export const ActionSheet: React.FC<ActionSheetProps> = ({
  sheetRef,
  title,
  message,
  actions,
  status,
}) => {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const snapPoints = useMemo(() => ["50%", "75%"], []);

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

  const getStatusIcon = () => {
    switch (status) {
      case "success":
        return <CheckCircle2 size={46} color={appTheme.colors.success} />;
      case "error":
        return <AlertCircle size={46} color={appTheme.colors.danger} />;
      case "info":
        return <Info size={46} color={appTheme.colors.primary} />;
      case "question":
        return <HelpCircle size={46} color={appTheme.colors.accent} />;
      default:
        return null;
    }
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: appTheme.colors.surface }}
      handleIndicatorStyle={{ backgroundColor: appTheme.colors.border }}
    >
      <BottomSheetView style={styles.contentContainer}>
        {status && <View style={styles.iconContainer}>{getStatusIcon()}</View>}
        {title && <Text style={styles.title}>{title}</Text>}
        {message && <Text style={styles.message}>{message}</Text>}

        <View style={styles.actionsContainer}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.actionButton,
                action.type === "destructive" && styles.destructiveButton,
                action.type === "cancel" && styles.cancelButton,
              ]}
              onPress={() => {
                action.onPress();
                sheetRef.current?.dismiss();
              }}
            >
              <Text
                style={[
                  styles.actionText,
                  action.type === "destructive" && styles.destructiveText,
                  action.type === "cancel" && styles.cancelText,
                ]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

function createStyles(appTheme: AppTheme) {
  return StyleSheet.create({
    contentContainer: {
      padding: appTheme.spacing.screen,
      paddingBottom: 80,
      alignItems: "center",
    },
    iconContainer: {
      width: 70,
      height: 70,
      borderRadius: appTheme.radius.xl,
      backgroundColor: appTheme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 18,
    },
    title: {
      fontSize: 22,
      fontWeight: "900",
      color: appTheme.colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    message: {
      fontSize: 15,
      color: appTheme.colors.textMuted,
      textAlign: "center",
      marginBottom: 24,
      lineHeight: 22,
    },
    actionsContainer: {
      width: "100%",
      gap: 12,
    },
    actionButton: {
      width: "100%",
      minHeight: 52,
      paddingVertical: 14,
      backgroundColor: appTheme.colors.primary,
      borderRadius: appTheme.radius.md,
      alignItems: "center",
      justifyContent: "center",
      boxShadow: appTheme.shadow.action,
    },
    actionText: {
      fontSize: 16,
      fontWeight: "900",
      color: "#ffffff",
    },
    destructiveButton: {
      backgroundColor: appTheme.colors.dangerSoft,
      boxShadow: "none",
    },
    destructiveText: {
      color: appTheme.colors.danger,
    },
    cancelButton: {
      backgroundColor: "transparent",
      boxShadow: "none",
      marginTop: 0,
    },
    cancelText: {
      color: appTheme.colors.textMuted,
    },
  });
}
