import React from 'react';
import { SafeAreaView } from 'react-native';

export const Container = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <SafeAreaView className={styles.container}>
        <SafeAreaView className={styles.safe}>{children}</SafeAreaView>
      </SafeAreaView>
    </>
  );
};

const styles = {
  container: 'flex flex-1 bg-white dark:bg-black',
  safe: 'flex flex-1 m-8',
};
