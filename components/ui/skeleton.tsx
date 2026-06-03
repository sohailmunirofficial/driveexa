import { useEffect, useState } from "react";
import { Animated, View, ViewStyle } from "react-native";

interface SkeletonProps {
  width?: ViewStyle["width"];
  height?: ViewStyle["height"];
  borderRadius?: number;
  className?: string;
}

export function Skeleton({
  width = "100%",
  height = 20,
  borderRadius = 8,
  className = "",
}: SkeletonProps) {
  const [opacity] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [opacity]);

  return (
    <View
      className={`bg-slate-200 ${className}`}
      style={{
        width,
        height,
        borderRadius,
      }}
    >
      <Animated.View
        style={{
          opacity,
          width: "100%",
          height: "100%",
        }}
      />
    </View>
  );
}

// Card Skeleton for dashboard stats cards
export function CardSkeleton() {
  return (
    <View className="bg-white p-4 rounded-2xl w-[47%]">
      <Skeleton width={40} height={40} borderRadius={20} className="mb-3" />
      <Skeleton width="60%" height={14} className="mb-2" />
      <Skeleton width="80%" height={24} />
    </View>
  );
}

// List Item Skeleton for bookings, customers, cars
export function ListItemSkeleton() {
  return (
    <View className="bg-white p-4 rounded-2xl mb-4 border border-slate-100">
      <View className="flex-row items-center mb-3">
        <Skeleton width={48} height={48} borderRadius={24} className="mr-4" />
        <View className="flex-1">
          <Skeleton width="70%" height={18} className="mb-2" />
          <Skeleton width="50%" height={14} />
        </View>
      </View>
      <View className="pt-3 border-t border-slate-50">
        <Skeleton width="40%" height={12} className="mb-2" />
        <View className="flex-row gap-2">
          <Skeleton width={60} height={24} borderRadius={6} />
          <Skeleton width={60} height={24} borderRadius={6} />
        </View>
      </View>
    </View>
  );
}

// Car Card Skeleton
export function CarCardSkeleton() {
  return (
    <View className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6">
      <Skeleton width="100%" height={176} borderRadius={0} />
      <View className="p-4">
        <View className="flex-row justify-between items-start mb-1">
          <Skeleton width="60%" height={20} className="mb-2" />
          <Skeleton width="25%" height={20} />
        </View>
        <Skeleton width="40%" height={14} className="mb-4" />
        <View className="flex-row justify-between items-center pt-4 border-t border-slate-50">
          <Skeleton width="35%" height={12} />
          <Skeleton width="25%" height={16} />
        </View>
      </View>
    </View>
  );
}

// Table/Report Row Skeleton
export function TableRowSkeleton() {
  return (
    <View className="flex-row items-center justify-between p-4 bg-white border-b border-slate-100">
      <Skeleton width="30%" height={16} />
      <Skeleton width="20%" height={16} />
      <Skeleton width="15%" height={16} />
      <Skeleton width="20%" height={16} />
    </View>
  );
}

// Stats Card Skeleton (for reports page)
export function StatsCardSkeleton() {
  return (
    <View className="bg-white p-4 rounded-xl border border-slate-100 mb-4">
      <Skeleton width="50%" height={14} className="mb-2" />
      <Skeleton width="40%" height={28} />
    </View>
  );
}
