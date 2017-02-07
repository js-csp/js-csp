import mocha from 'mocha';
import { assert } from 'chai';
import { mswap, shuffle, range } from './../src/helpers/array';
import { noop, has } from './../src/helpers/object';

describe('array helpers', () => {
  describe('mswap', () => {
    it('should swap elements in place', () => {
      let arr = [1,2,3,4,5,6,7], backup = [...arr]
      mswap(arr, 1, 3)
      assert.equal(arr[1], backup[3])
      assert.equal(arr[3], backup[1])
      mswap(arr, 4, 4)
      assert.equal(arr[4], backup[4])
      mswap(arr, 5, 7)
      assert.equal(arr[5], backup[5])
    })
    it('should not swap elements if index is out of bounds', () => {
      let arr = [1,2,3,4,5,6,7], backup = [...arr]
      mswap(arr, 7, 7)
      assert.equal(arr.length, backup.length)
      mswap(arr, -1, 1)
      assert.equal(arr.length, backup.length)
      mswap(arr, -7, 7)
      assert.equal(arr.length, backup.length)
    })
    it('should swap elements of any type', () => {
      let arr = [() => void(0), {}, 'xyz'], backup = [...arr]
      mswap(arr, 0, 2)
      assert.equal(arr[0], backup[2])
      assert.equal(arr[2], backup[0])
    })
  })
  describe('shuffle', () => {
    it('should shuffle array elements', () => {
      let arr = [1,2,3,4,5,6,7], backup = [...arr]
      range(10, () => {
        assert.notDeepEqual(shuffle(arr), arr)
      })
    })
    it('should shuffle elements of any type', () => {
      let arr = [() => void(0), {}, 'xyz', [1,2], null, 777], backup = [...arr]
      assert.deepEqual(arr, backup)
      assert.notDeepEqual(shuffle(arr), backup)
    })
    it('should work on [0,1,2]-element arrays', () => {
      let a0 = [], a1 = ['x'], a2 = [1,2]
      assert.equal(typeof shuffle(a0), 'object')
      assert.deepEqual(shuffle(a1), a1)
      let res = range(5, () => shuffle(a2))
      let shuffled = res.find(a => a[0] === a2[1])
      assert.ok(shuffled)
    })
  })
  describe('range', () => {
    it('should return range of n elements', () => {
      assert.deepEqual(range(4), [0,1,2,3])
      assert.deepEqual(range(1), [0])
      assert.deepEqual(range(0), [])
      assert.deepEqual(range(-2), [])
    })
    it('should invoke custom mapper function to generate values', () => {
      assert.deepEqual(range(4, (v, i) => i+1), [1,2,3,4])
      assert.deepEqual(range(4, (v, i) => 4), [4,4,4,4])
    })
  })
})

describe('object helpers', () => {
  describe('has', () => {
    it('should check correctly if object owns property', () => {
      assert.ok(has({x: 1}, 'x'))
      assert.ok(!has({}, 'x'))
      assert.ok(!has({}, ''))
      assert.ok(!has(null, 'x'))
      assert.ok(!has(Object.create(null), 'x'))
    })
  })
  describe('noop', () => {
    it('should result in undefined', () => {
      assert.equal(noop(), void(0))
    })
  })
})