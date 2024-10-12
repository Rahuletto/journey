import { BlurView } from 'expo-blur';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  LayoutAnimation,
  Modal,
  Vibration,
  useColorScheme,
  TextInput,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  useAnimatedProps,
  SharedValue,
} from 'react-native-reanimated';

import { Entry } from '~/types/Entry';

interface AnimatedEntryProps {
  entry: Entry;
  deleteAnimation: { uid: string; animated: boolean } | null;
  handleLongPress: (entry: Entry, layoutY: number) => void;
  selectedEntry: Entry | null;
}

const AnimatedEntry: React.FC<AnimatedEntryProps> = ({
  entry,
  deleteAnimation,
  handleLongPress,
  selectedEntry,
}) => {
  const pressableRef = useRef<View>(null); // Create a ref for the Pressable

  const animatedStyle = useAnimatedStyle(() => ({
    opacity:
      deleteAnimation?.uid === entry.uid && deleteAnimation.animated
        ? withTiming(0, { duration: 300 })
        : 1,
    transform: [
      {
        scale:
          deleteAnimation?.uid === entry.uid && deleteAnimation.animated
            ? withTiming(0.9, { duration: 300 })
            : 1,
      },
    ],
  }));

  const handleLongPressWrapper = () => {
    pressableRef.current?.measure((fx, fy, width, height, px, py) => {
      handleLongPress(entry, py);
    });
  };

  return (
    <View style={{ width: '100%', minHeight: 30 }}>
      <Animated.View style={animatedStyle}>
        <Pressable
          ref={pressableRef as React.RefObject<View>}
          onLongPress={handleLongPressWrapper}
          className={`relative ${
            selectedEntry?.uid === entry.uid ? 'bg-[#f3f3f3] dark:bg-[#202020]' : ''
          }`}>
          <View className="rounded-lg pl-5">
            <View className="absolute left-[-8px] top-1 h-4 w-4 rounded-full border-2 border-gray-300 bg-[#f3f3f3] dark:border-[rgba(255,255,255,0.15)] dark:bg-[#202020]" />
            <Text className="text-base text-black dark:text-white">{entry.text}</Text>
            <Text className="mt-1 text-xs text-black opacity-40 dark:text-white dark:opacity-40">
              {new Date(entry.dateTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
};

interface EntryListProps {
  otherEntries: Entry[];
  time: Date;
  isExpanded: SharedValue<boolean>;
}

export const EntryList: React.FC<EntryListProps> = ({ otherEntries, time, isExpanded }) => {
  const colorScheme = useColorScheme();
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ y: number }>({ y: 0 });
  const [savedEntries, setSavedEntries] = useState<Entry[]>([]);
  const [filtered, setFiltered] = useState<Entry[]>([]);
  const popupScale = useSharedValue(0);
  const intensity = useSharedValue(0);
  const [editMode, setEditMode] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [editedTime, setEditedTime] = useState(new Date());
  const [deleteAnimation, setDeleteAnimation] = useState<{ uid: string; animated: boolean } | null>(
    null
  );
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirm = (date: Date) => {
    setEditedTime(date);
    hideDatePicker();
  };

  useEffect(() => {
    if (selectedEntry) {
      setPopupPosition({ y: popupPosition.y });
    }
  }, [editMode, colorScheme]);

  const getEntries = useCallback(async (): Promise<Entry[]> => {
    const existingEntries = await SecureStore.getItemAsync('journals');
    return existingEntries ? JSON.parse(existingEntries) : [];
  }, []);

  const updateEntries = useCallback(async (entries: Entry[]) => {
    await SecureStore.setItemAsync('journals', JSON.stringify(entries));
    setSavedEntries(entries);
  }, []);

  useEffect(() => {
    getEntries().then(setSavedEntries);
  }, [getEntries, otherEntries]);

  useEffect(() => {
    setFiltered(
      savedEntries.filter((entry) => {
        const entryDate = new Date(entry.dateTime);
        return (
          entryDate.getDate() === time.getDate() &&
          entryDate.getMonth() === time.getMonth() &&
          entryDate.getFullYear() === time.getFullYear()
        );
      })
    );
  }, [savedEntries, time]);

  const handleEdit = useCallback(() => {
    if (selectedEntry) {
      setEditedTime(new Date(selectedEntry.dateTime));
      setEditedText(selectedEntry.text);
      setEditMode(true);
    }
  }, [selectedEntry]);

  const handleSaveEdit = useCallback(async () => {
    if (selectedEntry) {
      const updatedEntries = savedEntries.map((entry) =>
        entry.uid === selectedEntry.uid
          ? { ...entry, text: editedText, dateTime: editedTime.toISOString() }
          : entry
      );
      await updateEntries(updatedEntries);
      resetPopup();
    }
  }, [selectedEntry, editedText, savedEntries, updateEntries, editedTime]);

  const handleDelete = useCallback(
    async (entry: Entry) => {
      setDeleteAnimation({ uid: entry.uid, animated: true });
      setTimeout(async () => {
        const newEntries = savedEntries.filter((e) => e.uid !== entry.uid);
        await updateEntries(newEntries);
        setDeleteAnimation(null);
        resetPopup();
      }, 300);
    },
    [savedEntries, updateEntries]
  );

  const handleLongPress = useCallback(
    (entry: Entry, layoutY: number) => {
      if (!isExpanded.value) return;
      Vibration.vibrate(10);
      setSelectedEntry(entry);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setPopupPosition({ y: layoutY - 10 });
      popupScale.value = withTiming(1, { duration: 200, easing: Easing.inOut(Easing.ease) });
      intensity.value = withTiming(40, { duration: 100, easing: Easing.inOut(Easing.ease) });
    },
    [isExpanded, popupScale, intensity]
  );

  const resetPopup = useCallback(() => {
    popupScale.value = withTiming(0, { duration: 200, easing: Easing.inOut(Easing.ease) });
    intensity.value = withTiming(0, { duration: 100, easing: Easing.inOut(Easing.ease) });
    setTimeout(() => {
      setEditMode(false);
      setEditedText('');
      setSelectedEntry(null);
    }, 100);
  }, [popupScale, intensity]);

  const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
  const animatedBlurProps = useAnimatedProps(() => ({
    intensity: intensity.value,
    tint: (colorScheme === 'dark' ? 'light' : 'dark') as any,
  }));

  const popupStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: 8 * (1 - popupScale.value) }],
    opacity: 1,
    left: 20,
    top: popupPosition.y,
  }));

  return (
    <ScrollView className="relative flex-1">
      {!editMode ? (
        <Modal transparent visible={!!selectedEntry}>
          <AnimatedBlurView
            animatedProps={animatedBlurProps}
            className="absolute left-0 top-0 z-50 h-screen w-screen">
            <Pressable
              onPress={resetPopup}
              className="z-49 absolute left-0 top-0 h-screen w-screen"
            />
            {!deleteAnimation && selectedEntry && (
              <Animated.View
                className="z-60 relative -ml-1 -mt-5 w-[92%] rounded-2xl bg-[#f3f3f3] p-4 pl-8 dark:bg-[#202020]"
                style={popupStyle}>
                <Pressable className="relative bg-[#f3f3f3] dark:bg-[#202020]">
                  <View className="absolute -left-0.5 top-0 h-full border-l-2 border-gray-300 dark:border-[rgba(255,255,255,0.15)]" />
                  <View className="rounded-lg pl-5">
                    <View className="absolute left-[-8px] top-1 h-4 w-4 rounded-full border-2 border-gray-300 bg-[#f3f3f3] dark:border-[rgba(255,255,255,0.15)] dark:bg-[#202020]" />
                    <Text className="text-base text-black dark:text-white">
                      {selectedEntry.text}
                    </Text>
                    <Text className="mt-1 text-xs text-black opacity-40 dark:text-white dark:opacity-40">
                      {new Date(selectedEntry.dateTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </Pressable>
                <View className="absolute -bottom-12 right-3 mt-4 flex flex-row justify-end gap-3">
                  <Pressable
                    className="h-fit rounded-full bg-black px-4 py-1 opacity-60 dark:bg-white dark:opacity-50"
                    onPress={handleEdit}>
                    <Text className="text-center text-sm font-medium text-white dark:text-black">
                      Edit
                    </Text>
                  </Pressable>
                  <Pressable
                    className="h-fit rounded-full bg-[#ff5858] px-4 py-1 dark:bg-[#3b1414]"
                    onPress={() => handleDelete(selectedEntry)}>
                    <Text className="text-center text-sm font-medium text-white shadow-none dark:text-[#ff5858]">
                      Delete
                    </Text>
                  </Pressable>
                </View>
              </Animated.View>
            )}
          </AnimatedBlurView>
        </Modal>
      ) : (
        <Modal transparent>
          <BlurView
            tint={(colorScheme === 'dark' ? 'light' : 'dark') as any}
            intensity={50}
            className="absolute left-0 top-0 z-50 h-screen w-screen">
            <Pressable
              onPress={resetPopup}
              className="z-49 absolute left-0 top-0 h-screen w-screen"
            />
            {selectedEntry && (
              <Animated.View
                className={`z-60 relative -ml-1 -mt-5 w-[92%] rounded-2xl border bg-[#f3f3f3] p-4 pl-8 dark:bg-[#202020] ${editMode ? 'border-dashed border-gray-400 dark:border-[rgba(255,255,255,0.4)]' : 'border-transparent'}`}
                style={popupStyle}>
                <Pressable className="relative bg-[#f3f3f3] dark:bg-[#202020]">
                  <View className="absolute -left-0.5 top-0 h-full border-l-2 border-gray-300 dark:border-[rgba(255,255,255,0.15)]" />
                  <View className="rounded-lg pl-5">
                    <View className="absolute left-[-8px] top-1 h-4 w-4 rounded-full border-2 border-gray-300 bg-[#f3f3f3] dark:border-[rgba(255,255,255,0.15)] dark:bg-[#202020]" />
                    <TextInput
                      multiline
                      className="-mt-1 text-base text-black dark:text-white"
                      value={editedText}
                      onChangeText={setEditedText}
                    />
                    <Pressable onPress={showDatePicker}>
                      <Text className="mt-1 text-xs text-black opacity-40 dark:text-white dark:opacity-40">
                        {editedTime.toLocaleString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </Pressable>

                    <DateTimePickerModal
                      isVisible={isDatePickerVisible}
                      mode="time"
                      date={editedTime}
                      onConfirm={handleConfirm}
                      onCancel={hideDatePicker}
                      maximumDate={new Date()}
                    />
                  </View>
                </Pressable>
                <View className="absolute -bottom-12 right-3 mt-4 flex flex-row justify-end gap-3">
                  <Pressable
                    className="h-fit rounded-full bg-[#40ff89] px-4 py-1 dark:bg-[#1a2f22]"
                    onPress={handleSaveEdit}>
                    <Text className="text-center text-sm font-medium text-[#1a2f22] dark:text-[#40ff89]">
                      Save
                    </Text>
                  </Pressable>
                </View>
              </Animated.View>
            )}
          </BlurView>
        </Modal>
      )}

      <View className="ml-4 mt-4 flex flex-col gap-6 border-l-2 border-gray-300 dark:border-[rgba(255,255,255,0.15)]">
        {filtered[0] ? (
          filtered
            .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
            .map((entry) => (
              <AnimatedEntry
                key={entry.uid}
                entry={entry}
                deleteAnimation={deleteAnimation}
                handleLongPress={handleLongPress}
                selectedEntry={selectedEntry}
              />
            ))
        ) : (
          <Text className="pl-4 text-base text-black opacity-40 dark:text-white dark:opacity-40">
            Looks too empty.
          </Text>
        )}
      </View>
    </ScrollView>
  );
};
