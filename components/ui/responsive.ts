import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

export type ResponsiveLayout = {
  width: number;
  isCompact: boolean;
  isNarrow: boolean;
  isTablet: boolean;
  contentPadding: number;
  contentWidth: number;
  cardGap: number;
  statColumns: number;
  carCardWidth: number;
};

export function useResponsiveLayout(): ResponsiveLayout {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    const isCompact = width < 380;
    const isNarrow = width < 430;
    const isTablet = width >= 768;
    const contentPadding = isCompact ? 14 : isTablet ? 24 : 16;
    const contentWidth = Math.max(0, width - contentPadding * 2);
    const cardGap = isCompact ? 8 : 12;
    const statColumns = isTablet ? 4 : 2;
    const carCardWidth = isCompact
      ? Math.max(168, contentWidth * 0.62)
      : isTablet
        ? 220
        : 205;

    return {
      width,
      isCompact,
      isNarrow,
      isTablet,
      contentPadding,
      contentWidth,
      cardGap,
      statColumns,
      carCardWidth,
    };
  }, [width]);
}
