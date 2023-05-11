export type Column_Def<T extends Record<string, string>> = {
    name:  string;
    field: Extract<keyof T, string>;
    width: number;
}

export type Column_State<T extends Record<string, string>> = {
    name:        string;
    field:       Extract<keyof T, string>
    position:    number;
    width:       number;
    sort_order: "ascending" | "descending" | null;
}

export type Data_Row<T> = {
    id:   number;
    data: T;
}

export type Theme = {
    fontSize:                   number;
    fontFamily:                 string;
    fontColor:                  string;
    backgroundColor?:           string;
    borderColor:                string;
    selectedRowColor:           string;
    arrowColor:                 string;
    headerBackgroundColor?:     string;
    scrollbarBackgroundColor?:  string;
    scrollbarThumbColor:        string;
    scrollbarUpperCornerColor:  string;
    scrollbarBottomCornerColor: string;
    scrollbarSize:              number;
    scrollbarThumbMargin:       number;
    rowHeight:                  number;
    cellPaddingX:               number;
};

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

