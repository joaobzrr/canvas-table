import { clsx } from "clsx";
import styles from "./TabButton.module.css";

type PropsType = {
  onClick: () => void;
  selected?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export default function TabButton(props: PropsType) {
  const {
    onClick,
    selected = false,
    className,
    style,
    children
  } = props;

  return (
    <button
      onClick={onClick}
      className={clsx(
        styles["tab-button"],
        className,
        {
          [styles.selected]: selected
        }
      )}
      style={style}
    >
      {children}
    </button>
  );
}
