import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import type { Directory as ExpoDirectory } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Camera, Image as ImageIcon, Info, Plus, X } from "lucide-react-native";
import React, { useMemo, useRef } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { ActionSheet, ActionSheetAction } from "./ui/action-sheet";
import { AppTheme, useAppTheme } from "./ui/theme";

interface ImagePickerProps {
  value?: string;
  onImageSelected: (uri: string) => void;
  label: string;
}

interface MultiImagePickerProps {
  values: string[];
  onImagesSelected: (uris: string[]) => void;
  label: string;
  helper?: string;
  maxImages?: number;
}

let mediaDirectory: ExpoDirectory | null = null;

async function getMediaDirectory(): Promise<ExpoDirectory | null> {
  if (Platform.OS === "web") {
    return null;
  }

  const { Directory, Paths } = await import("expo-file-system");
  mediaDirectory ||= new Directory(Paths.document, "driveexa-media");

  return mediaDirectory;
}

function ensureMediaDirectory(directory: ExpoDirectory): ExpoDirectory {
  if (!directory.exists) {
    directory.create({ idempotent: true, intermediates: true });
  }

  return directory;
}

function getFileExtension(uri: string): string {
  const cleanUri = uri.split("?")[0];
  const extensionMatch = cleanUri.match(/\.[a-zA-Z0-9]+$/);
  return extensionMatch?.[0] || ".jpg";
}

