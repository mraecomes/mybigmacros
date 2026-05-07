import { AppName } from '@/components/ui/AppName';
import { colors, typography } from '@/constants/theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, usePathname, type Href } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

type NavItem = {
  label: string;
  segment: string;
  route: string;
  icon: ComponentProps<typeof FontAwesome>['name'];
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Nearby', segment: 'nearby', route: '/nearby', icon: 'map-marker' },
  { label: 'Browse', segment: 'browse', route: '/browse', icon: 'search' },
  { label: 'Budget', segment: 'budget', route: '/budget', icon: 'dollar' },
  { label: 'Profile', segment: 'profile', route: '/profile', icon: 'user' },
];

const NAV_HEIGHT = 60;
const HAMBURGER_BREAKPOINT = 768;

export function TopNav() {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isNarrow = width < HAMBURGER_BREAKPOINT;
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isNarrow) setMenuOpen(false);
  }, [isNarrow]);

  function navigate(route: string) {
    router.push(route as Href);
    setMenuOpen(false);
  }

  return (
    <View style={styles.container}>
      <AppName size="header" />

      {isNarrow ? (
        <Pressable
          onPress={() => setMenuOpen((prev) => !prev)}
          style={({ pressed }) => [styles.hamburger, pressed && styles.pressed]}
          accessibilityLabel={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          accessibilityRole="button"
        >
          <FontAwesome
            name={menuOpen ? 'times' : 'bars'}
            size={20}
            color={colors.textPrimary}
          />
        </Pressable>
      ) : (
        <View style={styles.navItems}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.includes(item.segment);
            return (
              <Pressable
                key={item.segment}
                onPress={() => navigate(item.route)}
                style={({ pressed }) => [
                  styles.navItem,
                  pressed && styles.pressed,
                ]}
              >
                <FontAwesome
                  name={item.icon}
                  size={18}
                  color={isActive ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {item.label}
                </Text>
                {isActive && <View style={styles.activeUnderline} />}
              </Pressable>
            );
          })}
        </View>
      )}

      {menuOpen && (
        <View style={styles.dropdown}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.includes(item.segment);
            return (
              <Pressable
                key={item.segment}
                onPress={() => navigate(item.route)}
                style={({ pressed }) => [
                  styles.dropdownItem,
                  pressed && styles.dropdownItemPressed,
                ]}
              >
                {isActive && <View style={styles.dropdownActiveBar} />}
                <FontAwesome
                  name={item.icon}
                  size={16}
                  color={isActive ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.dropdownLabel,
                    isActive && styles.dropdownLabelActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 24,
    height: NAV_HEIGHT,
    zIndex: 100,
  },

  // Wide nav items
  navItems: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    height: NAV_HEIGHT,
    position: 'relative',
  },
  navLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 3,
  },
  navLabelActive: {
    color: colors.primary,
  },
  activeUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },

  // Hamburger button
  hamburger: {
    padding: 8,
    borderRadius: 6,
  },
  pressed: {
    opacity: 0.7,
  },

  // Dropdown menu
  dropdown: {
    position: 'absolute',
    top: NAV_HEIGHT,
    right: 0,
    minWidth: 180,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    zIndex: 101,
    shadowColor: colors.overlay,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    overflow: 'visible',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    position: 'relative',
  },
  dropdownItemPressed: {
    backgroundColor: colors.background,
  },
  dropdownLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  dropdownLabelActive: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.primary,
  },
  dropdownActiveBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.primary,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
});
