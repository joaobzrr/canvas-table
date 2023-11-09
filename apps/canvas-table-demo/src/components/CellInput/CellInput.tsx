import React, {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  MutableRefObject,
} from "react";

type PropsType = {
  initialValue?: string;
  style?: React.CSSProperties;

  onSubmit?: (value: string) =>  void;
  onCancel?: () => void;
}

const CellInput = forwardRef<HTMLInputElement, PropsType>((props: PropsType, forwardedRef) => {
  const { initialValue, onSubmit, onCancel } = props;

  const ref = useRef<HTMLInputElement>(null);

  useImperativeHandle(forwardedRef, () => ref.current as HTMLInputElement);

  const onKeyUp = (event: React.KeyboardEvent) => {
    const r = ref as MutableRefObject<HTMLInputElement>;
    if (event.key === "Enter") {
      onSubmit?.(r.current.value)
    }

    if (event.key === "Escape") {
      onCancel?.();
    }
  }

  useEffect(() => {
    if (ref.current) {
      ref.current.value = initialValue ?? "";
      ref.current.setSelectionRange(-1, -1);
      ref.current.scrollLeft = ref.current.scrollWidth;
    }
  }, [initialValue]);

  const style = {
    ...props.style,
    position: "absolute",
    pointerEvents: "auto",
  } as React.CSSProperties;

  return (
    <input
      ref={ref}
      onKeyUp={onKeyUp}
      onBlur={onCancel}
      style={style}
    />
  );
});

export default CellInput;