async function persistImageUri(uri: string): Promise<string> {
  const selectedMediaDirectory = await getMediaDirectory();

  if (
    !uri ||
    !selectedMediaDirectory ||
    uri.startsWith(selectedMediaDirectory.uri)
  ) {
    return uri;
  }

  try {
    const { File } = await import("expo-file-system");
    const directory = ensureMediaDirectory(selectedMediaDirectory);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${getFileExtension(uri)}`;
    const sourceFile = new File(uri);
    const destinationFile = new File(directory, fileName);
    await sourceFile.copy(destinationFile, { overwrite: true });
    return destinationFile.uri;
  } catch (error) {
    console.warn("Unable to persist selected image:", error);
    return uri;
  }
}

export const ImagePickerComponent: React.FC<ImagePickerProps> = ({
  value,
  onImageSelected,
  label,
}) => {
  const appTheme = useAppTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(
    () => createStyles(appTheme, width),
    [appTheme, width],
  );
  const sheetRef = useRef<BottomSheetModal>(null);
  const [sheetConfig, setSheetConfig] = React.useState<{
    title: string;
    message: string;
    actions: ActionSheetAction[];
    status?: "info" | "error";
  }>({
    title: "Select Image",
    message: "Choose a source for your photo",
    actions: [],
  });

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: cameraStatus } =
      await ImagePicker.requestCameraPermissionsAsync();

    if (status !== "granted" || cameraStatus !== "granted") {
      setSheetConfig({
        title: "Permission Required",
        message: "We need access to your photos and camera to upload images.",
        status: "error",
        actions: [{ label: "OK", onPress: () => {} }],
      });
      sheetRef.current?.present();
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    setSheetConfig({
      title: "Select Image",
      message: "Choose a source for your photo",
      status: "info",
      actions: [
        { label: "Take Photo", onPress: handleCamera },
        { label: "Choose from Gallery", onPress: handleGallery },
        { label: "Cancel", type: "cancel", onPress: () => {} },
      ],
    });
    sheetRef.current?.present();
  };

  const handleCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.assets) return;
    onImageSelected(await persistImageUri(result.assets[0].uri));
  };

  const handleGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.assets) return;
    onImageSelected(await persistImageUri(result.assets[0].uri));
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {value ? (
        <View style={styles.previewFrame}>
          <Image
            source={{ uri: value }}
            style={styles.previewImage}
            contentFit="cover"
          />
          <TouchableOpacity
            onPress={() => onImageSelected("")}
            style={styles.removeButton}
          >
            <X size={20} color="white" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={pickImage} style={styles.uploadButton}>
          <View style={styles.iconRow}>
            <ImageIcon size={24} color={appTheme.colors.textMuted} />
            <Camera size={24} color={appTheme.colors.textMuted} />
          </View>
          <Text style={styles.uploadText}>Click to upload photo</Text>
        </TouchableOpacity>
      )}

      <ActionSheet
        sheetRef={sheetRef}
        title={sheetConfig.title}
        message={sheetConfig.message}
        status={sheetConfig.status}
        actions={sheetConfig.actions}
      />
    </View>
  );
};

export const MultiImagePickerComponent: React.FC<MultiImagePickerProps> = ({
  values,
  onImagesSelected,
  label,
  helper,
  maxImages = 10,
}) => {
  const appTheme = useAppTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(
    () => createStyles(appTheme, width),
    [appTheme, width],
  );
  const sheetRef = useRef<BottomSheetModal>(null);
  const [sheetConfig, setSheetConfig] = React.useState<{
    title: string;
    message: string;
    actions: ActionSheetAction[];
    status?: "info" | "error";
  }>({
    title: "Vehicle Gallery",
    message: "Add vehicle photos",
    actions: [],
  });

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: cameraStatus } =
      await ImagePicker.requestCameraPermissionsAsync();

    if (status !== "granted" || cameraStatus !== "granted") {
      setSheetConfig({
        title: "Permission Required",
        message: "We need access to your photos and camera to upload images.",
        status: "error",
        actions: [{ label: "OK", onPress: () => {} }],
      });
      sheetRef.current?.present();
      return false;
    }
    return true;
  };

  const openPickerOptions = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    setSheetConfig({
      title: "Vehicle Gallery",
      message: "Add one or multiple vehicle photos",
      status: "info",
      actions: [
        { label: "Take Photo", onPress: handleCamera },
        { label: "Choose Gallery", onPress: handleGallery },
        { label: "Cancel", type: "cancel", onPress: () => {} },
      ],
    });
    sheetRef.current?.present();
  };

  const addImages = (uris: string[]) => {
    const merged = [...values, ...uris].filter(
      (uri, index, allUris) => uri && allUris.indexOf(uri) === index,
    );
    onImagesSelected(merged.slice(0, maxImages));
  };

  const handleCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.82,
    });
    if (!result.assets) return;
    addImages([await persistImageUri(result.assets[0].uri)]);
  };

  const handleGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, maxImages - values.length),
      quality: 0.82,
    });
    if (!result.assets) return;
    addImages(
      await Promise.all(
        result.assets.map((asset) => persistImageUri(asset.uri)),
      ),
    );
  };

  const removeImage = (uri: string) => {
    onImagesSelected(values.filter((image) => image !== uri));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.galleryHeader}>
        <View style={styles.galleryTitleBlock}>
          <Text style={styles.label}>{label}</Text>
          {helper ? <Text style={styles.galleryHelper}>{helper}</Text> : null}
        </View>
        <View style={styles.galleryInfo}>
          <Text style={styles.countText}>
            {values.length}/{maxImages}
          </Text>
          <Info color={appTheme.colors.textMuted} size={19} strokeWidth={2.1} />
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.galleryScroller}
      >
        {values.map((uri) => (
          <View key={uri} style={styles.galleryTile}>
            <Image
              source={{ uri }}
              style={styles.previewImage}
              contentFit="cover"
            />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => removeImage(uri)}
              style={styles.galleryRemoveButton}
            >
              <X size={16} color="white" />
            </TouchableOpacity>
          </View>
        ))}
        {values.length < maxImages ? (
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={openPickerOptions}
            style={styles.galleryAddTile}
          >
            <View style={styles.galleryAddIcon}>
              <Plus size={28} color="#ffffff" strokeWidth={2.3} />
            </View>
            <Text style={styles.galleryAddText}>Add Image</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <ActionSheet
        sheetRef={sheetRef}
        title={sheetConfig.title}
        message={sheetConfig.message}
        status={sheetConfig.status}
        actions={sheetConfig.actions}
      />
    </View>
  );
};

function createStyles(appTheme: AppTheme, width: number) {
  const isCompact = width < 380;
  const isTablet = width >= 768;
  const galleryTileWidth = isCompact ? 190 : isTablet ? 280 : 235;
  const galleryTileHeight = isCompact ? 136 : isTablet ? 190 : 158;

  return StyleSheet.create({
    wrap: {
      gap: isCompact ? 10 : 14,
    },
    label: {
      color: appTheme.colors.text,
      fontSize: isCompact ? 17 : isTablet ? 22 : 19,
      fontWeight: "900",
      letterSpacing: 0,
    },
    previewFrame: {
      position: "relative",
      width: "100%",
      height: 192,
      borderRadius: appTheme.radius.lg,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.surfaceMuted,
    },
    previewImage: {
      width: "100%",
      height: "100%",
    },
    removeButton: {
      position: "absolute",
      top: 10,
      right: 10,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: "rgba(15, 23, 42, 0.62)",
      alignItems: "center",
      justifyContent: "center",
    },
    uploadButton: {
      width: "100%",
      height: 136,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.surfaceRaised,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    iconRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    uploadText: {
      color: appTheme.colors.textMuted,
      fontSize: 13,
      fontWeight: "800",
    },
    galleryHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    galleryTitleBlock: {
      flex: 1,
      minWidth: 0,
    },
    galleryHelper: {
      color: appTheme.colors.textMuted,
      fontSize: isCompact ? 13 : isTablet ? 17 : 15,
      lineHeight: isCompact ? 19 : isTablet ? 24 : 21,
      fontWeight: "600",
      marginTop: 4,
    },
    galleryInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    countText: {
      color: appTheme.colors.textMuted,
      fontSize: isCompact ? 12 : 13,
      fontWeight: "900",
      fontVariant: ["tabular-nums"],
    },
    galleryScroller: {
      gap: 12,
      paddingRight: 2,
    },
    galleryTile: {
      width: galleryTileWidth,
      height: galleryTileHeight,
      borderRadius: appTheme.radius.lg,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.surfaceMuted,
    },
    galleryRemoveButton: {
      position: "absolute",
      top: 9,
      right: 9,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "rgba(15, 23, 42, 0.68)",
      alignItems: "center",
      justifyContent: "center",
    },
    galleryAddTile: {
      width: galleryTileWidth,
      height: galleryTileHeight,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: "#a78bfa",
      backgroundColor: appTheme.isDark
        ? "rgba(109, 40, 245, 0.12)"
        : "rgba(109, 40, 245, 0.04)",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    galleryAddIcon: {
      width: isCompact ? 48 : 56,
      height: isCompact ? 48 : 56,
      borderRadius: isCompact ? 24 : 28,
      backgroundColor: "#6d28f5",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 12px 26px rgba(109, 40, 245, 0.26)",
    },
    galleryAddText: {
      color: "#6d28f5",
      fontSize: isCompact ? 14 : isTablet ? 18 : 16,
      fontWeight: "900",
      textAlign: "center",
    },
  });
}
