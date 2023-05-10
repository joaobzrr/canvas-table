import Graphemer from "graphemer";

const ellipsis = "..."

export class StringTruncator {
    cache: Map<string, number | undefined>;
    measurer: (str: string) => number;

    splitter: Graphemer;

    constructor(measurer: (str: string) => number) {
        this.measurer = measurer;
        this.cache = new Map();
        this.splitter = new Graphemer();
    }


    clear_cache() {
        this.cache = new Map();
    }

    clear_key(key: string) {
        this.cache.set(key, undefined);
    }

    truncate(str: string, target_width: number, key: string) {
        if (target_width < 0) {
            throw new Error("Target width should be greater than or equal to zero");
        }

        let length = this.cache.get(key);
        if (length === undefined) {
            length = this.calc_length(str, target_width);
            this.cache.set(key, length)
        }

        const substring = this.grapheme_slice(str, 0, length);
        return length < str.length ? substring + ellipsis : substring;
    }

    calc_length(str: string, target_width: number) {
        const full_width = this.measurer(str);
        if (full_width <= target_width) {
            return str.length;
        }

        const ellipsis_width = this.measurer(ellipsis);
        if (full_width <= ellipsis_width) {
            return 0;
        }

        let substring = str;
        let length = 0;
        let substr_width = 0;
        let low = 0;
        let high = this.splitter.countGraphemes(str);

        while (low <= high) {
            length = Math.floor((low + high) / 2);
            substring = this.grapheme_slice(str, 0, length);
            substr_width = this.measurer(substring + ellipsis);
            if (substr_width === target_width) {
                break;
            } else if (substr_width > target_width) {
                high = length - 1;
            } else {
                low = length + 1;
            }
        }

        if (substr_width > target_width) {
            length -= 1;
        }

        return length;
    }

    grapheme_slice(str: string, start?: number, end?: number) {
        const graphemes = this.splitter.splitGraphemes(str);
        return graphemes.slice(start, end).join("");
    }
}
