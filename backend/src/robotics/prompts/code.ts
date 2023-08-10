import * as fs from 'fs';

export const CODE = {
  model: 'gpt-4',
  user: (obs: string, project: string) => `
Code from the last round: ...
Execution error: ...
Chat log: ...
Critique from last round: ...  
${obs}
Task: ${project}
`,
  system: fs.readFileSync('./src/robotics/prompts/code2.txt', 'utf8'),
};
