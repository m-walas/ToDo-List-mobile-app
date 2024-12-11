// src/navigation/MainTabNavigator.js
import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import GitHubTasksScreen from '../screens/GitHubTasksScreen';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme, Avatar } from 'react-native-paper';
import { createStackNavigator } from '@react-navigation/stack';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import CreateBoardScreen from '../screens/CreateBoardScreen';
import BoardTasksScreen from '../screens/BoardTasksScreen';
import AllTasksScreen from '../screens/AllTasksScreen';
import CalendarScreen from '../screens/CalendarScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

export default function MainTabNavigator() {
  const { colors } = useTheme();
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    const fetchAvatar = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setAvatar(userData.avatar);
        }
      }
    };
    fetchAvatar();
  }, []);

  const ProfileIcon = () => {
    if (avatar) {
      return <Avatar.Image size={24} source={{ uri: avatar }} />;
    } else {
      return <Icon name="person" size={24} color={colors.text} />;
    }
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Calendar') {
            iconName = 'calendar';
          } else if (route.name === 'AllTasks') {
            iconName = 'list';
          } else if (route.name === 'GitHubTasks') {
            iconName = 'logo-github';
          } else if (route.name === 'Profile') {
            return <ProfileIcon />;
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="AllTasks" component={AllTasksScreen} />
      <Tab.Screen name="GitHubTasks" component={GitHubTasksScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function HomeStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="HomeScreen" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateBoardScreen" component={CreateBoardScreen} options={{ title: 'Stwórz Tablicę' }} />
      <Stack.Screen name="BoardTasksScreen" component={BoardTasksScreen} options={{ title: 'Zadania Tablicy' }} />
    </Stack.Navigator>
  );
}
