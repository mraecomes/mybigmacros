import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors, radii, spacing, typography } from '@/constants/theme';

const FDA_PROTEIN_DV = 50;
const FDA_FIBER_DV = 28;

const RING_SIZE = 180;
const RING_CX = 90;
const RING_CY = 90;
const RING_R = 70;
const RING_STROKE = 12;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

const ARC_WIDTH = 120;
const ARC_HEIGHT = 68;
const ARC_CX = 60;
const ARC_CY = 58;
const ARC_R = 48;
const ARC_STROKE = 10;
const ARC_HALF_CIRC = Math.PI * ARC_R;
const ARC_PATH = `M ${ARC_CX - ARC_R} ${ARC_CY} A ${ARC_R} ${ARC_R} 0 0 1 ${ARC_CX + ARC_R} ${ARC_CY}`;

// Combined height of arcTopZone + arcSvgZone — used to size the null state zone
// so both columns stay the same total height regardless of data availability
const ARC_NULL_ZONE_H = 28 + (ARC_HEIGHT + spacing.sm);

// Bottom offset for the tooltip within arcCol — places it just above the label zone
// arcCol total height = ARC_NULL_ZONE_H (104) + arcLabelZone (20) = 124
// label zone top edge is 20px from arcCol's bottom; +4px gap = 24
const TOOLTIP_BOTTOM = 24;

type MacroMeterProps = {
  calories: number | null;
  dailyCalorieGoal: number | null;
  protein_g: number | null;
  fiber_g: number | null;
};

export function MacroMeter({ calories, dailyCalorieGoal, protein_g, fiber_g }: MacroMeterProps) {
  if (calories === null) {
    return (
      <View style={styles.container}>
        <View style={styles.unavailableBox}>
          <Text style={styles.unavailableText}>Calories unavailable</Text>
        </View>
        <MacroRow protein_g={protein_g} fiber_g={fiber_g} />
      </View>
    );
  }

  const hasGoal = dailyCalorieGoal !== null && dailyCalorieGoal > 0;
  // Raw percentage — uncapped so the label shows the real number (e.g. 124% of goal)
  const percentage = hasGoal ? calories / dailyCalorieGoal! : 0;
  // Arc fill is visually capped at full circle — the ring can't overflow
  const fillLength = Math.min(percentage, 1) * RING_CIRCUMFERENCE;

  return (
    <View style={styles.container}>
      <View style={styles.ringWrap}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          {/* Track */}
          <Circle
            cx={RING_CX}
            cy={RING_CY}
            r={RING_R}
            fill="none"
            stroke={colors.border}
            strokeWidth={RING_STROKE}
          />
          {/* Fill arc — only when daily goal is set */}
          {hasGoal && (
            <Circle
              cx={RING_CX}
              cy={RING_CY}
              r={RING_R}
              fill="none"
              stroke={colors.primary}
              strokeWidth={RING_STROKE}
              strokeDasharray={[fillLength, RING_CIRCUMFERENCE]}
              strokeLinecap="round"
              rotation={-90}
              origin={`${RING_CX}, ${RING_CY}`}
            />
          )}
          {/* Calorie count */}
          <SvgText
            x={RING_CX}
            y={hasGoal ? RING_CY - 8 : RING_CY + 2}
            textAnchor="middle"
            fontFamily={typography.fontFamily.bodyBold}
            fontSize={hasGoal ? 28 : 36}
            fill={colors.textPrimary}
          >
            {calories.toLocaleString()}
          </SvgText>
          {/* "cal" unit label */}
          <SvgText
            x={RING_CX}
            y={hasGoal ? RING_CY + 10 : RING_CY + 20}
            textAnchor="middle"
            fontFamily={typography.fontFamily.body}
            fontSize={12}
            fill={colors.textSecondary}
          >
            cal
          </SvgText>
          {/* Real percentage — uncapped, acts as visual warning when over goal */}
          {hasGoal && (
            <SvgText
              x={RING_CX}
              y={RING_CY + 27}
              textAnchor="middle"
              fontFamily={typography.fontFamily.bodySemiBold}
              fontSize={12}
              fill={colors.primary}
            >
              {Math.round(percentage * 100)}% of goal
            </SvgText>
          )}
        </Svg>
      </View>

      <MacroRow protein_g={protein_g} fiber_g={fiber_g} />
    </View>
  );
}

