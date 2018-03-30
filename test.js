const testData = require('./testData.json')
const _ = require('lodash')
const produce = require('./index.js')

// prepare
const origin = _.cloneDeep(testData)

// mutate
const result = produce(testData, draft => {
  draft.name = 'Captain America'
  draft.gender = 'male'
  draft.tags.push('super hero')
  draft.friends[0].name = 'Iron Man'
  draft.friends[1].name = 'Thor'
})

// assert
const untouched = _.isEqual(origin, testData)
console.log(result.tags)
const isDataRight = result.name === 'Captain America' &&
  result.gender === 'male' &&
  result.tags.indexOf('super hero') > -1 &&
  result.friends[0].name === 'Iron Man' &&
  result.friends[1].name === 'Thor'

if (untouched) {
  console.log('Origin Data remains untouched.')
} else {
  console.warn('Origin Data has been mutated.')
}

if (isDataRight) {
  console.log('Result is right.')
} else {
  console.warn('Result is wrong.', result)
}
