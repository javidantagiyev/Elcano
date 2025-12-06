import React, { createContext, useState, useEffect, useContext } from 'react';
import { Pedometer } from 'expo-sensors';

interface UserContextType {
  steps: number;
  coins: number;
  isPedometerAvailable: string;
}

const UserContext = createContext<UserContextType>({ steps: 0, coins: 0, isPedometerAvailable: 'checking' });

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [steps, setSteps] = useState(0);
  const [coins, setCoins] = useState(0);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState('checking');

  // Logic to convert steps to coins (e.g., 100 steps = 1 coin)
  const COIN_CONVERSION_RATE = 100;

  useEffect(() => {
    let subscription: any;

    const subscribe = async () => {
      const isAvailable = await Pedometer.isAvailableAsync();
      setIsPedometerAvailable(String(isAvailable));

      if (isAvailable) {
        subscription = Pedometer.watchStepCount(result => {
          setSteps(result.steps);
          // Auto-calculate coins based on SRS requirements [cite: 80]
          setCoins(Math.floor(result.steps / COIN_CONVERSION_RATE));
        });
      }
    };

    subscribe();

    return () => {
      if (subscription && subscription.remove) {
        subscription.remove();
      }
    };
  }, []);

  return (
    <UserContext.Provider value={{ steps, coins, isPedometerAvailable }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);