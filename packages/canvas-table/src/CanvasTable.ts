import { Viewport } from "./Viewport";
import { Rect } from "./Rect";
import { Vector2 } from "./Vector2";
import * as utils from "./utils";
import * as config from "./config";
import * as types from "./types";

const scrollbar_thumb_margin_times_two = config.scrollbar_thumb_margin * 2;
const track_size = config.scrollbar_size - scrollbar_thumb_margin_times_two - 1;
const ellipsis = "...";

export default class CanvasTable<T extends Record<string, string>> {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    frame_id?: number;

    events: types.CT_Event[] = [];
    resize_observer: ResizeObserver;

    main_draw_area:       Rect;
    header_draw_area:     Rect;
    body_draw_area:       Rect;
    table_body_draw_area: Rect;

    view: Rect;

    table_body_dimensions: types.Dimensions;
    scroll_dimensions:     types.Dimensions;
    grid_dimensions:       types.Dimensions;

    column_defs: types.Column_Def[];
    rows: types.Data_Row<T>[];

    num_rows: number;
    num_cols: number;

    hsb_outer_rect: Rect;
    hsb_track_rect: Rect;
    hsb_thumb_rect: Rect;
    hsb_max_thumb_position = 0;
    hsb_drag_offset = 0;
    hsb_is_dragging = false;

    vsb_outer_rect: Rect;
    vsb_track_rect: Rect;
    vsb_thumb_rect: Rect;
    vsb_max_thumb_position = 0;
    vsb_drag_offset = 0;
    vsb_is_dragging = false;

    overflow_x: boolean;
    overflow_y: boolean;

    view_max_left: number;
    view_max_top:  number;

    render_indices: {
        left:   number;
        right:  number;
        top:    number;
        bottom: number;
    };

    column_widths:      number[];
    column_positions:   number[];
    column_to_resize:   number;
    column_is_hovered:  number | null;
    is_resizing_column: boolean;

    substring_length_cache: (number | undefined)[][];

    mouse_pos: Vector2;

    cursor: string = "auto";

    selected_row_id?: number | string;
    on_select_row?: (row: types.Data_Row<T>) => void;

    constructor(
        canvas: HTMLCanvasElement,
        columns: types.Column_Def[],
        rows: types.Data_Row<T>[],
        on_select_row?: (row: types.Data_Row<T>) => void
    ) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!;

        this.main_draw_area       = new Rect(0, 0, 1, 1);
        this.header_draw_area     = new Rect(0, 0, 1, config.table_row_height);
        this.body_draw_area       = new Rect(0, this.header_draw_area.bottom, 1, 1);
        this.table_body_draw_area = new Rect(0, this.header_draw_area.bottom, 1, 1);

        this.view = new Rect(0, 0, 1, 1);

        this.column_widths = columns.map(({ width }) => width);
        this.column_positions = utils.accumulate(this.column_widths);
        this.column_to_resize = 0;
        this.column_is_hovered = null;
        this.is_resizing_column = false;

        this.column_defs = columns;
        this.rows = rows;

        this.num_cols = this.column_defs.length;
        this.num_rows = this.rows.length;

        this.table_body_dimensions = this.calculate_table_body_dimensions();

        this.scroll_dimensions = { width: 1, height: 1 };
        this.grid_dimensions   = { width: 1, height: 1 };

        this.overflow_x = false;
        this.overflow_y = false;

        this.view_max_left = 0;
        this.view_max_top  = 0;

        this.render_indices = {
            left:   0,
            right:  0,
            top:    0,
            bottom: 0
        };

        this.mouse_pos = new Vector2();

        this.hsb_outer_rect = new Rect(0, 0, 1, config.scrollbar_size);
        this.hsb_track_rect = new Rect(this.hsb_outer_rect.left + config.scrollbar_thumb_margin, 0, 1, track_size);
        this.hsb_thumb_rect = new Rect(this.hsb_track_rect.left, 0, 1, track_size);

        this.vsb_outer_rect = new Rect(0, this.header_draw_area.height, config.scrollbar_size, 1);
        this.vsb_track_rect = new Rect(0, this.vsb_outer_rect.top + config.scrollbar_thumb_margin, track_size, 1);
        this.vsb_thumb_rect = new Rect(0, this.vsb_track_rect.top, track_size, 1);

