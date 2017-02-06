// @flow
function swap(arr, i, j) {
  arr[i] = arr.splice(j, 1, arr[i])[0];
  return arr;
}

function random(limit) {
  return Math.floor(Math.random() * limit);
}

export const shuffle = (arr: Array<any>): Array<any> => {
  let len = arr.length;
  while (len > 0) {
    swap(arr, random(len), len -= 1);
  }
  return arr;
};

type MapperType = (any, number) => number

const fillIndex = (v, i) => i;

export const range = (n: number, mapper: MapperType = fillIndex) => Array.from({ length: n }, mapper);
