import camelCase from 'lodash/camelCase'
import kebabCase from 'lodash/kebabCase'
import lowerCase from 'lodash/lowerCase'
import lowerFirst from 'lodash/lowerFirst'
import upperCase from 'lodash/upperCase'
import upperFirst from 'lodash/upperFirst'

function pascalCase(string?: string) {
  return upperFirst(camelCase(string))
}

function isPascalCase(input: string) {
  const regex = /^[A-Z][a-z0-9]*(?:[A-Z][a-z0-9]*)*$/
  return regex.test(input)
}

function isKebabCase(input: string) {
  const regex = /^[a-z0-9]+(-[a-z0-9]+)*$/
  return regex.test(input)
}

export {
  camelCase,
  kebabCase,
  isKebabCase,
  lowerCase,
  pascalCase,
  isPascalCase,
  upperCase,
  lowerFirst,
  upperFirst,
}
