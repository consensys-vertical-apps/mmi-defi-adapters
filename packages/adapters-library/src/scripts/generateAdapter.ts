import { Answers } from 'inquirer'
import { Outcomes } from './newAdapter2Command'
import { ReplacementMethods } from './replacementMethods'

export function generateAdapter(
  answers: Answers,
  outcomes: Outcomes,
  blankAdapter: string,
): string {
  return Object.keys(ReplacementMethods).reduce(
    (currentTemplate, replace: string) => {
      // Check if the operation exists in the Replacements object
      const replacementMethod =
        ReplacementMethods[replace as keyof typeof ReplacementMethods]
      if (replacementMethod) {
        // Apply the replacement operation
        return replacementMethod(outcomes, currentTemplate, answers)
      } else {
        console.warn(`Replacement operation '${replace}' not found.`)
        return currentTemplate
      }
    },
    blankAdapter,
  )
}
