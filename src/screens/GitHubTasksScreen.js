// src/screens/GitHubTasksScreen.js

import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Button, Text, useTheme, ActivityIndicator, Snackbar } from 'react-native-paper';
import { fetchGitHubIssues, mapIssuesToTasks } from '../services/github';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GITHUB_REPO_OWNER, GITHUB_REPO_NAME } from '@env';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GitHubTasksScreen() {
  const { colors } = useTheme();
  const [githubTasks, setGithubTasks] = useState([]);
  const [gitHubAccessToken, setGitHubAccessToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const loadGitHubIssues = async () => {
    setLoading(true);
    if (!gitHubAccessToken) {
      const token = await AsyncStorage.getItem('githubAccessToken');
      setGitHubAccessToken(token);
      if (!token) {
        setLoading(false);
        Alert.alert('Błąd', 'Brak tokenu dostępu GitHub. Zaloguj się ponownie.');
        return;
      }
    }

    try {
      const issues = await fetchGitHubIssues(gitHubAccessToken, GITHUB_REPO_OWNER, GITHUB_REPO_NAME);
      const tasksFromGitHub = mapIssuesToTasks(issues);
      setGithubTasks(tasksFromGitHub);
      setLoading(false);
      setSnackbarVisible(true);
    } catch (error) {
      setLoading(false);
      console.error('Error fetching GitHub issues:', error);
      Alert.alert('Błąd', 'Nie udało się pobrać zadań z GitHub.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Button mode="contained" onPress={loadGitHubIssues} style={styles.button}>
        Pobierz zadania z GitHub
      </Button>
      {loading && <ActivityIndicator animating={true} color={colors.primary} />}
      <FlatList
        data={githubTasks}
        renderItem={({ item }) => (
          <View style={styles.taskItem}>
            <Text style={item.isCompleted ? styles.completedTask : styles.incompleteTask}>
              {item.title}
            </Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        Zadania zostały pobrane z GitHub!
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  button: {
    marginBottom: 10,
  },
  taskItem: {
    padding: 10,
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: 'gray',
  },
  incompleteTask: {
    color: 'black',
  },
});
