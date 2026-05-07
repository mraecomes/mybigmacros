import { AppName } from '@/components/ui/AppName';
import { TopNav } from '@/components/navigation/TopNav';
import { colors } from '@/constants/theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform, View } from 'react-native';

function TabIcon(props: {
  name: ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} {...props} />;
}

const isWeb = Platform.OS === 'web';

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      {isWeb && <TopNav />}
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: isWeb
            ? { display: 'none' }
            : {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
              },
          tabBarLabelStyle: {
            fontSize: 11,
          },
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerShadowVisible: false,
          headerTitle: () => <AppName size="header" />,
          headerTitleAlign: 'center',
          headerShown: !isWeb,
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
    </View>
  );
}
