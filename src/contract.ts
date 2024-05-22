import { ContractAction } from "./types.js";

export function extractActionsFromContract(code: string): ContractAction[] {
  const regex = /actions\s+triggered_by:\s+transaction,\s+on:\s+([\w\s.,()]+?)\s+do/g;

  let actions = [];
  for (const match of code.matchAll(regex)) {
    const fullAction = match[1];

    const regexActionName = /(\w+)\((.*?)\)/g;
    for (const actionMatch of fullAction.matchAll(regexActionName)) {
      const name = actionMatch[1];
      const parameters = actionMatch[2] != "" ? actionMatch[2].split(",") : [];
      actions.push({
        name: name,
        parameters: parameters
      });
    }
  }

  return actions;
}
