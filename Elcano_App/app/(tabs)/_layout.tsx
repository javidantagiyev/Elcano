import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#FF8C00', 
      headerShown: false,
      tabBarStyle: { height: 60, paddingBottom: 10 }
    }}>
      {/* Tab 1: Offers */}
      <Tabs.Screen
        name="offers"
        options={{
          title: 'Offers',
          tabBarIcon: ({ color }) => <Ionicons name="pricetag-outline" size={24} color={color} />,
        }}
      />
      
      {/* Tab 2: Leaderboard */}
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Ranking',
          tabBarIcon: ({ color }) => <Ionicons name="trophy-outline" size={24} color={color} />,
        }}
      />

      {/* Tab 3: Achievements */}
      <Tabs.Screen
        name="achievements"
        options={{
          title: 'Achievements',
          tabBarIcon: ({ color }) => <Ionicons name="ribbon-outline" size={24} color={color} />,
        }}
      />

      {/* Tab 3: Main / Dashboard (Middle) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Main',
          tabBarIcon: ({ color }) => <Ionicons name="walk-outline" size={32} color={color} />,
        }}
      />

      {/* Tab 4: Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
        }}
      />

      {/* Tab 5: Live Step Tracker */}
      <Tabs.Screen
        name="tracker"
        options={{
          title: 'Tracker',
          tabBarIcon: ({ color }) => <Ionicons name="pulse-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}