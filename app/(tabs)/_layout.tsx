import { LinearGradient } from "expo-linear-gradient";
import { Tabs, useRouter } from "expo-router";
import { CalendarPlus, CarFront, Home, User, Users } from "lucide-react-native";
import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ResponsiveLayout,
  useResponsiveLayout,
} from "../../components/ui/responsive";
import { AppTheme, useAppTheme } from "../../components/ui/theme";

const purple = "#6d28f5";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const layout = useResponsiveLayout();
  const appTheme = useAppTheme();
  const styles = useMemo(
    () => createStyles(appTheme, layout),
    [appTheme, layout],
  );
  const activeColor = appTheme.isDark ? "#c8b5ff" : purple;
  const iconSize = layout.isCompact ? 21 : 24;
  const homeIconSize = layout.isCompact ? 22 : 25;
  const quickIconSize = layout.isCompact ? 23 : 27;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: appTheme.colors.textSubtle,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        tabBarStyle: [
          styles.tabBar,
          {
            height: (layout.isCompact ? 68 : 76) + insets.bottom,
            paddingBottom: Math.max(insets.bottom, layout.isCompact ? 7 : 9),
          },
        ],
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Home
              size={focused ? homeIconSize : iconSize}
              color={color}
              fill={focused ? color : "transparent"}
              strokeWidth={2.2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="cars"
        options={{
          title: "Cars",
          tabBarIcon: ({ color }) => (
            <CarFront size={iconSize} color={color} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "",
          tabBarLabel: "",
          tabBarButton: () => (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push("/cars")}
              style={styles.quickButtonWrap}
            >
              <LinearGradient
                colors={
                  appTheme.isDark
                    ? ["#9b6dff", "#6d28f5", "#4c1d95"]
                    : ["#8140ff", "#5f20e6"]
                }
                style={styles.quickButton}
              >
                <CalendarPlus
                  color="#ffffff"
                  size={quickIconSize}
                  strokeWidth={2.2}
                />
                <Text numberOfLines={1} style={styles.quickButtonText}>
                  Quick Booking
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: "Customers",
          tabBarIcon: ({ color }) => (
            <Users size={iconSize} color={color} strokeWidth={2.1} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <User size={iconSize} color={color} strokeWidth={2.1} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

function createStyles(appTheme: AppTheme, layout: ResponsiveLayout) {
  const quickSize = layout.isCompact ? 80 : 96;

  return StyleSheet.create({
    tabBar: {
      position: "absolute",
      left: layout.isCompact ? 10 : 16,
      right: layout.isCompact ? 10 : 16,
      bottom: layout.isCompact ? 8 : 10,
      borderTopWidth: 0,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      borderRadius: layout.isCompact ? 22 : 26,
      backgroundColor: appTheme.colors.glass,
      paddingTop: layout.isCompact ? 7 : 10,
      paddingHorizontal: layout.isCompact ? 5 : 8,
      boxShadow: appTheme.isDark
        ? "0 16px 34px rgba(0, 0, 0, 0.36)"
        : "0 12px 34px rgba(16, 24, 39, 0.14)",
    },
    item: {
      paddingTop: layout.isCompact ? 1 : 2,
    },
    label: {
      fontSize: layout.isCompact ? 10 : 11,
      fontWeight: "800",
      marginTop: 1,
    },
    quickButtonWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      marginTop: layout.isCompact ? -25 : -32,
    },
    quickButton: {
      width: quickSize,
      height: quickSize,
      borderRadius: quickSize / 2,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: layout.isCompact ? 5 : 7,
      borderColor: appTheme.isDark
        ? appTheme.colors.backgroundElevated
        : "#f4f0ff",
      boxShadow: appTheme.isDark
        ? "0 18px 34px rgba(109, 40, 245, 0.42)"
        : "0 18px 32px rgba(109, 40, 245, 0.34)",
    },
    quickButtonText: {
      color: "#ffffff",
      fontSize: layout.isCompact ? 9 : 10,
      fontWeight: "900",
      marginTop: layout.isCompact ? 3 : 5,
      maxWidth: layout.isCompact ? 62 : 78,
      textAlign: "center",
    },
  });
}
