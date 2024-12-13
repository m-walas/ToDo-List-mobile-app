// src/screens/GitHubTasksScreen.js

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  TextInput 
} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { auth } from '../firebase';
import { GithubAuthProvider, signInWithCredential, linkWithCredential, getAdditionalUserInfo } from 'firebase/auth';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '@env';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from 'react-native-paper';

const REDIRECT_URI = AuthSession.makeRedirectUri({ scheme: 'todolistmobileapp' });

const GitHubTasksScreen = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [githubToken, setGithubToken] = useState(null);
  const [repos, setRepos] = useState([]);
  const [issues, setIssues] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [issueState, setIssueState] = useState('open'); // 'open' or 'closed'

  const [createIssueModalVisible, setCreateIssueModalVisible] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueBody, setNewIssueBody] = useState('');

  // Stany dla pull-to-refresh
  const [isRefreshingRepos, setIsRefreshingRepos] = useState(false);
  const [isRefreshingIssues, setIsRefreshingIssues] = useState(false);

  const handleGitHubLogin = async () => {
    try {
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(
        REDIRECT_URI
      )}&scope=repo`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);
      console.log('WebBrowser result:', result);

      if (result.type === 'success' && result.url) {
        const params = new URLSearchParams(result.url.split('?')[1]);
        const code = params.get('code');

        if (code) {
          // Wymień code na access_token
          const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              client_id: GITHUB_CLIENT_ID,
              client_secret: GITHUB_CLIENT_SECRET,
              code,
              redirect_uri: REDIRECT_URI,
            }),
          });

          const data = await tokenResponse.json();

          if (data.access_token) {
            setGithubToken(data.access_token);
            const credential = GithubAuthProvider.credential(data.access_token);

            if (auth.currentUser) {
              // Użytkownik jest już zalogowany, spróbuj połączyć konto GitHub z istniejącym kontem
              try {
                await linkWithCredential(auth.currentUser, credential);
                Alert.alert('Sukces', 'Konto GitHub zostało pomyślnie połączone z kontem.');
              } catch (linkError) {
                if (linkError.code === 'auth/credential-already-in-use') {
                  Alert.alert('Error', 'To konto GitHub jest już połączone z innym kontem.');
                } else {
                  console.error('Error linking GitHub credential:', linkError);
                  Alert.alert('Error', 'Wystąpił błąd podczas łączenia konta GitHub.');
                }
              }
            } else {
              // Użytkownik nie jest zalogowany, zaloguj się lub utwórz nowe konto za pomocą GitHub
              try {
                const userCredential = await signInWithCredential(auth, credential);
                const isNewUser = getAdditionalUserInfo(userCredential)?.isNewUser;

                if (isNewUser) {
                  Alert.alert('Sukces', 'Konto utworzone pomyślnie za pomocą GitHub!');
                } else {
                  Alert.alert('Sukces', 'Zalogowano pomyślnie za pomocą GitHub!');
                }
              } catch (signInError) {
                console.error('Error signing in with GitHub credential:', signInError);
                Alert.alert('Error', 'Wystąpił błąd podczas logowania za pomocą GitHub.');
              }
            }
          } else {
            Alert.alert('Error', 'Wystąpił błąd podczas otrzymywania tokena dostępu.');
          }
        }
      }
    } catch (error) {
      console.error('Error during GitHub login:', error);
      Alert.alert('Error', 'Wystąpił błąd podczas logowania za pomocą GitHub.');
    }
  };

  const fetchRepos = async () => {
    if (!githubToken) return;
    setIsRefreshingRepos(true);
    try {
      const response = await fetch('https://api.github.com/user/repos', {
        headers: {
          Authorization: `token ${githubToken}`,
        },
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setRepos(data);
      } else {
        Alert.alert('Error', 'Błąd podczas pobierania repozytoriów.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Wystąpił błąd podczas pobierania repozytoriów.');
    } finally {
      setIsRefreshingRepos(false);
    }
  };

  const fetchIssues = async (owner, repoName, state = 'open') => {
    if (!githubToken) return;
    setIsRefreshingIssues(true);
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/issues?state=${state}`, {
        headers: {
          Authorization: `token ${githubToken}`,
        },
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setIssues(data);
      } else {
        Alert.alert('Error', 'Wystąpił błąd podczas pobierania zgłoszeń.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Wystąpił błąd podczas pobierania zgłoszeń.');
    } finally {
      setIsRefreshingIssues(false);
    }
  };

  const selectRepo = (repo) => {
    setSelectedRepo(repo);
    fetchIssues(repo.owner.login, repo.name, issueState);
  };

  const createIssue = async () => {
    if (!selectedRepo) return;
    const { owner, name } = selectedRepo;
    try {
      const response = await fetch(`https://api.github.com/repos/${owner.login}/${name}/issues`, {
        method: 'POST',
        headers: {
          Authorization: `token ${githubToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newIssueTitle,
          body: newIssueBody
        })
      });
      const data = await response.json();
      if (data && data.title) {
        Alert.alert('Success', `Issue #${data.number} created!`);
        setCreateIssueModalVisible(false);
        setNewIssueTitle('');
        setNewIssueBody('');
        // Odśwież listę issues
        fetchIssues(owner.login, name, issueState);
      } else {
        Alert.alert('Error', 'Wystąpił błąd podczas tworzenia zgłoszenia.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Wystąpił błąd podczas tworzenia zgłoszenia.');
    }
  };

  const closeIssue = async (issueNumber) => {
    if (!selectedRepo) return;
    const { owner, name } = selectedRepo;
    try {
      const response = await fetch(`https://api.github.com/repos/${owner.login}/${name}/issues/${issueNumber}`, {
        method: 'PATCH',
        headers: {
          Authorization: `token ${githubToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          state: 'closed'
        })
      });
      const data = await response.json();
      if (data && data.state === 'closed') {
        Alert.alert('Success', `Issue #${data.number} closed!`);
        // Odśwież listę issues
        fetchIssues(owner.login, name, issueState);
      } else {
        Alert.alert('Error', 'Wystąpił błąd podczas zamykania zgłoszenia.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Wystąpił błąd podczas zamykania zgłoszenia.');
    }
  };

  const changeIssueState = (newState) => {
    if (!selectedRepo) return;
    setIssueState(newState);
    fetchIssues(selectedRepo.owner.login, selectedRepo.name, newState);
  };

  const Header = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>GitHub ToDo</Text>
      {!githubToken && (
        <TouchableOpacity style={styles.loginButton} onPress={handleGitHubLogin}>
          <Text style={styles.loginButtonText}>Login with GitHub</Text>
        </TouchableOpacity>
      )}
      {githubToken && repos.length === 0 && (
        <TouchableOpacity style={styles.fetchButton} onPress={fetchRepos}>
          <Text style={styles.fetchButtonText}>Fetch My Repos</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const RepoList = () => (
    <View style={styles.repoListContainer}>
      <Text style={styles.sectionTitle}>Select a repository</Text>
      <FlatList
        data={repos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.repoItem} onPress={() => selectRepo(item)}>
            <Text style={styles.repoName}>{item.name}</Text>
            <Text style={styles.repoDesc}>{item.description || 'Brak opisu'}</Text>
          </TouchableOpacity>
        )}
        refreshing={isRefreshingRepos}
        onRefresh={refreshRepos}
        ListEmptyComponent={<Text style={styles.infoText}>No repositories found.</Text>}
      />
      {/* Opcjonalnie: Przyciski odświeżania */}
      <TouchableOpacity style={styles.refreshButton} onPress={refreshRepos}>
        <Text style={styles.refreshButtonText}>⟳ Refresh Repos</Text>
      </TouchableOpacity>
    </View>
  );

  const IssuesView = () => (
    <View style={styles.issuesContainer}>
      <Text style={styles.sectionTitle}>Issues for {selectedRepo.name}</Text>
      
      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleButton, issueState === 'open' && styles.toggleButtonActive]} 
          onPress={() => changeIssueState('open')}
        >
          <Text style={[styles.toggleButtonText, issueState === 'open' && styles.toggleButtonTextActive]}>
            Open Issues
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleButton, issueState === 'closed' && styles.toggleButtonActive]} 
          onPress={() => changeIssueState('closed')}
        >
          <Text style={[styles.toggleButtonText, issueState === 'closed' && styles.toggleButtonTextActive]}>
            Closed Issues
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.createIssueButton} onPress={() => setCreateIssueModalVisible(true)}>
        <Text style={styles.createIssueButtonText}>+ Create Issue</Text>
      </TouchableOpacity>

      <FlatList
        data={issues}
        keyExtractor={(item) => item.id.toString()}
        style={{ marginTop: 10 }}
        renderItem={({ item }) => (
          <View style={styles.issueItem}>
            <View style={styles.issueHeader}>
              <Text style={styles.issueTitle}>#{item.number} {item.title}</Text>
              {item.state === 'open' ? (
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={() => closeIssue(item.number)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.closedLabel}>Closed</Text>
              )}
            </View>
            {item.body ? (
              <Text style={styles.issueBody}>
                {item.body.length > 120 ? item.body.slice(0, 120) + '...' : item.body}
              </Text>
            ) : (
              <Text style={styles.issueBodyEmpty}>No description</Text>
            )}
          </View>
        )}
        refreshing={isRefreshingIssues}
        onRefresh={refreshIssues}
        ListEmptyComponent={<Text style={styles.infoText}>No issues found.</Text>}
      />

      {/* Opcjonalnie: Przyciski odświeżania */}
      <TouchableOpacity style={styles.refreshButton} onPress={refreshIssues}>
        <Text style={styles.refreshButtonText}>⟳ Refresh Issues</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => {
        setSelectedRepo(null);
        setIssues([]);
      }}>
        <Text style={styles.backButtonText}>← Back to Repos</Text>
      </TouchableOpacity>
    </View>
  );

  // Implementacja funkcji odświeżania
  const refreshRepos = async () => {
    if (!githubToken) return;
    setIsRefreshingRepos(true);
    try {
      await fetchRepos();
    } catch (error) {
      console.error('Error refreshing repos:', error);
      Alert.alert('Błąd', 'Nie udało się odświeżyć repozytoriów.');
    } finally {
      setIsRefreshingRepos(false);
    }
  };

  const refreshIssues = async () => {
    if (!selectedRepo) return;
    setIsRefreshingIssues(true);
    try {
      await fetchIssues(selectedRepo.owner.login, selectedRepo.name, issueState);
    } catch (error) {
      console.error('Error refreshing issues:', error);
      Alert.alert('Błąd', 'Nie udało się odświeżyć zgłoszeń.');
    } finally {
      setIsRefreshingIssues(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header />

      {!selectedRepo && githubToken && repos.length > 0 && <RepoList />}
      {selectedRepo && <IssuesView />}

      {/* Modal tworzenia nowego issue */}
      <Modal
        visible={createIssueModalVisible}
        animationType="slide"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Create New Issue</Text>
            <TextInput
              style={styles.input}
              placeholder="Issue Title"
              placeholderTextColor={colors.disabled || '#a1a1a1'}
              value={newIssueTitle}
              onChangeText={setNewIssueTitle}
            />
            <TextInput
              style={[styles.input, { height: 100 }]}
              placeholder="Issue Description"
              placeholderTextColor={colors.disabled || '#a1a1a1'}
              multiline
              value={newIssueBody}
              onChangeText={setNewIssueBody}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton} 
                onPress={createIssue}>
                <Text style={styles.modalButtonText}>Create</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.error }]} 
                onPress={() => setCreateIssueModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {!githubToken && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>Please log in to proceed.</Text>
        </View>
      )}

    </View>
  );
};

