import * as SecureStore from 'expo-secure-store';
import React, { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { TextInput, View, Text, Pressable } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import BottomSheet from './BottomSheet';

import { Entry } from '~/types/Entry';
import { uid } from '~/utils/uuid';

const JournalEntry = ({
  time,
  setTime,
}: {
  time: Date;
  setTime: Dispatch<SetStateAction<Date>>;
}) => {
  const [text, setText] = useState('');
  const [savedEntries, setSavedEntries] = useState<Entry[]>([]);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirm = (date: Date) => {
    setTime(new Date(date));
    hideDatePicker();
  };

  const saveEntry = async () => {
    if (!text || !text.trim()) return;
    const currentDateTime = time.toISOString();
    const newEntry: Entry = { uid: uid(), text: text.trim(), dateTime: currentDateTime };

    setTime(new Date());

    const existingEntries = await SecureStore.getItemAsync('journals');
    const entriesArray = existingEntries ? JSON.parse(existingEntries) : [];

    entriesArray.push(newEntry);

    await SecureStore.setItemAsync('journals', JSON.stringify(entriesArray));
    setSavedEntries(entriesArray);
    setText('');
  };

  const loadEntries = async () => {
    const savedData = await SecureStore.getItemAsync('journals');
    if (savedData) {
      setSavedEntries(JSON.parse(savedData));
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  return (
    <View className="relative">
      <View className={styles.typing}>
        <TextInput
          className={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Write your thoughts.."
          multiline
        />
        <Pressable onPress={showDatePicker}>
          <Text className={styles.time}>
            {time.toLocaleString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </Pressable>
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="time"
          date={time}
          onConfirm={handleConfirm}
          onCancel={hideDatePicker}
          maximumDate={new Date()}
        />
      </View>

      {text && (
        <View className={styles.save}>
          <Pressable className={styles.saveButton} onPress={saveEntry}>
            <Text className={styles.saveText}>Save</Text>
          </Pressable>
        </View>
      )}
      <BottomSheet time={time} savedEntries={savedEntries} setTime={setTime} />
    </View>
  );
};

export default JournalEntry;

const styles = {
  header: `flex flex-col gap-1 mb-3`,
  title: `text-4xl font-semibold`,
  date: `text-md font-regular text-gray-500`,
  time: `text-xs font-regular text-black opacity-60 font-medium dark:text-white dark:opacity-40`,
  typing: `flex flex-col gap-2 p-2 px-4 border-l-2 border-gray-100 dark:border-[rgba(255,255,255,0.15)] h-fit mt-3`,
  input: `text-black dark:text-white`,
  save: `flex items-end justify-end opacity-60 dark:opacity-50`,
  saveButton: `rounded-full px-3 py-0.5 bg-black dark:bg-white cursor-pointer text-white dark:text-black w-fit`,
  saveText: `rounded-full text-white dark:text-black text-sm`,
};
