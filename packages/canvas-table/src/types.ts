export type Column_Def = {
    name:  string;
    field: string;
    width: number;
}

export type Data_Row<T> = T & { id: number | string; }

export type Dimensions = {
    width:  number;
    height: number;
}

export type Point = {
    x: number;
    y: number;
}

export type CT_Mouse_Down_Event = {
    type: "mousedown";
    button: number;
}

export type CT_Mouse_Up_Event = {
    type: "mouseup";
    button: number;
}

export type CT_Mouse_Move_Event = {
    type: "mousemove";
    x: number;
    y: number;
}

export type CT_Wheel_Event = {
    type: "wheel";
    x: number;
    y: number;
}

export type CT_Resize_Event = {
    type: "resize";
    width: number;
    height: number;
}

export type CT_Event =
    CT_Mouse_Down_Event
    | CT_Mouse_Up_Event
    | CT_Mouse_Move_Event
    | CT_Wheel_Event
    | CT_Resize_Event;

