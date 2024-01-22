import { clsx } from "clsx";
import { TabItem } from "../../types";
import styles from "./Tabs.module.css";

type PropsType = {
  items: TabItem[];
  selected?: React.Key;
  onTabClick?: (key: React.Key) => void;
};

export default function Tabs(props: PropsType) {
  const { items, selected, onTabClick } = props;

  return (
    <div className={styles.tabs}>
      <div className={styles.wrapper}>
        {items.map(({ label, key }) => (
          <button
            onClick={() => onTabClick?.(key)}
            className={clsx(styles.button, {
              [styles.selected]: key === selected
            })}
            key={key}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
