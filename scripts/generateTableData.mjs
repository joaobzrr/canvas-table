import { resolve, dirname } from "path";
import { fileURLToPath }  from "url";
import { writeFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function randint(min, max) {
  const _min = Math.ceil(min);
  const _max = Math.floor(max);
  return Math.floor(Math.random() * (_max - _min + 1)) + _min;
}

function choice(options) {
  const index = randint(0, options.length)
  return options[index];
}

function randstr(charset, length) {
  const chars = [];
  for (let i = 0; i < length; i++) {
    chars.push(choice(charset));
  }
  const result = chars.join("");
  return result;
}

function generateTableData(params) {
  const { charset, numberOfRows, numberOfColumns } = params;

  const columnDefs = [];

  for (let columnIndex = 0; columnIndex < numberOfColumns; columnIndex++) {
    columnDefs.push({
      title: `Column ${columnIndex + 1}`,
      field: `column-${columnIndex + 1}`,
      width: randint(100, 200)
    });
  }

  const dataRows = [];

  for (let rowIndex = 0; rowIndex < numberOfRows; rowIndex++) {
    const row = Object.fromEntries(columnDefs.map(column => {
      return [column.field, randstr(charset, 16)];
    }));
    row.id = rowIndex;
    dataRows.push(row);
  }

  return {
    columnDefs,
    dataRows
  };
}

const charset = ['一', '丁', '七', '万', '丈', '三', '上', '下', '不', '与', '且', '世', '丘', '丙', '両', '並', '中', '丸', '丹', '主', '久', '之', '乏', '乗', '乙', '九', '乞', '乱', '乳', '乾', '亀', '予', '争', '事', '二', '互', '五', '井', '亜', '亡', '交', '亥', '亦', '亨', '享', '京', '亭', '人', '仁', '仏', '仕', '他', '付', '仙', '代', '令', '以', '仮', '仰', '仲', '伊', '伍', '伎', '伏', '伐', '休', '会', '伝', '伯', '伴', '伸', '伺', '似', '但', '位', '低', '住', '佐', '体', '何', '余', '作', '佳', '使', '侍', '供', '依', '価', '侮', '侵', '便', '係', '促', '俊', '俗', '保', '信', '修', '俳', '俵', '俺', '倉', '個', '倍', '倒', '候', '借', '倣', '値', '倫', '倭', '偉', '偏', '停', '健', '側', '偵', '偶', '傍', '傑', '催', '傘', '備', '傣', '傲', '傷', '傾', '働', '像', '僕', '僚', '僧', '僻', '儀', '億', '儒', '償', '優', '元', '兄', '充', '兆', '先', '光', '克', '免', '児', '党', '入', '全', '八', '公', '六', '共', '兵', '具', '典', '兼', '内', '冊', '再', '冒', '冗', '写', '冠', '冥', '冬', '冶', '冷', '凄', '准', '凍', '凛', '凡', '処', '凶', '凸', '凹', '出', '函', '刀', '刃', '分', '切', '刈', '刊', '刑', '列', '初', '判', '別', '利', '到', '制', '刷', '券', '刹', '刺', '刻', '則', '削', '前', '剖', '剛', '剣', '剤', '剥', '副', '剰', '割', '創', '劇', '力', '加', '劣', '助', '努', '励', '労', '効', '勃', '勇', '勉', '勒', '動', '勘', '務', '勝', '募', '勢', '勤', '包', '化', '北', '匠', '匹', '区', '医', '十', '千', '升', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'ā', 'ē', 'ī', 'ō', 'ū', 'ȳ', 'ę', 'ė', 'į', 'ų', 'ž', 'č', 'š', 'ļ', 'ņ', 'ķ', 'ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż', 'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω', 'А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'Й', 'К', 'Л', 'М', 'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Ъ', 'Ы', 'Ь', 'Э', 'Ю', 'Я', 'ä', 'ö', 'ü', 'ß'];

const data = generateTableData({
  charset,
  numberOfRows: 100,
  numberOfColumns: 100
});

const path = resolve(__dirname, "../temp/generated.json");

try {
  writeFileSync(path, JSON.stringify(data))
} catch (err) {
  console.log(err);
}
