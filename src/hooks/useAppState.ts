import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function useAppState(onChange: (state: AppStateStatus) => void) {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current !== nextState) {
        onChange(nextState);
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [onChange]);
}
