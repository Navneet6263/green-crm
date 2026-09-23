import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';

export function useUnsavedChanges(dirty: boolean, saving: boolean) {
  const navigation = useNavigation();
  usePreventRemove(dirty || saving, ({ data }) => {
    if (saving) return;
    if (Platform.OS === 'web') {
      if (window.confirm('Discard your unsaved changes?')) navigation.dispatch(data.action);
    } else Alert.alert('Discard unsaved changes?', 'Your changes have not been saved to the CRM.', [
      { text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });
  useEffect(() => {
    if (Platform.OS !== 'web' || (!dirty && !saving)) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty, saving]);
}
