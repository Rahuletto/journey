import * as SecureStore from 'expo-secure-store';
import React, { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import { View, Text, Dimensions, Pressable } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { EntryList } from './Entries';

import { Entry } from '~/types/Entry';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.7;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.15;

const BottomSheet = ({
  savedEntries,
  time,
  setTime,
}: {
  savedEntries: Entry[];
  time: Date;
  setTime: Dispatch<SetStateAction<Date>>;
}) => {
  const isToday =
    time.getDate() === new Date().getDate() && time.getMonth() === new Date().getMonth();
  const translateY = useSharedValue(COLLAPSED_HEIGHT);
  const isExpanded = useSharedValue(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);

  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const loadAvailableDates = async () => {
    const savedData = await SecureStore.getItemAsync('journals');
    if (savedData) {
      const parsedEntries = JSON.parse(savedData);
      const dates = parsedEntries.map((entry: { dateTime: string }) => new Date(entry.dateTime));
      setAvailableDates(dates);
    }
  };

  useEffect(() => {
    loadAvailableDates();
  }, []);

  useEffect(() => {
    if (time.getDate() !== new Date().getDate()) {
      translateY.value = withSpring(0, {
        damping: 14,
        stiffness: 60,
      });
    } else {
      translateY.value = withSpring(isExpanded.value ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT, {
        damping: 14,
        stiffness: 60,
      });
    }
  }, [time, isExpanded]);

  const handleConfirm = (date: any) => {
    const selectedDate = new Date(date);
    selectedDate.setHours(time.getHours());
    selectedDate.setMinutes(time.getMinutes());

    setTime(selectedDate);
    hideDatePicker();
  };

  const onGestureEvent = useCallback(
    ({ nativeEvent }: any) => {
      const { translationY, velocityY, state } = nativeEvent;

      if (time.getDate() === new Date().getDate()) {
        if (state === 5) {
          if (velocityY > 0) {
            isExpanded.value = false;
            translateY.value = withSpring(COLLAPSED_HEIGHT, {
              damping: 14,
              stiffness: 60,
            });
            isExpanded.value = true;
            translateY.value = withSpring(EXPANDED_HEIGHT, {
              damping: 14,
              stiffness: 60,
            });
          }
        } else {
          const newTranslateY = translateY.value + translationY;
          const threshold = SCREEN_HEIGHT * 0.25;

          if (
            (newTranslateY < threshold && translateY.value !== EXPANDED_HEIGHT) ||
            translationY < -90
          ) {
            isExpanded.value = true;
            translateY.value = withSpring(EXPANDED_HEIGHT, {
              damping: 14,
              stiffness: 60,
            });
          } else if (newTranslateY > threshold && translateY.value !== COLLAPSED_HEIGHT) {
            isExpanded.value = false;
            translateY.value = withSpring(COLLAPSED_HEIGHT, {
              damping: 14,
              stiffness: 60,
            });
          } else {
            if (translateY.value !== newTranslateY) {
              translateY.value = withSpring(newTranslateY, {
                damping: 14,
                stiffness: 60,
              });
            }
          }
        }
      } else {
        isExpanded.value = true;
        translateY.value = withSpring(EXPANDED_HEIGHT, {
          damping: 14,
          stiffness: 60,
        });
      }
    },
    [time]
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <PanGestureHandler onGestureEvent={onGestureEvent} enabled={isToday}>
      <Animated.View
        style={[animatedStyle, { height: SCREEN_HEIGHT }]}
        className="absolute left-0 right-0 -mx-8 rounded-t-[30px] bg-[#f3f3f3] px-8 py-6 dark:bg-[#202020]">
        {isToday && (
          <View className="-mt-2 mb-2 h-1 w-16 self-center rounded-full bg-gray-300 opacity-40 dark:bg-[#4B4B4B]" />
        )}
        <Pressable onPress={showDatePicker}>
          <Text className="text-2xl font-semibold text-black dark:text-white">
            {isToday
              ? 'Today'
              : time.toLocaleDateString('en-US', {
                  month: 'long',
                  day: '2-digit',
                })}
          </Text>
        </Pressable>
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          date={time}
          onConfirm={handleConfirm}
          onCancel={hideDatePicker}
          minimumDate={
            availableDates.length
              ? new Date(Math.min(...availableDates.map((date) => date.getTime())))
              : undefined
          }
          maximumDate={new Date()}
        />
        <EntryList otherEntries={savedEntries} time={time} isExpanded={isExpanded} />
      </Animated.View>
    </PanGestureHandler>
  );
};

export default BottomSheet;
