import camelCase from 'lodash/camelCase'
import kebabCase from 'lodash/kebabCase'
import lowerCase from 'lodash/lowerCase'
import upperCase from 'lodash/upperCase'
import upperFirst from 'lodash/upperFirst'

function pascalCase(string?: string) {
  return upperFirst(camelCase(string))
}

export { camelCase, kebabCase, lowerCase, pascalCase, upperCase }
