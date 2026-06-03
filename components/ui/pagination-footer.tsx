import { ChevronLeft, ChevronRight } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card, FilterChip, IconButton } from "./primitives";
import { theme } from "./theme";

interface PaginationFooterProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const PaginationFooter: React.FC<PaginationFooterProps> = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const pageSizes = [50, 100, 200, 500];

  return (
    <Card style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.rangeText}>
          Showing {Math.min(totalItems, (currentPage - 1) * pageSize + 1)}-
          {Math.min(totalItems, currentPage * pageSize)} of {totalItems}
        </Text>

        <View style={styles.pageSizes}>
          {pageSizes.map((size) => (
            <FilterChip
              key={size}
              label={size.toString()}
              selected={pageSize === size}
              onPress={() => onPageSizeChange(size)}
            />
          ))}
        </View>
      </View>

      <View style={styles.navRow}>
        <IconButton
          icon={ChevronLeft}
          disabled={currentPage === 1}
          onPress={() => onPageChange(currentPage - 1)}
          color={
            currentPage === 1 ? theme.colors.textSubtle : theme.colors.primary
          }
        />

        <Text style={styles.pageText}>
          Page {currentPage} of {totalPages}
        </Text>

        <IconButton
          icon={ChevronRight}
          disabled={currentPage === totalPages}
          onPress={() => onPageChange(currentPage + 1)}
          color={
            currentPage === totalPages
              ? theme.colors.textSubtle
              : theme.colors.primary
          }
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
    marginTop: 8,
  },
  topRow: {
    gap: 12,
  },
  rangeText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  pageSizes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  pageText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
});
