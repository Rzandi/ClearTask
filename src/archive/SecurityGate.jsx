import { useSecurity } from './SecurityContext';
import PinLockScreen from './PinLockScreen';

export default function SecurityGate({ children }) {
  const { isUnlocked } = useSecurity();

  if (!isUnlocked) {
    return <PinLockScreen />;
  }

  return children;
}
