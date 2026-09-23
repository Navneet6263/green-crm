import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Network from 'expo-network';
import { useSession } from '../auth/SessionProvider';
import { nativeTracking, reconcileTracking, syncTracking } from './engine';
export function TrackingSync() {
  const { session } = useSession();
  useEffect(() => {
    if (!session || !nativeTracking) return;
    const sync = () => {
      if (AppState.currentState === 'active') void reconcileTracking(session).catch(() => {});
      void syncTracking(session).catch(() => {});
    };
    sync();
    const network = Network.addNetworkStateListener(state => { if (state.isConnected && state.isInternetReachable !== false) sync(); });
    const app = AppState.addEventListener('change', state => { if (state === 'active') sync(); });
    const timer = setInterval(sync, 30000);
    return () => { network.remove(); app.remove(); clearInterval(timer); };
  }, [session]);
  return null;
}
