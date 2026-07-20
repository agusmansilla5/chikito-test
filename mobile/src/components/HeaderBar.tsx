import { View } from 'react-native';
import { HeaderLocationPicker } from './HeaderLocationPicker';
import { HeaderLogoutButton } from './HeaderLogoutButton';

export function HeaderBar() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <HeaderLocationPicker />
      <HeaderLogoutButton />
    </View>
  );
}
