import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { Container } from '~/components/Container';
import JournalEntry from '~/components/TextInput';

export default function Home() {
  const [time, setTime] = useState(new Date());

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Journey',
          headerShown: false,
        }}
      />
      <Container>
        <View className={styles.header}>
          <Text className={styles.title}>Journey</Text>
          <Text className={styles.date}>
            {time.toLocaleDateString('en-US', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>

        <JournalEntry time={time} setTime={setTime} />
      </Container>
    </>
  );
}

const styles = {
  header: `flex flex-col gap-1 mb-3`,
  title: `text-4xl font-semibold text-black dark:text-white`,
  date: `text-md font-regular text-gray-500 dark:text-white dark:opacity-40`,
};
