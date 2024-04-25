import { Answers } from 'inquirer'
import { Outcomes } from './newAdapter2Command'
import { Replacements } from './replacements'

export function generateAdapter(
  answers: Answers,
  outcomes: Outcomes,
  blankAdapter: string,
): string {
  return Object.keys(Replacements).reduce(
    (currentTemplate, replace: string) => {
      // Check if the operation exists in the Replacements object
      const replacement = Replacements[replace as keyof typeof Replacements]
      if (replacement) {
        // Apply the replacement operation
        return replacement.replace(outcomes, currentTemplate, answers)
      } else {
        console.warn(`Replacement operation '${replace}' not found.`)
        return currentTemplate
      }
    },
    blankAdapter,
  )
}
