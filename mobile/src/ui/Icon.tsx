import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { Platform, type ColorValue } from 'react-native';
import { colors } from './theme';

const paths = {
  home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
  leads: 'M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3M8 3v5h5M8 3h8v5M7 12h6M7 16h4M16 12h6M19 9v6',
  tasks: 'M9 5h10a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2h1M7 3h10v4H7zM7 13l3 3 7-6',
  user: 'M4 21v-2a8 8 0 0 1 16 0v2',
  plus: 'M12 5v14M5 12h14',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  back: 'M19 12H5m6-6-6 6 6 6',
  chevron: 'm9 5 7 7-7 7',
  search: 'm16 16 5 5',
  calendar: 'M4 5h16v16H4zM4 10h16M8 3v4M16 3v4',
  phone: 'M6 3H3v4c0 8 6 14 14 14h4v-4l-5-2-2 2a12 12 0 0 1-7-7l2-2-3-5z',
  check: 'm5 12 4 4L19 6',
  lock: 'M5 10h14v11H5zM8 10V7a4 4 0 0 1 8 0v3M12 14v3',
  mail: 'M3 5h18v14H3zM3 5l9 8 9-8',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z',
  refresh: 'M20 7a9 9 0 1 0 1 8M20 3v5h-5',
  logout: 'M10 3H4v18h6M9 12h12m-5-5 5 5-5 5',
  clock: 'M12 6v6l4 2',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
};
export type IconName = keyof typeof paths;
export function Icon({ name, size = 22, color = colors.ink }: { name: IconName; size?: number; color?: ColorValue }) {
  // Decorative icons: the parent button/text provides the accessible label.
  // Native accessibility props are not valid attributes on a browser SVG.
  const accessibility = Platform.OS === 'web'
    ? { 'aria-hidden': true as const, focusable: false }
    : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...accessibility}>
    <Path d={paths[name]} />
    {name === 'user' ? <Circle cx="12" cy="7" r="4" /> : null}
    {name === 'search' ? <Circle cx="10.5" cy="10.5" r="6.5" /> : null}
    {name === 'pin' ? <Circle cx="12" cy="10" r="2.5" /> : null}
    {name === 'clock' ? <Circle cx="12" cy="12" r="9" /> : null}
    {name === 'calendar' ? <Rect x="8" y="14" width="3" height="3" fill={color} strokeWidth={0} /> : null}
  </Svg>;
}