// Funkcja do generowania stylów na podstawie motywu
const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 50
  },
  headerContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
    backgroundColor: colors.surface
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 20
  },
  loginButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600'
  },
  fetchButton: {
    backgroundColor: colors.primary,
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 10
  },
  fetchButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600'
  },
  repoListContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10
  },
  repoItem: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  repoName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
    color: colors.primary
  },
  repoDesc: {
    fontSize: 14,
    color: colors.text
  },
  refreshButton: {
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: colors.primary
  },
  refreshButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  issuesContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background
  },
  toggleContainer: {
    flexDirection: 'row',
    marginVertical: 10
  },
  toggleButton: {
    flex: 1,
    backgroundColor: colors.surface,
    marginRight: 10,
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center'
  },
  toggleButtonActive: {
    backgroundColor: colors.primary
  },
  toggleButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600'
  },
  toggleButtonTextActive: {
    color: colors.background
  },
  createIssueButton: {
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10
  },
  createIssueButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600'
  },
  infoText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginTop: 10
  },
  issueItem: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5
  },
  issueTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text
  },
  closeButton: {
    backgroundColor: colors.error,
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 10
  },
  closeButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600'
  },
  closedLabel: {
    color: colors.text,
    fontWeight: '700'
  },
  issueBody: {
    fontSize: 14,
    color: colors.text
  },
  issueBodyEmpty: {
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.text
  },
  backButton: {
    marginTop: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContainer: {
    width: '80%',
    padding: 20,
    borderRadius: 10,
    backgroundColor: colors.surface
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: colors.text
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    backgroundColor: colors.surface,
    color: colors.text
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    width: '45%',
    alignItems: 'center',
    backgroundColor: colors.primary
  },
  modalButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600'
  },
  infoContainer: {
    alignItems: 'center',
    marginTop: 40
  }
});

export default GitHubTasksScreen;
