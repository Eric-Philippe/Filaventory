import 'react-native';

declare module 'react-native' {
  interface ViewProps {
    className?: string;
    contentContainerClassName?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface TextInputProps {
    className?: string;
  }
  interface ImageProps {
    className?: string;
  }
  interface TouchableOpacityProps {
    className?: string;
  }
  interface PressableProps {
    className?: string;
  }
  interface ScrollViewProps {
    className?: string;
    contentContainerClassName?: string;
  }
  interface FlatListProps<ItemT> {
    className?: string;
    contentContainerClassName?: string;
  }
}
