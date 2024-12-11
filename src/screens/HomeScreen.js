// src/screens/HomeScreen.js
import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, Dimensions, Alert } from 'react-native';
import { Text, Button, useTheme, TextInput, Portal, Dialog, FAB, Provider } from 'react-native-paper';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { UnsubContext } from '../contexts/UnsubContext';

export default function HomeScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { addUnsub, removeUnsub } = useContext(UnsubContext);

  const [boards, setBoards] = useState([]);
  const [fabOpen, setFabOpen] = useState(false);
  const [addTaskDialogVisible, setAddTaskDialogVisible] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskBoard, setNewTaskBoard] = useState('');

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const boardsRef = collection(db, 'boards');
    const q = query(boardsRef, where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(q,
      (querySnapshot) => {
        const fetchedBoards = [];
        querySnapshot.forEach((doc) => {
          fetchedBoards.push({ id: doc.id, ...doc.data() });
        });
        setBoards(fetchedBoards);
      },
      (error) => {
        console.error('Error fetching boards:', error);
        unsubscribe();
        removeUnsub(unsubscribe);
      }
    );

    addUnsub(unsubscribe);

    return () => {
      removeUnsub(unsubscribe);
      unsubscribe();
    };
  }, [user]);

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>Ładowanie...</Text>
      </View>
    );
  }

  const addBoard = () => {
    navigation.navigate('CreateBoardScreen');
  };

  const renderBoard = ({ item }) => (
    <TouchableOpacity
      style={[styles.boardCard, { backgroundColor: item.color || colors.primary }]}
      onPress={() => navigation.navigate('BoardTasksScreen', { boardId: item.id })}
    >
      {item.coverImage ? (
        <Image source={{ uri: item.coverImage }} style={styles.coverImage} />
      ) : null}
      <Text style={styles.boardTitle}>{item.name}</Text>
    </TouchableOpacity>
  );

  const onStateChange = ({ open }) => setFabOpen(open);

  const onAddTask = () => {
    setAddTaskDialogVisible(true);
    setFabOpen(false);
  };

  const onAddBoard = () => {
    addBoard();
    setFabOpen(false);
  };

  const handleAddTask = async () => {
    if (newTaskText.trim() === '') {
      Alert.alert('Błąd', 'Proszę wpisać nazwę zadania.');
      return;
    }
    if (newTaskBoard === '') {
      Alert.alert('Błąd', 'Proszę wybrać tablicę.');
      return;
    }
    try {
      await addDoc(collection(db, 'tasks'), {
        text: newTaskText,
        userId: user.uid,
        boardId: newTaskBoard,
        isCompleted: false,
        isPrioritized: false,
        createdAt: new Date(),
      });
      setNewTaskText('');
      setNewTaskBoard('');
      setAddTaskDialogVisible(false);
      Alert.alert('Sukces', 'Zadanie zostało dodane.');
    } catch (error) {
      console.error('Error adding task:', error);
      Alert.alert('Błąd', 'Nie udało się dodać zadania.');
    }
  };

  return (
    <Provider>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {boards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.welcomeText}>Witaj! Stwórz swoją pierwszą tablicę.</Text>
            <Button mode="contained" onPress={addBoard} style={styles.createButton}>
              Utwórz Tablicę
            </Button>
          </View>
        ) : (
          <FlatList
            data={boards}
            renderItem={renderBoard}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
          />
        )}

        <FAB.Group
          open={fabOpen}
          icon={fabOpen ? 'close' : 'plus'}
          actions={[
            {
              icon: 'plus-box',
              label: 'Dodaj Zadanie',
              onPress: onAddTask,
              small: false,
            },
            {
              icon: 'folder-plus',
              label: 'Dodaj Tablicę',
              onPress: onAddBoard,
              small: false,
            },
          ]}
          onStateChange={onStateChange}
          onPress={() => {
            if (fabOpen) {
              // nic
            }
          }}
          fabStyle={{ backgroundColor: colors.primary }}
        />

        <Portal>
          <Dialog visible={addTaskDialogVisible} onDismiss={() => setAddTaskDialogVisible(false)}>
            <Dialog.Title>Dodaj Zadanie</Dialog.Title>
            <Dialog.Content>
              <TextInput
                style={[styles.dialogInput, { color: colors.text, borderColor: colors.primary }]}
                placeholder="Nazwa zadania"
                placeholderTextColor={colors.placeholder || '#888'}
                value={newTaskText}
                onChangeText={setNewTaskText}
              />
              <View style={styles.pickerContainerDialog}>
                <Picker
                  selectedValue={newTaskBoard}
                  onValueChange={(itemValue) => setNewTaskBoard(itemValue)}
                  style={[styles.pickerDialog, { color: colors.text }]}
                  dropdownIconColor={colors.text}
                  mode="dropdown"
                >
                  <Picker.Item label="Wybierz Tablicę" value="" />
                  {boards.map((board) => (
                    <Picker.Item label={board.name} value={board.id} key={board.id} />
                  ))}
                </Picker>
              </View>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setAddTaskDialogVisible(false)} color={colors.primary}>
                Anuluj
              </Button>
              <Button onPress={handleAddTask} color={colors.primary}>
                Dodaj
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 18,
    marginBottom: 20,
    color: '#555',
    textAlign: 'center',
  },
  createButton: {
    marginTop: 10,
  },
  carousel: {
    alignItems: 'center',
  },
  boardCard: {
    width: Dimensions.get('window').width * 0.8,
    height: Dimensions.get('window').height * 0.4,
    borderRadius: 20,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  coverImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  boardTitle: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  dialogInput: {
    height: 50,
    borderWidth: 1,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  pickerContainerDialog: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  pickerDialog: {
    height: 50,
    width: '100%',
  },
});
