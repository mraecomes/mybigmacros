import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { colors } from '@/constants/theme';

function TabIcon(props: {
  name: ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 11,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.textPrimary,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="nearby"
        options={{
          title: 'Nearby',
          tabBarIcon: ({ color }) => <TabIcon name="map-marker" color={color} />,
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: 'Browse',
          tabBarIcon: ({ color }) => <TabIcon name="search" color={color} />,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Budget',
          tabBarIcon: ({ color }) => <TabIcon name="dollar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
