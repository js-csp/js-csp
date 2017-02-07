// @flow
export function mswap(arr, i, j) {
  if (i < 0 || j < 0) return arr;
  if (i >= arr.length || j >= arr.length) return arr;
  arr[i] = arr.splice(j, 1, arr[i])[0];
  return arr;
}

function random(limit) {
  return Math.floor(Math.random() * limit);
}

export const shuffle = (arr: Array<any>): Array<any> => {
  const result = arr.slice(0);
  let len = result.length;
  while (len > 0) {
    mswap(result, random(len), len -= 1);
  }
  return result;
};

type MapperType = (any, number) => number

const fillIndex = (v, i) => i;

export const range = (n: number, mapper: MapperType = fillIndex) => Array.from({ length: n }, mapper);