function MacroRow({ protein_g, fiber_g }: { protein_g: number | null; fiber_g: number | null }) {
  return (
    <View style={styles.macroRow}>
      <MacroArc label="Protein" value={protein_g} dv={FDA_PROTEIN_DV} arcOpacity={1} anchorSide="left" />
      <MacroArc label="Fiber" value={fiber_g} dv={FDA_FIBER_DV} arcOpacity={0.55} anchorSide="right" />
    </View>
  );
}

function MacroArc({
  label,
  value,
  dv,
  arcOpacity,
  anchorSide,
}: {
  label: string;
  value: number | null;
  dv: number;
  arcOpacity: number;
  anchorSide: 'left' | 'right';
}) {
  const [visible, setVisible] = useState(false);

  const percentage = value !== null ? Math.min(value / dv, 1) : 0;
  const fillLength = percentage * ARC_HALF_CIRC;
  const dvPercent = value !== null ? Math.round(percentage * 100) : 0;
  const tooltipText = `Based on FDA daily value of ${dv}g ${label.toLowerCase()}`;

  return (
    <View style={styles.arcCol}>
      {value !== null ? (
        <>
          {/* Gram value */}
          <View style={styles.arcTopZone}>
            <Text style={styles.arcValue}>{value}g</Text>
          </View>

          {/* Semicircle arc */}
          <View style={styles.arcSvgZone}>
            <Svg width={ARC_WIDTH} height={ARC_HEIGHT}>
              <Path
                d={ARC_PATH}
                fill="none"
                stroke={colors.border}
                strokeWidth={ARC_STROKE}
                strokeLinecap="round"
              />
              <Path
                d={ARC_PATH}
                fill="none"
                stroke={colors.secondary}
                strokeWidth={ARC_STROKE}
                strokeLinecap="round"
                strokeDasharray={[fillLength, ARC_HALF_CIRC]}
                strokeOpacity={arcOpacity}
              />
            </Svg>
          </View>
        </>
      ) : (
        // Null state: "Not available" centered in the combined zone height
        // so the column stays the same size as the data-present case
        <View style={styles.arcNullZone}>
          <Text style={styles.arcUnavailable}>Not available</Text>
        </View>
      )}

      {/* Label zone */}
      <View style={styles.arcLabelZone}>
        {value !== null ? (
          <Pressable
            onPress={Platform.OS !== 'web' ? () => setVisible(v => !v) : undefined}
            onHoverIn={() => setVisible(true)}
            onHoverOut={() => setVisible(false)}
            style={styles.labelTouchable}
            accessibilityRole="button"
            accessibilityLabel={`${label} daily value info`}
          >
            <Text style={styles.arcLabel}>{label} · {dvPercent}% DV</Text>
            <FontAwesome
              name="info-circle"
              size={11}
              color={visible ? colors.secondary : colors.textSecondary}
            />
          </Pressable>
        ) : (
          <Text style={styles.arcLabel}>{label}</Text>
        )}
      </View>

      {/* Tooltip — absolute within arcCol, opens toward screen center */}
      {value !== null && visible && (
        <View style={[
          styles.tooltipBox,
          anchorSide === 'left' ? { left: 0 } : { right: 0 },
        ]}>
          <Text style={styles.tooltipText}>{tooltipText}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.md,
  },
  unavailableBox: {
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  ringWrap: {
    alignItems: 'center',
  },
  macroRow: {
    flexDirection: 'row',
    width: '100%',
  },
  arcCol: {
    flex: 1,
    alignItems: 'center',
  },
  arcTopZone: {
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  arcValue: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.lg,
    color: colors.textPrimary,
  },
  arcSvgZone: {
    height: ARC_HEIGHT + spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Replaces arcTopZone + arcSvgZone when value is null —
  // same total height so the column doesn't shift
  arcNullZone: {
    height: ARC_NULL_ZONE_H,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  arcUnavailable: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  arcLabelZone: {
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  labelTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  arcLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tooltipBox: {
    position: 'absolute',
    bottom: TOOLTIP_BOTTOM,
    width: 150,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: spacing.sm,
    zIndex: 100,
    elevation: 4,
  },
  tooltipText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    lineHeight: typography.fontSize.xs * typography.lineHeight.relaxed,
  },
});
