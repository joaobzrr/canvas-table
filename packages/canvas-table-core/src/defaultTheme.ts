import { type Theme } from './types';

export const defaultTheme: Theme = {
  fontSize: '14px',
  fontFamily: 'Arial',
  fontColor: 'black',
  fontStyle: 'normal',
  headFontStyle: 'bold',

  rowHeight: 30,
  hoveredRowBackgroundColor: '#d6e9ff',
  selectedRowBackgroundColor: '#99C8FF',

  border: true,
  borderColor: '#665C54',

  scrollbarThickness: 20,
  scrollbarPadding: 0,
  scrollbarBackgroundColor: '#F1F1F1',
  scrollbarThumbColor: '#C1C1C1',
  scrollbarThumbHoverColor: '#A8A8A8',
  scrollbarThumbPressedColor: '#787878',

  columnResizerColor: '#257AFD',
  columnResizerOpacity: 0.5,

  cellPadding: 8,
};
