import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

type UserAvatarProps = {
  name: string;
  imageUri?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function getNameInitials(name: string, fallback = "NA"): string {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || fallback;
}

export function UserAvatar({
  name,
  imageUri,
  size = 48,
  style,
}: UserAvatarProps) {
  const [failedImageUri, setFailedImageUri] = useState<string | null>(null);
  const normalizedImageUri = imageUri?.trim() || null;
  const initials = useMemo(() => getNameInitials(name), [name]);
  const showImage =
    normalizedImageUri !== null && normalizedImageUri !== failedImageUri;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: normalizedImageUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={120}
          onError={() => setFailedImageUri(normalizedImageUri)}
        />
      ) : (
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          numberOfLines={1}
          style={[styles.initials, { fontSize: Math.max(13, size * 0.34) }]}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#9a67ff",
    backgroundColor: "#ede7ff",
  },
  initials: {
    color: "#6d28f5",
    fontWeight: "900",
    letterSpacing: 0,
  },
});
