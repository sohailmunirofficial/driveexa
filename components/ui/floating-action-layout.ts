export type FloatingActionLayout = {
  buttonSize: number;
  buttonBottom: number;
  listBottomPadding: number;
};

export function getFloatingActionLayout(
  width: number,
  bottomInset: number,
): FloatingActionLayout {
  const isTiny = width < 360;
  const isCompact = width < 380;
  const isTablet = width >= 768;
  const tabBarBottom = isCompact ? 8 : 10;
  const tabBarHeight = (isCompact ? 76 : 84) + bottomInset;
  const buttonSize = isTiny ? 82 : isTablet ? 112 : 96;
  const buttonBottom =
    tabBarBottom + tabBarHeight + (isTiny ? 12 : isTablet ? 22 : 16);
  const listBottomPadding = buttonBottom + buttonSize + (isTiny ? 22 : 30);

  return {
    buttonSize,
    buttonBottom,
    listBottomPadding,
  };
}
