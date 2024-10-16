import {
  camelCase,
  toString as lodashToString,
  lowerCase,
  lowerFirst,
  upperCase,
  upperFirst,
  words,
} from 'lodash-es'

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

// Copies lodash implementation of kebabCase and modifies it to treat version numbers as a single word
function kebabCase(input: string) {
  return words(lodashToString(input).replace(/['\u2019]/g, '')).reduce(
    (result, word, index, wordSplit) => {
      const useHyphen =
        index &&
        !(wordSplit[index - 1]!.toLowerCase() === 'v' && /^\d+$/.test(word))

      return result + (useHyphen ? '-' : '') + word.toLowerCase()
    },
    '',
  )
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
