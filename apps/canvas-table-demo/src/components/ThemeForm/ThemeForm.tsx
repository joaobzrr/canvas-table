import { clsx } from "clsx";
import { Theme } from "canvas-table-core";
import styles from "./ThemeForm.module.css";

type PropsType = {
  onChange: (partial: Partial<Theme>) => void;
  className?: string;
  style?: React.CSSProperties;
};

export default function ThemeForm(props: PropsType) {
  const { onChange, style } = props;

  const className = clsx(props.className, styles.themeForm);

  return (
    <div className={className} style={style}>
      <form>
        <div className={styles.row}>
          <label className={styles.label}>Background Color</label>
          <input
            onChange={(event) =>
              onChange({
                tableBackgroundColor: event.target.value || undefined,
              })
            }
            className={styles.input}
          />
        </div>
        <div className={styles.row}>
          <label className={styles.label}>Body Background Color</label>
          <input
            onChange={(event) =>
              onChange({
                bodyBackgroundColor: event.target.value || undefined,
              })
            }
            className={styles.input}
          />
        </div>
        <div className={styles.row}>
          <label className={styles.label}>Header Background Color</label>
          <input
            onChange={(event) =>
              onChange({
                headerBackgroundColor: event.target.value || undefined,
              })
            }
            className={styles.input}
          />
        </div>
        <div className={styles.row}>
          <label className={styles.label}>Hovered Row Color</label>
          <input
            onChange={(event) =>
              onChange({
                hoveredRowColor: event.target.value || undefined,
              })
            }
            className={styles.input}
          />
        </div>
        <div className={styles.row}>
          <label className={styles.label}>Selected Row Color</label>
          <input
            onChange={(event) =>
              onChange({
                selectedRowColor: event.target.value || undefined,
              })
            }
            className={styles.input}
          />
        </div>
        <div className={styles.row}>
          <label className={styles.label}>Border Color</label>
          <input
            onChange={(event) =>
              onChange({
                tableBorderColor: event.target.value || undefined,
              })
            }
            className={styles.input}
          />
        </div>
        <div className={styles.row}>
          <label className={styles.label}>Font Family</label>
          <input
            onChange={(event) =>
              onChange({
                fontFamily: event.target.value || undefined,
              })
            }
            className={styles.input}
          />
        </div>
        <div className={styles.row}>
          <label className={styles.label}>Font Size</label>
          <input
            onChange={(event) =>
              onChange({
                fontSize: event.target.value || undefined,
              })
            }
            className={styles.input}
          />
        </div>
        <div className={styles.row}>
          <label className={styles.label}>Font Color</label>
          <input
            onChange={(event) =>
              onChange({
                fontColor: event.target.value || undefined,
              })
            }
            className={styles.input}
          />
        </div>
        <div className={styles.row}>
          <label className={styles.label}>Body Font Color</label>
          <input
            onChange={(event) =>
              onChange({
                bodyFontColor: event.target.value || undefined,
              })
            }
            className={styles.input}
          />
        </div>
        <div className={styles.row}>
          <label className={styles.label}>Header Font Color</label>
          <input
            onChange={(event) =>
              onChange({
                headerFontColor: event.target.value || undefined,
              })
            }
            className={styles.input}
          />
        </div>
        <div className={styles.row}>
          <label className={styles.label}>Font Style</label>
          <input
            onChange={(event) =>
              onChange({
                fontStyle: event.target.value || undefined,
              })
            }
            className={styles.input}
          />
        </div>
        <div className={styles.row}>
          <label className={styles.label}>Body Font Style</label>
          <input
            onChange={(event) =>
              onChange({
                bodyFontStyle: event.target.value || undefined,
              })
            }
            className={styles.input}
          />
        </div>
        <div className={styles.row}>
          <label className={styles.label}>Header Font Style</label>
          <input
            onChange={(event) =>
              onChange({
                headerFontStyle: event.target.value || undefined,
              })
            }
            className={styles.input}
          />
        </div>
        <div className={styles.row}>
          <label className={styles.label}>Scrollbar Thickness</label>
          <input
            onChange={(event) =>
              onChange({
                scrollbarThickness: parseInt(event.target.value) || undefined,
              })
            }
            className={styles.input}
          />
        </div>
        <div className={styles.row}>
          <label className={styles.label}>Scrollbar Track Margin</label>
          <input
            onChange={(event) =>
              onChange({
                scrollbarTrackMargin: parseInt(event.target.value) || undefined,
              })
            }
            className={styles.input}
          />
        </div>
        <div className={styles.row}>
          <label className={styles.label}>Scrollbar Thumb Color</label>
          <input
            onChange={(event) =>
              onChange({
                scrollbarThumbColor: event.target.value || undefined,
              })
            }
            className={styles.input}
          />
        </div>
        <div className={styles.row}>
          <label className={styles.label}>Scrollbar Track Color</label>
          <input
            onChange={(event) =>
              onChange({
                scrollbarTrackColor: event.target.value || undefined,
              })
            }
            className={styles.input}
          />
        </div>
        <div className={styles.row}>
          <label className={styles.label}>Scrollbar Thumb Hover Color</label>
          <input
            onChange={(event) =>
              onChange({
                scrollbarThumbHoverColor: event.target.value || undefined,
              })
            }
            className={styles.input}
          />
        </div>
        <div className={styles.row}>
          <label className={styles.label}>Scrollbar Thumb Pressed Color</label>
          <input
            onChange={(event) =>
              onChange({
                scrollbarThumbPressedColor: event.target.value || undefined,
              })
            }
            className={styles.input}
          />
        </div>
      </form>
    </div>
  );
}
