// src/navigation/AppNavigator.js

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MainTabNavigator from './MainTabNavigator';
import TaskModal from '../screens/TaskModal';
import AddTaskScreen from '../screens/AddTaskScreen';

const RootStack = createStackNavigator();

export default function AppNavigator() {
  return (
    <RootStack.Navigator>
      <RootStack.Screen 
        name="MainTab"
        component={MainTabNavigator} 
        options={{ headerShown: false }}
      />
      <RootStack.Screen 
        name="TaskModal" 
        component={TaskModal} 
        options={{ 
          presentation: 'modal',
          headerShown: false 
        }}
      />
      <RootStack.Screen 
        name="AddTaskScreen" 
        component={AddTaskScreen} 
        options={{ title: 'Dodaj Zadanie' }}
      />
    </RootStack.Navigator>
  );
}