        this.handle_mousedown = this.handle_mousedown.bind(this);
        this.handle_mouseup   = this.handle_mouseup.bind(this);
        this.handle_mousemove = this.handle_mousemove.bind(this);
        this.handle_wheel     = this.handle_wheel.bind(this);

        // @Todo: Add function to remove event listeners
        this.canvas.addEventListener("mousedown", this.handle_mousedown);
        this.canvas.addEventListener("wheel", this.handle_wheel);
        window.addEventListener("mouseup", this.handle_mouseup);
        window.addEventListener("mousemove", this.handle_mousemove);

        this.resize_observer = new ResizeObserver(entries => {
            entries.forEach(entry => {
                const { inlineSize, blockSize } = entry.contentBoxSize[0];
                this.events.push({
                    type: "resize",
                    width: inlineSize,
                    height: blockSize
                });
            });
        });
        this.resize_observer.observe(canvas);

        this.frame_id = requestAnimationFrame(() => this.tick());

        this.substring_length_cache = utils.make_matrix(
            this.rows.length + 1, this.column_defs.length);

        this.on_select_row = on_select_row;
    }

    reinit(rows: types.Data_Row<T>[], column_defs: types.Column_Def[]) {
        this.rows = rows;
        this.column_defs = column_defs;

        this.num_cols = this.column_defs.length;
        this.num_rows = this.rows.length;

        this.column_widths = column_defs.map(({ width }) => width);
        this.column_positions = utils.accumulate(this.column_widths);

        this.table_body_dimensions = this.calculate_table_body_dimensions();

        this.view.left = 0;
        this.view.top = 0;

        this.reflow();

        // @Todo: Make a matrix abstraction that provides methods for clearing
        // the entire matrix, clearing a column and setting the value for a
        // specific element.
        this.substring_length_cache = utils.make_matrix(this.num_rows + 1, this.num_cols);
    }

    destroy() {
        this.canvas.removeEventListener("mousedown", this.handle_mousedown);
        this.canvas.removeEventListener("wheel", this.handle_wheel);
        window.removeEventListener("mouseup", this.handle_mouseup);
        window.removeEventListener("mousemove", this.handle_mousemove);

        this.resize_observer.unobserve(this.canvas);

        cancelAnimationFrame(this.frame_id!);
    }

    tick() {
        while (this.events.length > 0) {
            const event = this.events.pop()!;
            switch (event.type) {
                case "mousedown": {
                    if (this.hsb_thumb_rect.contains(this.mouse_pos)) {
                        this.hsb_drag_offset = this.mouse_pos.x - this.hsb_thumb_rect.left;
                        this.hsb_is_dragging = true;
                    } else if (this.vsb_thumb_rect.contains(this.mouse_pos)) {
                        this.vsb_drag_offset = this.mouse_pos.y - this.vsb_thumb_rect.top;
                        this.vsb_is_dragging = true;
                    } else if (this.column_is_hovered !== null) {
                        this.column_to_resize = this.column_is_hovered;
                        this.is_resizing_column = true;
                    } else if (this.on_select_row && this.table_body_draw_area.contains(this.mouse_pos)) {
                        const viewport = new Viewport();
                        viewport.push(this.view.position);
                        viewport.translate_y(-this.body_draw_area.top);

                        const row_index = Math.floor(viewport.calc_y(this.mouse_pos.y) / config.table_row_height);
                        const row = this.rows[row_index];
                        this.selected_row_id = row.id;

                        this.on_select_row(row);
                    }
               } break;
                case "mouseup": {
                    this.is_resizing_column = false;

                    this.hsb_is_dragging = false;
                    this.vsb_is_dragging = false;

                    this.cursor = "auto";
                } break;
                case "mousemove": {
                    const canvasBoundingClientRect = this.canvas.getBoundingClientRect();
                    this.mouse_pos.x = event.x - canvasBoundingClientRect.left;
                    this.mouse_pos.y = event.y - canvasBoundingClientRect.top;

                    // Move horizontal scrollbar thumb and view horizontally
                    if (this.hsb_is_dragging) {
                        this.hsb_thumb_rect.left = utils.clamp(this.mouse_pos.x - this.hsb_drag_offset, this.hsb_track_rect.left, this.hsb_max_thumb_position);
                        this.recalculate_view_x_position();

                        this.render_indices = this.calculate_render_indices();
                    }

                    // Move vertical scrollbar thumb and view vertically
                    if (this.vsb_is_dragging) {
                        this.vsb_thumb_rect.top = utils.clamp(this.mouse_pos.y - this.vsb_drag_offset, this.vsb_track_rect.top, this.vsb_max_thumb_position);
                        this.recalculate_view_y_position();

                        this.render_indices = this.calculate_render_indices();
                    }

                    // Update cursor if mouse is over a column's resize area
                    this.column_is_hovered = this.find_index_of_column_to_resize();
                    this.cursor = this.column_is_hovered !== null || this.is_resizing_column ? "col-resize" : "auto";

                    if (this.is_resizing_column) {
                        const { view, column_widths, column_positions, column_to_resize, mouse_pos } = this;

                        const position = column_positions[column_to_resize];
                        const calculated_column_width = mouse_pos.x + view.left - position;
                        const actual_column_width = Math.max(calculated_column_width, config.table_column_min_width);
                        column_widths[column_to_resize] = actual_column_width;

                        this.column_positions = utils.accumulate(this.column_widths);
                        this.table_body_dimensions.width = utils.sum_array(this.column_widths);

                        this.reflow();

                        const cache = this.substring_length_cache;
                        for (let i = 0; i < cache.length; i++) {
                            cache[i][column_to_resize] = undefined;
                        }
                    }
                } break;
                case "wheel": {
                    // @Note: Prevent scrolling with the mouse wheel if a column is being resized.
                    if (!this.is_resizing_column) {
                        // Move horizontal scrollbar thumb and view horizontally
                        this.view.left = utils.clamp(this.view.left + event.x, 0, this.view_max_left);
                        this.recalculate_scrollbar_x_thumb_position();

                        // Move vertical scrollbar thumb and view vertically
                        this.view.top = utils.clamp(this.view.top + event.y, 0, this.view_max_top);
                        this.recalculate_scrollbar_y_thumb_position();

                        this.render_indices = this.calculate_render_indices();
                    }

                    // Update cursor if mouse is over a column's resize area
                    this.column_is_hovered = this.find_index_of_column_to_resize();
                    this.cursor = this.column_is_hovered !== null || this.is_resizing_column ? "col-resize" : "auto";
                } break;
                case "resize": {
                    this.canvas.width  = event.width;
                    this.canvas.height = event.height;
                    this.reflow();
                } break;
            }
        }
        
        const viewport = new Viewport();

        this.ctx.translate(.5, .5);

        // Update cursor
        this.canvas.style.cursor = this.cursor;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw selected row
        if (this.selected_row_id !== undefined) {
            // Find row index of selected row 
            let row_index = -1;
            for (let i = this.render_indices.top; i < this.render_indices.bottom; i++) {
                const row = this.rows[i];
                if (this.selected_row_id === row.id) {
                    row_index = i;
                    break;
                }
            }

            if (row_index !== -1) {
                this.ctx.save();
                this.ctx.fillStyle = config.select_color;

                viewport.push(this.view.position.rev());
                viewport.translate_y(this.body_draw_area.top);

                const y = viewport.calc_y(row_index * config.table_row_height);
                const rect = new Rect(0, y, this.table_body_draw_area.width, config.table_row_height);

                this.draw_rect(this.ctx, rect, "fill");

                this.ctx.restore();
                viewport.pop();
            }

        }

        // Draw header
        {
            this.ctx.save();
            this.ctx.strokeStyle = config.border_color;

            this.draw_rect(this.ctx, this.header_draw_area, "stroke");

            this.ctx.restore();
        }

        // Draw header text
        {
            this.ctx.save();
            this.ctx.font = `bold ${config.font_size}px ${config.font_family}`;
            this.ctx.fillStyle = config.font_color;
            
            viewport.push(this.view.position.rev());
            viewport.translate_x(config.cell_padding);

            this.clip_rect(this.ctx, this.header_draw_area);

            const { actualBoundingBoxAscent, actualBoundingBoxDescent } = this.ctx.measureText("M");
            const text_height = actualBoundingBoxDescent - actualBoundingBoxAscent;

            for (let i = this.render_indices.left; i < this.render_indices.right; i++) {
                const column_width    = this.column_widths[i];
                const column_position = this.column_positions[i];

                const x = viewport.calc_x(column_position);
                const y = (config.table_row_height / 2) - (text_height / 2);

                const text = this.calc_text(column_width, 0, i);
                this.ctx.fillText(text, x, y);
            }

            this.ctx.restore();
            viewport.pop();
        }

        // Draw grid
        {
            this.ctx.save();
            this.ctx.strokeStyle = config.border_color;

            viewport.push(this.body_draw_area.position);
            viewport.translate(this.view.position.rev());
            viewport.translate_y(config.table_row_height); // Start drawing from the top border of the second row.

            this.clip_rect(this.ctx, this.main_draw_area);

            const first_row = this.render_indices.top;
            const last_row = this.render_indices.bottom;
            for (let i = first_row; i < last_row; i++) {
                const y = viewport.calc_y(i * config.table_row_height);

                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.grid_dimensions.width, y);
                this.ctx.closePath();
                this.ctx.stroke();
            }

            const first_col = this.render_indices.left;
            const last_col  = this.render_indices.right;
            for (let i = first_col; i < last_col; i++) {
                const x = viewport.calc_x(this.column_positions[i]);

                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.grid_dimensions.height);
                this.ctx.closePath();
                this.ctx.stroke();
            }

            // Draw the right border of the last column of cells if table does not overflow the main draw area horizontally.
            if (!this.overflow_x) {
                this.ctx.beginPath();
                this.ctx.moveTo(this.table_body_dimensions.width, 0);
                this.ctx.lineTo(this.table_body_dimensions.width, this.grid_dimensions.height);
                this.ctx.closePath();
                this.ctx.stroke();
            }

            this.ctx.restore();
            viewport.pop();
        }

        // Draw body text
        {
            this.ctx.save();
            this.ctx.font = `${config.font_size}px ${config.font_family}`;
            this.ctx.fillStyle = config.font_color;

            const { actualBoundingBoxAscent, actualBoundingBoxDescent } = this.ctx.measureText("M");
            const text_height = actualBoundingBoxDescent - actualBoundingBoxAscent;

            viewport.push(this.body_draw_area.position);
            viewport.translate(this.view.position.rev());
            viewport.translate_x(config.cell_padding);
            viewport.translate_y((config.table_row_height / 2) - (text_height / 2)); // Center text

            this.clip_rect(this.ctx, this.body_draw_area);

            const { left, right, top, bottom } = this.render_indices;
            for (let i = top; i < bottom; i++) {
                for (let j = left; j < right; j++) {
                    const column_width   = this.column_widths[j];
                    const column_position = this.column_positions[j];

                    const x = viewport.calc_x(column_position);
                    const y = viewport.calc_y(i * config.table_row_height);

                    const text = this.calc_text(column_width, i + 1, j);
                    this.ctx.fillText(text, x, y);
                }
            }

            this.ctx.restore();
            viewport.pop();
        }

        if (this.overflow_x && this.overflow_y) {
            this.ctx.save();
            this.ctx.fillStyle = config.scrollbar_corner_color;

            this.ctx.fillRect(this.main_draw_area.right, this.main_draw_area.bottom, config.scrollbar_size, config.scrollbar_size);

            this.ctx.restore();
        }

        if (this.overflow_x) {
            // Draw horizontal scrollbar background
            {
                this.ctx.save();
                this.ctx.lineWidth = 1;
                this.ctx.strokeStyle = config.border_color;
                this.ctx.fillStyle = config.scrollbar_background_color;

                this.draw_rect(this.ctx, this.hsb_outer_rect, "fill");
                this.draw_rect(this.ctx, this.hsb_outer_rect, "stroke");

                this.ctx.restore();
            }

            // Draw horizontal scrollbar thumb
            {
                this.ctx.save();
                this.ctx.fillStyle = config.scrollbar_thumb_color;

                this.draw_rect(this.ctx, this.hsb_thumb_rect, "fill");

                this.ctx.restore();
            }
        }

        if (this.overflow_y) {
            // Draw vertical scrollbar background
            {
                this.ctx.save();
                this.ctx.lineWidth = 1;
                this.ctx.strokeStyle = config.border_color;
                this.ctx.fillStyle = config.scrollbar_background_color;

                this.draw_rect(this.ctx, this.vsb_outer_rect, "fill");
                this.draw_rect(this.ctx, this.vsb_outer_rect, "stroke");

                this.ctx.restore();
            }

            // Draw vertical scrollbar thumb
            {
                this.ctx.save();
                this.ctx.fillStyle = config.scrollbar_thumb_color;

                this.draw_rect(this.ctx, this.vsb_thumb_rect, "fill");

                this.ctx.restore();
            }
        }

        // Draw canvas border
        {
            this.ctx.save();
            this.ctx.strokeStyle = config.border_color;

            this.ctx.strokeRect(0, 0, this.canvas.width - 1, this.canvas.height - 1);

            this.ctx.restore();
        }

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);

        this.frame_id = requestAnimationFrame(() => this.tick());
    }

    reflow() {
        const main_draw_area_width_without_overflow  = this.canvas.width;
        const main_draw_area_height_without_overflow = this.canvas.height;
        const main_draw_area_width_with_overflow  = main_draw_area_width_without_overflow  - config.scrollbar_size;
        const main_draw_area_height_with_overflow = main_draw_area_height_without_overflow - config.scrollbar_size;
        
        const body_draw_area_width_without_overflow  = this.canvas.width;
        const body_draw_area_height_without_overflow = this.canvas.height - this.header_draw_area.height;
        const body_draw_area_width_with_overflow  = body_draw_area_width_without_overflow  - config.scrollbar_size;
        const body_draw_area_height_with_overflow = body_draw_area_height_without_overflow - config.scrollbar_size;

        this.overflow_x = body_draw_area_width_with_overflow  < this.table_body_dimensions.width;
        this.overflow_y = body_draw_area_height_with_overflow < this.table_body_dimensions.height;

        if (this.overflow_y) {
            this.main_draw_area.width = main_draw_area_width_with_overflow;
            this.body_draw_area.width = body_draw_area_width_with_overflow;
        } else {
            this.main_draw_area.width = main_draw_area_width_without_overflow;
            this.body_draw_area.width = body_draw_area_width_without_overflow;
        }

        if (this.overflow_x) {
            this.main_draw_area.height = main_draw_area_height_with_overflow;
            this.body_draw_area.height = body_draw_area_height_with_overflow;
        } else {
            this.main_draw_area.height = main_draw_area_height_without_overflow;
            this.body_draw_area.height = body_draw_area_height_without_overflow;
        }

        this.header_draw_area.width = this.main_draw_area.width;

        this.table_body_draw_area.width  = Math.min(this.table_body_dimensions.width,  this.body_draw_area.width);
        this.table_body_draw_area.height = Math.min(this.table_body_dimensions.height, this.body_draw_area.height);

        this.view.width  = this.body_draw_area.width;
        this.view.height = this.body_draw_area.height;

        this.scroll_dimensions.width  = Math.max(this.table_body_dimensions.width,  this.view.width);
        this.scroll_dimensions.height = Math.max(this.table_body_dimensions.height, this.view.height)

        this.grid_dimensions.width  = Math.min(this.table_body_dimensions.width, this.main_draw_area.width);
        this.grid_dimensions.height = Math.min(this.table_body_dimensions.height + this.header_draw_area.height, this.main_draw_area.height);

        // @Note: These might be unnecessary.
        this.view_max_left = this.scroll_dimensions.width  - this.view.width;
        this.view_max_top  = this.scroll_dimensions.height - this.view.height;

        this.hsb_outer_rect.width = this.main_draw_area.width;
        this.hsb_outer_rect.top   = this.main_draw_area.bottom;

        this.hsb_track_rect.width = this.hsb_outer_rect.width - scrollbar_thumb_margin_times_two;
        this.hsb_track_rect.top   = this.hsb_outer_rect.top + config.scrollbar_thumb_margin;

        const new_thumb_rect_width = utils.scale(this.view.width, 0, this.scroll_dimensions.width, 0, this.hsb_track_rect.width);
        this.hsb_thumb_rect.width = Math.max(new_thumb_rect_width, config.scrollbar_thumb_min_length);
        this.hsb_thumb_rect.top = this.hsb_track_rect.top;

        const max_thumb_position = this.hsb_track_rect.right - this.hsb_thumb_rect.width;
        this.hsb_max_thumb_position = max_thumb_position;

        if (this.view.right > this.scroll_dimensions.width) {
            this.view.right = this.scroll_dimensions.width;
            this.hsb_thumb_rect.left = max_thumb_position;
        } else {
            this.recalculate_scrollbar_x_thumb_position();
        }

        this.vsb_outer_rect.height = this.main_draw_area.height - this.header_draw_area.height;
        this.vsb_outer_rect.left   = this.main_draw_area.right;

        this.vsb_track_rect.height = this.vsb_outer_rect.height - scrollbar_thumb_margin_times_two;
        this.vsb_track_rect.left   = this.vsb_outer_rect.left + config.scrollbar_thumb_margin;

        const thumb_rect_new_height = utils.scale(this.view.height, 0, this.scroll_dimensions.height, 0, this.vsb_track_rect.height);
        this.vsb_thumb_rect.height = Math.max(thumb_rect_new_height, config.scrollbar_thumb_min_length);
        this.vsb_thumb_rect.left = this.vsb_track_rect.left;

        this.vsb_max_thumb_position = this.vsb_track_rect.bottom - this.vsb_thumb_rect.height;;

        if (this.view.bottom > this.scroll_dimensions.height) {
            this.view.bottom = this.scroll_dimensions.height;
            this.vsb_thumb_rect.top = max_thumb_position;
        } else {
            this.recalculate_scrollbar_y_thumb_position();
        }

        this.render_indices = this.calculate_render_indices();
    }

    recalculate_view_x_position() {
        this.view.left = utils.scale(this.hsb_thumb_rect.left, this.hsb_track_rect.left, this.hsb_max_thumb_position, 0, this.view_max_left);
    }

    recalculate_view_y_position() {
        this.view.top = utils.scale(this.vsb_thumb_rect.top, this.vsb_track_rect.top, this.vsb_max_thumb_position, 0, this.view_max_top);
    }

    recalculate_scrollbar_x_thumb_position() {
        this.hsb_thumb_rect.left = utils.scale(this.view.left, 0, this.view_max_left, this.hsb_track_rect.left, this.hsb_max_thumb_position);
    }

    recalculate_scrollbar_y_thumb_position() {
        this.vsb_thumb_rect.top = utils.scale(this.view.top, 0, this.view_max_top, this.vsb_track_rect.top, this.vsb_max_thumb_position);
    }

    find_index_of_column_to_resize() {
        let result: number | null = null;

        // @Performance It would be enough to check only the indices within the render ranges
        for (let i = 0; i < this.num_cols; i++) {
            const column_width    = this.column_widths[i];
            const column_position = this.column_positions[i];

            const resize_area_left = column_position + column_width - config.column_resize_area_half_width;
            const resize_area_width = (config.column_resize_area_half_width * 2) + 1;
            const rect = new Rect(resize_area_left, 0, resize_area_width, this.header_draw_area.height);

            const point = this.mouse_pos.add(new Vector2(this.view.left, 0));
            if (rect.contains(point)) {
                result = i;
                break;
            }
        }

        return result;
    }

    calculate_render_indices() {
        // @Note: We get -1 when column width is larger than canvas width.
        let leftmost_visible_column = this.column_positions.findIndex(position => position > this.view.left);
        if (leftmost_visible_column === -1) {
            leftmost_visible_column = this.num_cols - 1;
        }

        const left = Math.max(leftmost_visible_column - 1, 0);

        // @Performance We could start at the 'left' index.
        let rightmost_visible_column = this.column_positions.findIndex(position => position >= this.view.right);
        if (rightmost_visible_column === -1) {
            rightmost_visible_column = this.num_cols;
        }

        const top    = Math.floor(this.view.top / config.table_row_height);
        const bottom = Math.min(Math.ceil(this.view.bottom / config.table_row_height), this.num_rows);

        return { left, right: rightmost_visible_column, top, bottom };
    }

    handle_mousedown(event: MouseEvent) {
        this.events.push({
            type: "mousedown",
            button: event.button
        });
    }

    handle_mouseup(event: MouseEvent) {
        this.events.push({
            type: "mouseup",
            button: event.button
        });
    }

    handle_mousemove(event: MouseEvent) {
        this.events.push({
            type: "mousemove",
            x: event.x,
            y: event.y
        });
    }
    
    handle_wheel(event: WheelEvent) {
        this.events.push({
            type: "wheel",
            x: event.deltaX,
            y: event.deltaY
        });
    }

    calc_text(column_width: number, row_index: number, column_index: number) {
        const column_def = this.column_defs[column_index];

        let text: string;
        if (row_index > 0) {
            text = this.rows[row_index - 1][column_def.field];
        } else {
            text = column_def.name;
        }

        const cache = this.substring_length_cache;
        let length = cache[row_index][column_index];
        if (length === undefined) {
            length = this.calc_text_length(text, column_width);
            cache[row_index][column_index] = length;
        }

        if (length === text.length) {
            return text;
        } else {
            return text.slice(0, length) + ellipsis;
        }
    }

    calc_text_length(text: string, column_width: number) {
        const { ctx } = this;

        const available_space = column_width - config.cell_padding * 2;

        let metrics = ctx.measureText(text);
        if (metrics.width <= available_space) {
            return text.length;
        }

        if (text.length <= ellipsis.length) {
            return 0;
        }

        let length = -1;
        let low  = 0;
        let high = text.length;
        const min_width = available_space - config.ellipsis_precision;
        const max_width = available_space;

        while (low <= high) {
            length = Math.floor((low + high) / 2);

            const substring = text.slice(0, length);
            const { width } = ctx.measureText(substring + ellipsis);
            if (width >= min_width && width < max_width) {
                break;
            } else if (width > available_space) {
                high = length - 1;
            } else {
                low = length + 1;
            }
        }

        return length as number;
    }

    draw_rect(ctx: CanvasRenderingContext2D, rect: Rect, operation: "stroke" | "fill") {
        let fn: (x: number, y: number, width: number, height: number) => void;
        switch (operation) {
            case "stroke": { fn = ctx.strokeRect.bind(ctx); } break;
            case "fill":   { fn = ctx.fillRect.bind(ctx);   } break;
            default: { throw new Error("Unsupported operation"); }
        }
        fn(rect.left, rect.top, rect.width, rect.height);
    }

    clip_rect(ctx: CanvasRenderingContext2D, rect: Rect) {
        const clipping_region = new Path2D();
        clipping_region.rect(rect.left, rect.top, rect.width, rect.height);
        ctx.clip(clipping_region, "evenodd");
    }

    make_scrollbar_x() {
        const outer_rect = new Rect(0, 0, 1, config.scrollbar_size);
        const track_rect = new Rect(outer_rect.left + config.scrollbar_thumb_margin, 0, 1, track_size);
        const thumb_rect = new Rect(track_rect.left, 0, 1, track_size);

        return {
            outer_rect,
            track_rect,
            thumb_rect,
            max_thumb_position: 0,
            drag_offset: 0,
            is_dragging: false
        };
    }

    make_scrollbar_y() {
        const outer_rect = new Rect(0, this.header_draw_area.height, config.scrollbar_size, 1);
        const track_rect = new Rect(0, outer_rect.top + config.scrollbar_thumb_margin, track_size, 1);
        const thumb_rect = new Rect(0, track_rect.top, track_size, 1);

        return {
            outer_rect,
            track_rect,
            thumb_rect,
            max_thumb_position: 0,
            drag_offset: 0,
            is_dragging: false
        };
    }

    calculate_table_body_dimensions() {
        return {
            width: utils.sum_array(this.column_widths),
            height: this.num_rows * config.table_row_height
        };
    }
}
