import { camelCase, upperFirst } from 'lodash'

export { kebabCase, camelCase, lowerCase, upperCase } from 'lodash'

export function pascalCase(string?: string) {
  return upperFirst(camelCase(string))
}
