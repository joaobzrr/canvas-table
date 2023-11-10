import { forwardRef } from "react";
import { CellInputProps } from "@bzrr/canvas-table-react";

const CellInput = forwardRef<HTMLInputElement, CellInputProps>((props, ref) => {
  const { onKeyDown, style } = props;

  return (
    <input ref={ref} onKeyDown={onKeyDown} style={style} />
  );
});

export default CellInput;
